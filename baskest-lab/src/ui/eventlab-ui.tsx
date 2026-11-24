// Composants partagés des modules multisectoriels (moteur EVENT LAB).
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { CashDay, Direction, SensitivityItem, Verdict } from '../core/eventlab';
import { eur, dayLabel } from '../core/eventlab';
import { ORIGIN_LABEL, type Origin } from '../core/knowledge/unify';

export const DIRECTION_LABEL: Record<Direction, string> = {
  accessible: 'Accessible et économique',
  optimise: 'Optimisé',
  premium: 'Premium',
  experimental: 'Expérimental',
  hybride: 'Hybride physique-digital',
  communautaire: 'Communautaire',
};

export const SECTOR_LABEL: Record<string, string> = {
  sport: 'Sport',
  esport: 'Esport',
  musique_festival: 'Musique et festivals',
  spectacle: 'Spectacle',
  tv_media: 'Télévision et médias',
  parc_loisirs: 'Parcs de loisirs',
  exposition_immersive: 'Expositions immersives',
  mode_luxe: 'Mode et luxe',
  salon_pro: 'Salons professionnels',
  activation_marque: 'Activation de marque',
  cinema: 'Cinéma',
  jeu: 'Jeu',
  communautaire: 'Communautaire',
  universitaire: 'Universitaire',
  tourisme: 'Tourisme',
  autre: 'Autre',
};

export const BLOCK_TYPE_LABEL: Record<string, string> = {
  regles: 'Règles',
  qualification: 'Qualification',
  recompenses: 'Récompenses',
  mise_en_scene: 'Mise en scène',
  interaction_public: 'Interaction public',
  mecanique_jeu: 'Mécanique de jeu',
  experience_digitale: 'Expérience digitale',
  scenographie: 'Scénographie',
  son_lumiere: 'Son et lumière',
  monetisation: 'Monétisation',
  fidelisation: 'Fidélisation',
  activation_partenaire: 'Activation partenaire',
  creation_contenu: 'Création de contenu',
};

/** Catégories BASK'EST et domaines EVENT LAB du registre des erreurs, en français accentué. */
export const ERROR_THEME_LABEL: Record<string, string> = {
  reglement_incomprehensible: 'règlement incompréhensible',
  temps_morts: 'temps morts',
  organisation_matchs: 'organisation des matchs',
  retards: 'retards',
  manque_ambiance: 'manque d’ambiance',
  inscription: 'inscription',
  inscriptions: 'inscriptions',
  files_attente: 'files d’attente',
  visibilite: 'visibilité',
  restauration: 'restauration',
  tarification: 'tarification',
  recompenses: 'récompenses',
  communication: 'communication',
  engagement_public: 'engagement du public',
  audiovisuel: 'audiovisuel',
  benevoles: 'bénévoles',
  professionnalisme: 'professionnalisme',
  surdimensionnement: 'surdimensionnement',
  sponsoring: 'sponsoring',
  accessibilite: 'accessibilité',
  securite: 'sécurité',
  billetterie: 'billetterie',
  accueil: 'accueil',
  ambiance: 'ambiance',
  sequencage: 'séquençage',
  regles: 'règles',
  animations: 'animations',
  experience_athletes: 'expérience des athlètes',
  satisfaction: 'satisfaction',
  sponsors: 'sponsors',
  rentabilite: 'rentabilité',
  medias: 'médias',
  environnement: 'environnement',
  gouvernance: 'gouvernance',
};
export const themeLabel = (k: string) => ERROR_THEME_LABEL[k] ?? k.replace(/_/g, ' ');

/** Sur téléphone, amène la fiche détaillée à l'écran après un choix dans une liste. */
export function useScrollOnSelect<T extends HTMLElement>(dep: unknown): RefObject<T | null> {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      if (window.matchMedia('(max-width: 900px)').matches) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      /* sans effet */
    }
  }, [dep]);
  return ref;
}

export const TECH_LABEL: Record<string, string> = {
  aucune: 'aucune',
  sono: 'sonorisation',
  ecran: 'écran',
  chronometrage: 'chronométrage',
  app_web: 'application web',
  streaming: 'diffusion en direct',
  eclairage_scenique: 'éclairage scénique',
  capteurs: 'capteurs',
  casques_audio: 'casques audio',
  billetterie_en_ligne: 'billetterie en ligne',
};

export const VERDICT_TEXT: Record<Verdict | 'non_evaluable', string> = { eligible: 'Éligible', sous_reserve: 'Sous réserve', elimine: 'Éliminé', non_evaluable: 'Non évaluable' };

export function VerdictLabel({ v }: { v: Verdict | 'non_evaluable' }) {
  return <span className={`verdict ${v}`}>{VERDICT_TEXT[v]}</span>;
}

export function OriginBadges({ origins }: { origins: Origin[] }) {
  return (
    <>
      {origins.map((o) => (
        <span key={o} className={`badge ${o}`}>
          {ORIGIN_LABEL[o]}
        </span>
      ))}
    </>
  );
}

export const tier = (t: number | null | undefined) => (t == null ? '—' : `T${t}`);
export const TIER_HINT = ['T0 : moins de 5 000 €', 'T1 : 5 000 à 30 000 €', 'T2 : 30 000 à 150 000 €', 'T3 : 150 000 € à 1 M€', 'T4 : plus de 1 M€'];

/** Montant signé, coloré par le signe (le texte garde un contraste AA dans les deux thèmes). */
export function Money({ v, strong = false }: { v: number | null | undefined; strong?: boolean }) {
  if (v == null) return <>—</>;
  const t = eur(v);
  const cls = v < 0 ? 'neg' : v > 0 ? 'pos' : '';
  return strong ? <b className={cls}>{t}</b> : <span className={cls}>{t}</span>;
}

/** Lecture d'un paramètre de l'adresse (#/route?cle=valeur). */
export function hashParam(key: string): string | null {
  try {
    const q = window.location.hash.split('?')[1];
    return q ? new URLSearchParams(q).get(key) : null;
  } catch {
    return null;
  }
}

/** Lecture/écriture localStorage enveloppées : renvoie une erreur lisible au lieu de lever. */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`baskest-lab:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeStore(key: string, value: unknown): string | null {
  try {
    localStorage.setItem(`baskest-lab:${key}`, JSON.stringify(value));
    return null;
  } catch (e) {
    return e instanceof Error && /quota/i.test(e.name + e.message) ? 'Stockage du navigateur plein : exportez puis supprimez des versions.' : 'Stockage du navigateur indisponible : les données restent en mémoire jusqu’à la fermeture de la page.';
  }
}

export function useWidth<T extends HTMLElement>(fallback = 640): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Graduations « rondes » couvrant [min ; max]. */
function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

const compactEur = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1000) return `${(v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`;
  return `${Math.round(v).toLocaleString('fr-FR')} €`;
};

/**
 * Plan de trésorerie : solde cumulé en fin de jour (ligne en escalier, échelle de temps linéaire en jours relatifs à J)
 * et point bas intra-journée (segment vertical jusqu'au point bas, décaissements comptés avant encaissements).
 */
export function CashChart({ days, maxNeed, maxNeedDay, label }: { days: CashDay[]; maxNeed: number; maxNeedDay: number | null; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (!days.length) return <p className="muted">Aucun flux de trésorerie dans cette configuration.</p>;
  const height = width < 480 ? 230 : 270;
  const pad = { l: width < 480 ? 52 : 64, r: 16, t: 18, b: 34 };
  const x0 = Math.min(...days.map((d) => d.day), 0);
  const x1 = Math.max(...days.map((d) => d.day), 0);
  const lows = days.map((d) => d.low);
  const yMin = Math.min(0, ...lows);
  const yMax = Math.max(0, ...days.map((d) => d.cum));
  const yt = niceTicks(yMin, yMax, 5);
  const y0 = Math.min(yt[0], yMin);
  const y1 = Math.max(yt[yt.length - 1], yMax);
  const X = (x: number) => pad.l + ((x - x0) / Math.max(1, x1 - x0)) * (width - pad.l - pad.r);
  const Y = (y: number) => pad.t + (1 - (y - y0) / Math.max(1, y1 - y0)) * (height - pad.t - pad.b);
  // Escalier : le solde de fin de jour est maintenu jusqu'au jour de flux suivant
  let d = `M${X(x0)},${Y(0)}`;
  for (const p of days) d += ` H${X(p.day)} V${Y(p.cum)}`;
  d += ` H${X(x1)}`;
  // Graduations horizontales : J0, extrêmes, puis dates de flux sans chevauchement (≥ 46 px)
  const candidates = [x0, 0, x1, ...days.map((p) => p.day)];
  const xt: number[] = [];
  for (const v of candidates) if (!xt.includes(v) && xt.every((u) => Math.abs(X(u) - X(v)) >= 46)) xt.push(v);
  const h = hover != null ? days[hover] : null;
  const minIdx = days.findIndex((p) => p.day === maxNeedDay);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') setHover((i) => (i == null ? 0 : Math.min(days.length - 1, i + 1)));
    else if (e.key === 'ArrowLeft') setHover((i) => (i == null ? days.length - 1 : Math.max(0, i - 1)));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };
  const tipLeft = h ? Math.min(Math.max(8, X(h.day) + 10), width - 200) : 0;
  return (
    <div ref={ref} className="chart" tabIndex={0} role="group" aria-label={`${label}. Flèches gauche et droite pour parcourir les dates ; le tableau ci-dessous donne toutes les valeurs.`} onKeyDown={onKey} onBlur={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={`${label} : besoin de trésorerie maximal ${eur(maxNeed)} (${dayLabel(maxNeedDay)}).`}>
        {yt.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={width - pad.r} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? 'var(--ink-2)' : 'var(--grid)'} strokeWidth={1} />
            <text x={pad.l - 6} y={Y(v) + 4} textAnchor="end">
              {compactEur(v)}
            </text>
          </g>
        ))}
        {xt.map((v) => (
          <text key={v} x={X(v)} y={height - 10} textAnchor={X(v) < pad.l + 20 ? 'start' : X(v) > width - pad.r - 20 ? 'end' : 'middle'}>
            {v === 0 ? 'J' : dayLabel(v)}
          </text>
        ))}
        <line x1={X(0)} x2={X(0)} y1={pad.t} y2={height - pad.b} stroke="var(--ink-2)" strokeWidth={1} strokeOpacity={0.5} />
        {h && <line x1={X(h.day)} x2={X(h.day)} y1={pad.t} y2={height - pad.b} stroke="var(--ink-2)" strokeWidth={1} />}
        <path d={d} fill="none" stroke="var(--serie-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {days.map((p, i) => (
          <g key={p.day}>
            {p.low < p.cum && <line x1={X(p.day)} x2={X(p.day)} y1={Y(p.cum)} y2={Y(p.low)} stroke="var(--serie-1)" strokeWidth={2} strokeDasharray="2 3" />}
            {p.low < p.cum && <circle cx={X(p.day)} cy={Y(p.low)} r={4} fill="var(--surface)" stroke="var(--serie-1)" strokeWidth={2} />}
            <circle cx={X(p.day)} cy={Y(p.cum)} r={hover === i ? 6 : 4} fill="var(--serie-1)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        ))}
        {minIdx >= 0 && (
          <text x={Math.min(Math.max(X(days[minIdx].day), pad.l + 4), width - pad.r)} y={Math.min(Y(days[minIdx].low) + 18, height - pad.b - 4)} textAnchor={X(days[minIdx].day) > width * 0.6 ? 'end' : 'start'} style={{ fill: 'var(--ink)', fontWeight: 600 }}>
            {`Besoin max ${eur(maxNeed)} (${dayLabel(maxNeedDay)})`}
          </text>
        )}
        {days.map((p, i) => {
          const left = i === 0 ? pad.l : (X(days[i - 1].day) + X(p.day)) / 2;
          const right = i === days.length - 1 ? width - pad.r : (X(p.day) + X(days[i + 1].day)) / 2;
          return <rect key={`h${p.day}`} x={left} y={pad.t} width={Math.max(1, right - left)} height={height - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />;
        })}
      </svg>
      {h && (
        <div className="tip" style={{ left: tipLeft, top: 8 }}>
          <b>{dayLabel(h.day)}</b>
          <br />
          Solde en fin de jour : {eur(h.cum)}
          <br />
          Point bas du jour : {eur(h.low)}
          <br />
          Décaissements : {eur(Math.abs(h.out))} · encaissements : {eur(h.in)}
        </div>
      )}
    </div>
  );
}

/** Tornade de sensibilité : impact sur le résultat d'une baisse (orange) et d'une hausse (bleu) de chaque facteur. */
export function Tornado({ items }: { items: SensitivityItem[] }) {
  const max = Math.max(1, ...items.flatMap((i) => [Math.abs(i.low), Math.abs(i.high)]));
  const bar = (v: number, kind: 'low' | 'high'): ReactNode => {
    const w = (Math.abs(v) / max) * 30; // 30 % de la largeur par côté : place pour l'étiquette
    const right = v >= 0;
    const top = kind === 'low' ? 2 : 14;
    return (
      <>
        <span className={`tornado-bar ${kind} ${right ? 'right' : 'left'}`} style={{ left: right ? '50%' : `${50 - w}%`, width: `${Math.max(w, 0.4)}%` }} />
        <span className="tornado-val" style={right ? { left: `calc(${50 + w}% + 4px)`, top } : { right: `calc(${50 + w}% + 4px)`, top }}>
          {v > 0 ? '+' : ''}
          {eur(v)}
        </span>
      </>
    );
  };
  return (
    <div>
      <div className="legend" aria-hidden="true">
        <span>
          <i className="key" style={{ background: 'var(--serie-2)' }} />
          Si le facteur baisse
        </span>
        <span>
          <i className="key" style={{ background: 'var(--serie-1)' }} />
          Si le facteur augmente
        </span>
      </div>
      <div className="tornado" role="img" aria-label={`Tornade de sensibilité : ${items.map((i) => `${i.label} ±${Math.round(i.range * 100)} % : ${eur(i.low)} / ${eur(i.high)}`).join(' ; ')}`}>
        {items.map((i) => (
          <div className="tornado-row" key={i.factor}>
            <span className="name">
              {i.label} <span className="muted small">(±{Math.round(i.range * 100)} %)</span>
            </span>
            <div className="tornado-track" title={`${i.label} : baisse ${eur(i.low)}, hausse ${eur(i.high)}`}>
              {bar(i.low, 'low')}
              {bar(i.high, 'high')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Rend un objet JSON court pour une cellule de diff. */
export function shortJson(v: unknown, max = 140): string {
  if (v === undefined) return '(absent)';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Copie dans le presse-papiers avec repli (zone de texte) ; renvoie vrai si la copie a réussi. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* repli ci-dessous */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function useNow(ms = 0) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!ms) return;
    const t = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}
