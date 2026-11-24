import type { AuditLine, PostEventActuals, PostEventTargets } from '../model';
import { round } from '../rng';

/**
 * Audit post-événement (exigence §22) : compare objectifs et résultats,
 * classe les écarts et produit les améliorations prioritaires. Chaque audit
 * enrichit l'intelligence événementielle propriétaire de Bask'Est.
 */

const META: Record<keyof PostEventTargets, { label: string; higherIsBetter: boolean; fix: string }> = {
  attendance: { label: 'Fréquentation', higherIsBetter: true, fix: 'Communication plus tôt (J-60), préventes, partenariats clubs/écoles, tarif famille.' },
  result: { label: 'Résultat financier (€)', higherIsBetter: true, fix: 'Go/no-go à J-30, sponsoring signé avant engagement, buvette et merchandising optimisés.' },
  satisfaction: { label: 'Satisfaction public (/10)', higherIsBetter: true, fix: 'Combler les temps morts, speaker pédagogue, écran, restauration.' },
  engagement: { label: 'Engagement digital', higherIsBetter: true, fix: 'Plan de captation, publication < 24 h, cartes joueurs partageables.' },
  sportQuality: { label: 'Qualité sportive (/10)', higherIsBetter: true, fix: 'Têtes de série vérifiables, simulation du format avant l’édition, arbitrage renforcé.' },
  maxWaitMin: { label: 'Attente maximale (min)', higherIsBetter: false, fix: 'Ajouter un terrain, raccourcir les matchs, reprogrammer via le moteur.' },
  incidents: { label: 'Incidents', higherIsBetter: false, fix: 'Analyse cause racine, nouvelle règle de conception dans l’Observatoire.' },
  partnerSatisfaction: { label: 'Satisfaction partenaires (/10)', higherIsBetter: true, fix: 'Une activation par partenaire + bilan chiffré sous 15 jours.' },
  volunteerHours: { label: 'Charge bénévole (h)', higherIsBetter: false, fix: 'Postes ≤ 4 h, recrutement anticipé, automatisation (inscriptions, check-in).' },
  organisationQuality: { label: 'Qualité d’organisation (/10)', higherIsBetter: true, fix: 'Conducteur partagé J-7, briefing, checklists du kit opérationnel.' },
};

export function auditEdition(targets: PostEventTargets, actuals: PostEventActuals) {
  const lines: AuditLine[] = (Object.keys(META) as (keyof PostEventTargets)[]).map((k) => {
    const t = targets[k];
    const a = actuals[k];
    const hib = META[k].higherIsBetter;
    const gapPct = t === 0 ? (a === 0 ? 0 : hib ? 1 : -1) : (a - t) / Math.abs(t);
    const good = hib ? gapPct >= 0 : gapPct <= 0;
    const near = Math.abs(gapPct) <= 0.1;
    return { key: k, label: META[k].label, target: t, actual: a, gapPct: round(gapPct, 3), status: good ? 'atteint' : near ? 'proche' : 'manque', higherIsBetter: hib };
  });
  const misses = lines
    .filter((l) => l.status !== 'atteint')
    .sort((x, y) => Math.abs(y.gapPct) - Math.abs(x.gapPct))
    .map((l) => ({ priority: l.label, gap: `${l.gapPct > 0 ? '+' : ''}${Math.round(l.gapPct * 100)} %`, action: META[l.key].fix }));
  const reached = lines.filter((l) => l.status === 'atteint').length;
  return {
    lines,
    score: round((reached / lines.length) * 100, 0),
    meetsTargets: reached >= Math.ceil(lines.length * 0.7),
    priorities: misses.slice(0, 5),
  };
}
