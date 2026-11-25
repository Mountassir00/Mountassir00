/**
 * List prices used to *estimate* costs from measured token counts.
 * An estimate is never shown as a verified spend: costs computed here are
 * always tagged `estimated`. Verified spend requires a billing source
 * (e.g. the provider's cost report API) — see docs/DATA_SOURCES.md.
 */
export interface ModelPrice {
  model: string;
  provider: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok: number;
  /** Write prices use the provider's published multipliers; flagged when assumed. */
  cacheWrite5mPerMTok: number;
  cacheWrite1hPerMTok: number;
  assumptions?: string;
}

export const PRICE_TABLE_SOURCE = {
  label: 'Tarifs catalogue Anthropic (relevé du 2026-11-03)',
  asOf: '2026-11-03',
  caveat:
    "Estimation au prix catalogue, hors remises, Batch, mode rapide et fournisseurs partenaires. Les tarifs d'écriture cache utilisent les multiplicateurs standard ×1,25 (5 min) et ×2 (1 h) — à vérifier.",
};

const p = (model: string, input: number, output: number, cacheRead: number, assumptions?: string): ModelPrice => ({
  model,
  provider: 'anthropic',
  inputPerMTok: input,
  outputPerMTok: output,
  cacheReadPerMTok: cacheRead,
  cacheWrite5mPerMTok: input * 1.25,
  cacheWrite1hPerMTok: input * 2,
  assumptions,
});

export const PRICES: ModelPrice[] = [
  p('claude-fable-5-2', 8, 40, 0.2),
  p('claude-fable-5-1', 10, 50, 0.5, 'lecture cache supposée ×0,05'),
  p('claude-opus-5-5', 4, 20, 0.2),
  p('claude-opus-5', 5, 25, 0.5, 'lecture cache supposée ×0,1'),
  p('claude-opus-4-8', 5, 25, 0.5, 'lecture cache supposée ×0,1'),
  p('claude-opus-4-7', 5, 25, 0.5, 'lecture cache supposée ×0,1'),
  p('claude-sonnet-5-5', 2, 10, 0.1),
  p('claude-sonnet-5', 2, 10, 0.2, 'lecture cache supposée ×0,1'),
  p('claude-sonnet-4-6', 3, 15, 0.3, 'lecture cache supposée ×0,1'),
  p('claude-haiku-5-5', 0.1, 0.5, 0.01, 'lecture cache supposée ×0,1 ; tarif ≤ 100K tokens'),
  p('claude-haiku-4-5', 1, 5, 0.1, 'lecture cache supposée ×0,1'),
];

const byModel = new Map(PRICES.map((x) => [x.model, x]));

export function priceFor(model: string | undefined): ModelPrice | undefined {
  if (!model) return undefined;
  if (byModel.has(model)) return byModel.get(model);
  // Tolerate dated or suffixed ids (e.g. "claude-opus-5-5[1m]").
  const base = model.replace(/\[.*\]$/, '').replace(/-\d{8}$/, '');
  return byModel.get(base);
}

export interface UsageLike {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWrite5mTokens?: number;
  cacheWrite1hTokens?: number;
}

export interface CostEstimate {
  costUsd: number;
  /** What the cached part would have cost at full input price, minus what it cost. */
  avoidedByCacheUsd: number;
  known: boolean;
}

export function estimateCost(model: string | undefined, u: UsageLike): CostEstimate {
  const price = priceFor(model);
  if (!price) return { costUsd: 0, avoidedByCacheUsd: 0, known: false };
  const M = 1_000_000;
  const cacheRead = u.cacheReadTokens ?? 0;
  const cost =
    ((u.inputTokens ?? 0) * price.inputPerMTok +
      (u.outputTokens ?? 0) * price.outputPerMTok +
      cacheRead * price.cacheReadPerMTok +
      (u.cacheWrite5mTokens ?? 0) * price.cacheWrite5mPerMTok +
      (u.cacheWrite1hTokens ?? 0) * price.cacheWrite1hPerMTok) /
    M;
  const avoided = (cacheRead * (price.inputPerMTok - price.cacheReadPerMTok)) / M;
  return { costUsd: cost, avoidedByCacheUsd: Math.max(0, avoided), known: true };
}
