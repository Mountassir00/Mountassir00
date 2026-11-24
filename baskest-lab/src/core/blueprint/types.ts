export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  | { kind: 'table'; head: string[]; rows: (string | number)[][]; caption?: string }
  | { kind: 'kv'; items: [string, string][] }
  | { kind: 'svg'; name: string; caption: string; svg: string }
  | { kind: 'callout'; tone: 'info' | 'warn' | 'ok'; text: string };

export type PartId = 'strategie' | 'sportif' | 'creatif' | 'operationnel' | 'economique' | 'mediatique' | 'juridique' | 'developpement';

export const PART_LABELS: Record<PartId, string> = {
  strategie: 'Partie stratégique',
  sportif: 'Partie sportive',
  creatif: 'Partie créative',
  operationnel: 'Partie opérationnelle',
  economique: 'Partie économique',
  mediatique: 'Partie médiatique',
  juridique: 'Partie juridique et réglementaire',
  developpement: 'Partie développement',
};

export interface Section {
  id: string;
  part: PartId;
  title: string;
  blocks: Block[];
}

export interface BlueprintExtras {
  edition?: string;
  date?: string; // libellé lisible
  dateISO?: string;
  city?: string;
  venueLabel?: string;
  organiser?: string;
  /** Remplace (replace) ou complète (prepend) le contenu généré d'une section. */
  overrides?: Record<string, { mode: 'replace' | 'prepend' | 'append'; blocks: Block[] }>;
}

export interface Blueprint {
  id: string;
  title: string;
  subtitle: string;
  version: number;
  generatedAt: string;
  status: string;
  sections: Section[];
  assets: { name: string; label: string; svg: string }[];
  /** Données brutes pour les exports (Excel, PowerPoint). */
  data: {
    budgetLines: { type: 'charge' | 'produit'; category: string; label: string; basis: string; unit: number; quantity: number; probability?: number; nature?: string; secured?: boolean; inKind?: boolean }[];
    assumptions: Record<string, number>;
    scenarios: { name: string; costs: number; revenues: number; result: number; breakEven: number | null; minCash: number }[];
    cashflow: { day: number; balance: number }[];
    schedule: { time: string; court: string; label: string; home: string; away: string }[];
    runOfShow: { time: string; duration: number; item: string; owner: string }[];
    retroplanning: { day: number; task: string; owner: string; deliverable: string }[];
    risks: { risk: string; probability: string; impact: string; mitigation: string; owner: string }[];
    sponsorPackages: { name: string; price: number; quantity: number; counterparts: string }[];
    kpis: { kpi: string; target: string; source: string }[];
    score: { criterion: string; points: number; max: number }[];
  };
}
