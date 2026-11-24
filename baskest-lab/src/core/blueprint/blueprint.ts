import { VERDICT_LABELS } from '../simulation/analysis';
import type { ConceptAnalysis } from '../pipeline';
import type { Innovation, StageSpec } from '../model';
import { COST_LABELS, NATURE_LABELS, costsByCategory, fmtEur, pricingGrid, revenueAmount } from '../finance/budget';
import { budgetTemplate } from '../finance/templates';
import { runScenarios } from '../finance/budget';
import { fmtTime } from '../scheduler/scheduler';
import { renderLayoutSvg } from '../venue/svg';
import { DESIGN_RULES } from '../rules/design-rules';
import { MATURITY_LEVELS, maturityLabel } from '../scoring/maturity';
import { AUDIENCE_LABELS } from '../generator/library';
import { badgeSvg, jerseySvg, logoSvg, posterSvg, screenSvg, socialSvg, ticketSvg } from '../studio/assets';
import { type Block, type Blueprint, type BlueprintExtras, type PartId, type Section } from './types';

/**
 * Générateur du BASK'EST EVENT BLUEPRINT (exigence §18).
 * Dossier autonome : cahier des charges + dossier de présentation + manuel
 * d'exploitation + base de la prochaine édition. Tout chiffre issu d'une
 * estimation est signalé comme tel.
 */

const p = (text: string): Block => ({ kind: 'p', text });
const list = (items: string[], ordered = false): Block => ({ kind: 'list', items, ordered });
const table = (head: string[], rows: (string | number)[][], caption?: string): Block => ({ kind: 'table', head, rows, caption });
const kv = (items: [string, string][]): Block => ({ kind: 'kv', items });
const note = (text: string, tone: 'info' | 'warn' | 'ok' = 'info'): Block => ({ kind: 'callout', tone, text });

const STAGE_LABEL: Record<StageSpec['type'], string> = {
  round_robin: 'poules (chaque équipe rencontre toutes les autres de sa poule)',
  single_elim: 'élimination directe',
  double_elim: 'double élimination (deux défaites pour être éliminé)',
  swiss: 'système suisse (adversaires de même bilan à chaque ronde)',
  king_of_the_court: 'King of the Court (le vainqueur reste sur le terrain)',
  ladder: 'échelle de défis',
  points_race: 'course aux points (chaque point marqué compte au classement)',
};

const MECH_TEXT: Record<string, string> = {
  handicap_start: 'Handicap de départ : l’équipe la moins bien classée commence avec une avance au score (1 point par 100 points d’écart de classement).',
  mercy_rule: 'Règle de mansuétude : le match s’arrête dès qu’une équipe mène de l’écart défini.',
  double_points_final_minute: 'Money Time : tous les paniers comptent double pendant la dernière minute (signal son + lumière).',
  joker_card: 'Carte Joker : une fois par match, une équipe peut activer 60 secondes où ses paniers comptent double (annonce à la table).',
  public_zone_bonus: 'Zone du public : toutes les 4 minutes, le public désigne par vote une zone de tir qui compte double pendant 60 secondes.',
  public_vote_mvp: 'MVP du public : vote QR plafonné, en salle uniquement.',
};

function endText(a: ConceptAnalysis): string {
  const e = a.concept.format.match.end;
  switch (e.type) {
    case 'time':
      return `${e.minutes} minutes de jeu ; égalité : ${a.concept.format.match.overtime === 'first_to_2' ? 'prolongation, première équipe à marquer 2 points' : 'mort subite (premier panier gagnant)'}.`;
    case 'target':
      return `Première équipe à ${e.points} points${e.maxMinutes ? ` (limite ${e.maxMinutes} min)` : ''}.`;
    case 'elam':
      return `${e.minutes} minutes chronométrées, puis le chrono s’arrête : score cible = score du leader + ${e.plus}. Le match se termine toujours sur un panier (fin type « Elam »).`;
    case 'time_or_target':
      return `${e.minutes} minutes ou ${e.points} points (le premier des deux) ; égalité : ${a.concept.format.match.overtime === 'first_to_2' ? 'prolongation, première équipe à marquer 2 points' : 'mort subite'}.`;
  }
}

function J(d: number) {
  return d === 0 ? 'J0' : d < 0 ? `J${d}` : `J+${d}`;
}

export function buildBlueprint(a: ConceptAnalysis, extras: BlueprintExtras = {}, innovations: Innovation[] = []): Blueprint {
  const c = a.concept;
  const ops = a.ops;
  const ev = a.evaluation;
  const real = a.scenarios.find((s) => s.name === 'realiste')!;
  const prud = a.scenarios.find((s) => s.name === 'prudent')!;
  const amb = a.scenarios.find((s) => s.name === 'ambitieux')!;
  const venueLabel = extras.venueLabel ?? a.venue.name;
  const opening = a.scheduleInput.opening ?? '13:00';
  const innov = innovations.filter((x) => c.innovationIds.includes(x.id));
  const assetIn = { identity: c.identity, date: extras.date, venue: venueLabel, city: extras.city ?? a.venue.city, price: ops.ticketPrice ? `${ops.ticketPrice} €` : undefined };
  const sections: Section[] = [];
  const add = (part: PartId, id: string, title: string, blocks: Block[]) => {
    const ov = extras.overrides?.[id];
    const final = !ov ? blocks : ov.mode === 'replace' ? ov.blocks : ov.mode === 'prepend' ? [...ov.blocks, ...blocks] : [...blocks, ...ov.blocks];
    sections.push({ id, part, title, blocks: final });
  };
  const nonOk = a.rules.filter((r) => r.outcome !== 'ok' && r.outcome !== 'non_evaluable');
  const teamWord = c.format.teamSize === 1 ? 'joueurs' : 'équipes';
  const divs = c.format.divisions ?? [];
  const totalTeams = c.format.teams * Math.max(1, divs.length);
  const teamsLabel = divs.length > 1 ? `${totalTeams} ${teamWord} (${divs.map((d) => `${c.format.teams} ${d.label.toLowerCase()}`).join(' + ')})` : `${c.format.teams} ${teamWord}`;

  // =========================================================================
  // PARTIE STRATÉGIQUE
  // =========================================================================
  add('strategie', 'resume', 'Résumé exécutif', [
    p(`${c.identity.name} — « ${c.identity.tagline} ». ${c.pitch}`),
    kv([
      ['Organisateur', extras.organiser ?? 'Association Bask’Est (Nancy)'],
      ['Édition', extras.edition ?? `Version ${c.version}`],
      ['Date', extras.date ?? 'À fixer'],
      ['Lieu', venueLabel],
      ['Public attendu', `${c.expectedSpectators} spectateurs, ${teamsLabel}`],
      ['Durée', `${c.durationHours} h`],
      ['Budget (réaliste)', `${fmtEur(real.totalCosts)} de charges · résultat ${fmtEur(real.result)}`],
      ['Note BASK’EST LAB', `${ev.total}/100 (${ev.grade}) — ${ev.eligible ? 'éligible' : 'NON éligible en l’état'}`],
      ['Maturité', `${maturityLabel(ev.maturity)} (prochaine étape : ${ev.nextMaturitySteps[0]})`],
    ]),
    note('Ce dossier est généré par BASK’EST LAB à partir de simulations et d’estimations. Les montants marqués « estimation » doivent être remplacés par des devis ; les plans validés par le gestionnaire du lieu et les services de sécurité.', 'warn'),
  ]);
  add('strategie', 'concept', 'Présentation du concept', [
    p(c.pitch),
    list(c.experience.slice(0, 6).map((m) => `${m.label} — ${m.description}`)),
  ]);
  add('strategie', 'objectifs', 'Objectifs', [
    table(
      ['Objectif', 'Indicateur', 'Cible'],
      [
        ['Remplir la salle', 'Spectateurs comptés', `${c.expectedSpectators}`],
        ['Équilibre financier', 'Résultat (scénario réaliste)', '≥ 0 €'],
        ['Expérience spectateur', 'Satisfaction (questionnaire QR)', '≥ 8/10'],
        ['Expérience joueur', 'Matchs garantis / équipe', `≥ ${a.fairness.gamesPerTeam.min}`],
        ['Visibilité', 'Vues cumulées des contenus J-30 → J+14', c.expectedSpectators >= 1000 ? '≥ 100 000' : '≥ 20 000'],
        ['Impact', 'Participants issus des publics prioritaires', '≥ 30 %'],
      ],
    ),
    list(c.objectives.map((o) => `Objectif stratégique : ${o.replace(/_/g, ' ')}`)),
  ]);
  add('strategie', 'proposition_valeur', 'Proposition de valeur', [
    table(
      ['Pour…', 'La valeur'],
      [
        ['Spectateurs', 'Un spectacle compréhensible sans connaître le basket : règles affichées, speaker pédagogue, temps forts toutes les 10 minutes.'],
        ['Joueurs', `Au moins ${a.fairness.gamesPerTeam.min} matchs, une scène, des contenus personnels (carte, highlight) et une passerelle vers les autres formats Bask’Est.`],
        ['Partenaires', 'Une activation par partenaire, un public local qualifié, un bilan chiffré sous 15 jours.'],
        ['Territoire', 'Un événement qui fédère quartiers, clubs et familles du Grand Est autour du basket.'],
      ],
    ),
  ]);
  add('strategie', 'positionnement', 'Positionnement', [
    p(`Positionnement : événement ${c.scale} « ${c.objectives.includes('spectacle') ? 'show sportif' : 'compétition communautaire'} » du basket ${c.scale === 'locale' ? 'nancéien' : 'du Grand Est'}, accessible (${ops.ticketPrice ? `dès ${Math.round(ops.ticketPrice * 0.6)} €` : 'gratuit'}), conçu comme un format reproductible signé Bask’Est.`),
    table(['Axe', 'Choix'], [['Prix', ops.ticketPrice ? `${ops.ticketPrice} € plein tarif, gratuit -12 ans` : 'Gratuit'], ['Niveau sportif', c.audiences.includes('haut_niveau') ? 'Élite régionale / nationale' : 'Ouvert, avec têtes de série'], ['Ton', 'Urbain, premium, chaleureux, ancré Lorraine'], ['Différenciation', innov.length ? `Innovations transposées : ${innov.map((x) => x.title).join(' ; ')}` : 'Format et expérience spectateur repensés']]),
  ]);
  add('strategie', 'marche', 'Étude de marché', [
    p('Données de marché disponibles (sources publiques, voir docs/research) :'),
    list([
      'Nancy dispose d’une salle de référence (Palais des Sports Jean-Weille, ≈ 6 000 places) et d’un club professionnel (SLUC Nancy, Betclic Élite + FIBA Europe Cup 2026-27) : la culture basket locale est établie.',
      'Comparable régional : All Star Game Alsace (Beyond The Bounce), édition 2026 à Gries, billets observés de 5 à 15 € et pass VIP à 50 € (prix à confirmer).',
      'Le 3x3 grand public reste fragile en extérieur l’été : l’Open Plus 3x3 de Nancy a été annulé en 2026 pour cause de chaleur (source FFBB).',
      'Tendance nationale/internationale : formats courts, fins au score cible, expériences « show » (benchmark R2).',
    ]),
    note('Hypothèse à valider : volonté de payer du public nancéien entre 5 et 15 € pour un show basket régional. Test proposé : prévente « early bird » limitée à 200 billets à J-60.', 'warn'),
  ]);
  add('strategie', 'benchmark', 'Benchmark', [
    table(
      ['Référence', 'Ce qu’on retient', 'Adaptation Bask’Est'],
      [
        ['NBA All-Star (format 2026 à 3 équipes)', 'Mini-tournoi court, rivalité identitaire', 'Mini-tournoi « Grand Est vs Monde »'],
        ['TBT / Elam Ending', 'Chaque match finit sur un panier', 'Fin au score cible sur les matchs à enjeu'],
        ['FIBA 3x3', 'Format court, lisible, 12 s de possession', 'Base des tournois ouverts'],
        ['Quai 54', 'Street culture + mode + musique', 'Direction artistique urbaine et musique live'],
        ['Sports de combat (walkouts)', 'Entrées individuelles théâtralisées', 'Walkout de chaque joueur'],
        ['All Star Game Basket Fauteuil (FFH)', 'Inclusion visible et spectaculaire', 'Manche fauteuil ouverte à tous'],
      ],
    ),
  ]);
  add('strategie', 'inspirations', 'Sources d’inspiration', [
    innov.length ? table(['Innovation', 'Origine', 'Adaptation'], innov.map((x) => [x.title, x.origin, x.basketballAdaptation])) : p('Inspirations détaillées dans la bibliothèque des innovations (docs/06-strategie-veille.md).'),
  ]);
  add('strategie', 'concurrence', 'Analyse concurrentielle', [
    table(
      ['Concurrent pour l’attention du public', 'Force', 'Réponse'],
      [
        ['Matchs du SLUC Nancy', 'Haut niveau, habitudes', 'Programmer hors calendrier SLUC ; proposer un partenariat (joueurs/coachs invités)'],
        ['Autres tournois 3x3 / streetball du Grand Est', 'Communautés existantes', 'Format différenciant + passerelles + contenus personnalisés'],
        ['Sorties familiales du week-end', 'Offre large', 'Tarif famille, animations enfants, durée maîtrisée'],
        ['Écrans (streaming, réseaux)', 'Gratuit, immédiat', 'Vivre ce que l’écran n’offre pas : proximité, participation, souvenirs'],
      ],
    ),
  ]);
  add('strategie', 'cibles', 'Public cible', [
    table(['Public', 'Attente', 'Réponse du concept'], c.audiences.map((au) => [AUDIENCE_LABELS[au], audienceNeed(au), audienceAnswer(au)])),
  ]);

  // =========================================================================
  // PARTIE SPORTIVE
  // =========================================================================
  const stages = c.format.stages.map((s, i) => `Phase ${i + 1} — ${s.label} : ${STAGE_LABEL[s.type]}${s.groups ? ` en ${s.groups} poules` : ''}${s.qualifiersPerGroup ? `, ${s.qualifiersPerGroup} qualifiés par poule` : ''}${s.rounds ? `, ${s.rounds} rondes` : ''}${s.kotc ? `, ${s.kotc.durationMin} min, ${s.kotc.pointsPerWin} pt par victoire${s.kotc.streakBonus ? ` (+${s.kotc.streakBonus} dès 3 victoires de suite)` : ''}` : ''}${s.advance ? `, ${s.advance} qualifiés` : ''}.`);
  add('sportif', 'reglement', 'Règlement complet', [
    p(`Compétition ${c.format.match.official ? 'officielle (règles FIBA/FFBB)' : 'NON officielle : les règles ci-dessous dérogent volontairement aux règles FIBA/FFBB et sont acceptées par chaque participant à l’inscription'}.`),
    list(
      [
        `Art. 1 — Format : ${c.format.teamSize} contre ${c.format.teamSize}, ${teamsLabel}, effectif maximum ${c.format.rosterSize} joueur(s) par équipe.`,
        `Art. 2 — Durée et fin de match : ${endText(a)}`,
        `Art. 3 — Possession : ${c.format.match.shotClockSec} secondes pour tirer.`,
        `Art. 4 — Valeur des paniers : ${c.format.match.zones.map((z) => `${z.label}`).join(' ; ')}.`,
        ...c.format.match.mechanics.map((m, i) => `Art. ${5 + i} — ${MECH_TEXT[m.id] ?? m.id}`),
        ...(c.format.composition ?? []).map((r) => `Composition — ${r.description} : ${r.constraint ?? ''}`),
        `Déroulement : ${stages.join(' ')}`,
        'Départage (poules) : victoires, puis différence de points, puis points marqués, puis tirage au sort.',
        'Fair-play : toute contestation passe par le capitaine ; une faute antisportive = 2 lancers + possession ; exclusion définitive en cas de violence (verbale ou physique) ou de discrimination.',
        'Forfait : équipe absente 5 min après l’appel = forfait (score 0-21 ou équivalent) ; le moteur de programmation réorganise le tableau.',
        'Réclamations : à la table de marque, avant la signature de la feuille de match ; décision du juge-arbitre sans appel.',
      ],
      false,
    ),
  ]);
  add('sportif', 'inscription', 'Conditions d’inscription', [
    list([
      `Inscription en ligne uniquement (formulaire unique : identité, paiement ${ops.registrationFee ? `${ops.registrationFee} € par équipe` : 'gratuit'}, décharge, autorisation droit à l’image, questionnaire/attestation de santé selon l’âge).`,
      `Clôture à J-${ops.registrationCloseDays} ; liste d’attente automatique.`,
      'Mineurs : autorisation des deux représentants légaux (participation + image) obligatoire.',
      'Têtes de série : établies sur critères vérifiables (niveau de championnat, résultats Bask’Est précédents).',
      `Check-in : QR code, ${ops.checkInMinutesPerTeam} min par équipe maximum, ouverture 60 min avant le premier match.`,
    ]),
  ]);
  add('sportif', 'format', 'Format des compétitions', [list(stages, true), kv([['Matchs programmés', `${a.schedule.matches.length}`], ['Terrains', `${ops.courts}`], ['Créneau par match', `${ops.slotMinutes} min`], ['Repos minimum', `${ops.minRestMinutes} min`]])]);
  add('sportif', 'scoring', 'Système de scoring', [
    table(['Zone / action', 'Points', 'Réussite de calibrage (hypothèse)'], c.format.match.zones.map((z) => [z.label, z.points, `${Math.round(z.baseMake * 100)} %`])),
    ...(c.format.match.mechanics.length ? [list(c.format.match.mechanics.map((m) => MECH_TEXT[m.id] ?? m.id))] : []),
  ]);
  add('sportif', 'qualifications', 'Qualifications', [p(c.format.stages.length > 1 ? `Les ${c.format.stages[0].qualifiersPerGroup ? `${c.format.stages[0].qualifiersPerGroup} premiers de chaque poule` : `${c.format.stages[0].advance ?? 4} premiers`} accèdent à la phase finale ; croisement 1er contre 2e d’une autre poule.` : 'Phase unique, pas de qualification.'), p('Passerelle : les meilleurs joueurs sont invités aux autres formats Bask’Est (classement régional, All Star Game).')]);
  add('sportif', 'classements', 'Classements', [list(['Classement de l’événement (final).', 'Classement individuel (points marqués, MVP du public, prix du fair-play).', 'Contribution au classement régional Bask’Est (points selon le rang final, critères publiés à l’avance).'])]);
  const sched = a.schedule.matches.filter((m) => m.start !== undefined);
  const teamName = (id?: string, from?: string) => (id ? id.replace(/^T0?/, 'Équipe ') : (from ?? '—').replace(/^W:/, 'Vainq. ').replace(/^L:/, 'Perd. '));
  add('sportif', 'calendrier', 'Calendrier et programme sportif', [
    table(['Heure', 'Terrain', 'Match', 'Rencontre'], sched.slice(0, 60).map((m) => [fmtTime(m.start!, opening), m.courtId ?? '—', m.label, `${teamName(m.home, m.homeFrom)} – ${teamName(m.away, m.awayFrom)}`]), `Planning généré automatiquement (ouverture ${opening}, ${a.schedule.conflicts.length} conflit(s) détecté(s)).`),
  ]);
  add('sportif', 'recompenses', 'Récompenses', [list([...ops.rewards, ops.cashPrize ? `Cash prize : ${fmtEur(ops.cashPrize)} (au-delà de 3 000 € de prix ouverts aux licenciés : autorisation fédérale à vérifier)` : 'Pas de cash prize : récompenses en visibilité, équipement et expériences.'])]);
  add('sportif', 'arbitrage', 'Arbitrage', [list([`${ops.officials} arbitres, ${a.scheduleInput.officialsPerMatch} par match ; affectation automatique sans conflit d’intérêts (un arbitre lié à une équipe ne l’arbitre pas).`, 'Un juge-arbitre (décisions finales, réclamations).', 'Officiels de table : chrono, score, possession — formés aux règles spéciales la veille.', 'Briefing arbitres J-1 (règles spéciales, signaux Money Time / Joker).'])]);
  add('sportif', 'simulations', 'Simulations sportives', [
    kv([
      ['Simulations Monte-Carlo', `${a.fairness.runs} tournois complets`],
      ['Probabilité que la meilleure équipe gagne', `${Math.round(a.fairness.pBestWins * 100)} %`],
      ['Corrélation classement / niveau réel (τ de Kendall)', `${a.fairness.kendallTau}`],
      ['Matchs serrés', `${Math.round(a.fairness.closeGameRate * 100)} %`],
      ['Durée moyenne d’un match (réelle estimée)', `${a.fairness.avgMatchMinutes} min (p95 : ${a.fairness.p95MatchMinutes} min)`],
      ['Matchs par équipe', `${a.fairness.gamesPerTeam.min} à ${a.fairness.gamesPerTeam.max}`],
      ['Verdict', VERDICT_LABELS[a.fairness.verdict]],
    ]),
    ...(a.fairness.manipulationRisks.length || a.fairness.unfairSituations.length || a.fairness.notes.length ? [list([...a.fairness.manipulationRisks, ...a.fairness.unfairSituations, ...a.fairness.notes])] : [note('Aucun déséquilibre, stratégie dominante ou risque de manipulation structurel détecté.', 'ok')]),
  ]);

  // =========================================================================
  // PARTIE CRÉATIVE
  // =========================================================================
  add('creatif', 'naming', 'Naming', [kv([['Nom', c.identity.name], ['Signature', c.identity.tagline], ['Endossement', 'by Bask’Est (obligatoire sur tous les supports)']]), list(c.identity.nameChecks.map((x) => `À vérifier avant commercialisation : ${x}`))]);
  add('creatif', 'logo', 'Logo et logotype', [{ kind: 'svg', name: 'logo', caption: 'Proposition de logotype (maquette de direction artistique).', svg: logoSvg(assetIn) }]);
  add('creatif', 'da', 'Direction artistique', [p(`Univers : basket urbain premium ancré en Lorraine. Motif signature : ${c.identity.motif}. Contrastes forts (fond nuit, accent orange ballon), typographie condensée et massive pour les titres, photographie en lumière dure et grain léger.`), list(['Lumière : salle sombre, terrain éclairé, accents de couleur aux entrées.', 'Musique : hip-hop, afro, électro, artistes locaux en ouverture.', 'Photo : contre-plongée, sueur, réactions du public, enfants au premier plan.'])]);
  add('creatif', 'charte', 'Charte graphique', [table(['Rôle', 'Couleur'], c.identity.palette.map((col, i) => [['Fond principal', 'Accent', 'Accent secondaire', 'Clair'][i] ?? `Couleur ${i + 1}`, col])), kv([['Titres', 'Archivo Black (ou équivalent condensé, licence libre)'], ['Texte', 'Inter'], ['Règle', 'Le logo Bask’Est apparaît en signature sur 100 % des supports']])]);
  add('creatif', 'moodboard', 'Moodboard', [list(['Parquet orangé sous projecteurs, tribunes dans l’ombre.', `Détails Art nouveau nancéiens (ferronneries, verrières) réinterprétés en ${c.identity.motif}.`, 'Textures : béton, grillage de playground, néons.', 'Personnes : joueuses et joueurs de tous âges, familles, bénévoles en tenue.', 'Objets : ballon, sifflet, trophée verre/métal, bracelets colorés.'])]);
  add('creatif', 'maillots', 'Maillots', [{ kind: 'svg', name: 'jersey', caption: 'Maillot domicile (maquette).', svg: jerseySvg(assetIn, 23, 'NOM', 'home') }, { kind: 'svg', name: 'jersey-away', caption: 'Maillot extérieur (maquette).', svg: jerseySvg(assetIn, 7, 'NOM', 'away') }]);
  add('creatif', 'scenographie', 'Scénographie', [list(['Entrée : arche aux couleurs de l’événement + allée des clubs.', 'Terrain central : sol brandé (logo au rond central, dans le respect des contraintes du gestionnaire), éclairage resserré.', 'Tunnel d’entrée des joueurs avec fumée légère (si autorisé) et écran.', 'Zone contenu : photocall + spot interview face au public.', 'Signalétique : pictogrammes universels, gros caractères, contrastes AA.'])]);
  add('creatif', 'trophees', 'Trophées et médailles', [list(['Trophée principal en verre et métal façonné avec un artisan / une école d’art du territoire (clin d’œil à l’Art nouveau).', 'Médailles en bois ou métal recyclé gravé (coût estimé 5-15 €/pièce).', 'Trophée MVP du public et prix du fair-play.'])]);
  add('creatif', 'affiches', 'Affiches et visuels digitaux', [
    { kind: 'svg', name: 'poster', caption: 'Affiche A4 (maquette).', svg: posterSvg(assetIn) },
    { kind: 'svg', name: 'social', caption: 'Visuel réseaux sociaux 1:1 (maquette).', svg: socialSvg(assetIn, 'J-7', 'Billetterie ouverte') },
    { kind: 'svg', name: 'ticket', caption: 'Billet (maquette).', svg: ticketSvg(assetIn) },
    { kind: 'svg', name: 'badge', caption: 'Accréditation bénévole (maquette).', svg: badgeSvg(assetIn) },
  ]);
  add('creatif', 'ux', 'Maquettes UX/UI', [list(['Page événement sur le site Bask’Est : programme live, billetterie, plan d’accès, règles en 3 pictos.', 'Espace joueur : inscription, check-in QR, planning de son équipe, carte de performance.', 'Écran géant : habillage score, vote MVP, règles actives.', 'Tableau de bord organisateur : planning des terrains, retards, replanification avec validation.']), p('Les écrans de l’outil BASK’EST LAB (dossier docs/screenshots) servent de base aux maquettes.')]);
  add('creatif', 'projection', 'Visuels de projection', [{ kind: 'svg', name: 'screen', caption: 'Habillage écran géant (maquette).', svg: screenSvg(assetIn) }]);

  // =========================================================================
  // PARTIE OPÉRATIONNELLE
  // =========================================================================
  const layoutSvg = renderLayoutSvg(a.layout, { title: venueLabel });
  add('operationnel', 'plans', 'Plans du lieu', [{ kind: 'svg', name: 'plan', caption: `Implantation ${a.layout.variant} — ${venueLabel} (indicative, à valider).`, svg: layoutSvg }]);
  add('operationnel', 'implantation', 'Implantation', [
    table(['Zone', 'Espace', 'Surface', 'Dimensions'], a.layout.zones.filter((z) => z.type !== 'tribune').map((z) => [z.label, a.layout.spaces.find((s) => s.id === z.spaceId)?.name ?? z.spaceId, `${Math.round(z.w * z.h)} m²`, `${z.w.toFixed(1)} × ${z.h.toFixed(1)} m`])),
    kv([
      ['Capacité assise', `${a.layout.capacity.seated}`],
      ['Capacité debout (zones ouvertes, 1 pers./m², indicatif)', `${a.layout.capacity.standing}`],
      ['Places PMR à prévoir (indicatif)', `${a.layout.capacity.pmrPlacesRequired}`],
      ['Dégagements requis / recensés (indicatif)', `${a.layout.egress.requiredExits} / ${a.layout.egress.availableExits}`],
      ['Unités de passage requises / disponibles (indicatif)', `${a.layout.egress.requiredUP} / ${a.layout.egress.availableUP}`],
    ]),
    ...(a.layout.warnings.length ? [list(a.layout.warnings)] : []),
  ]);
  const runOfShow = buildRunOfShow(a, opening);
  add('operationnel', 'conducteur', 'Conducteur minute par minute', [table(['Heure', 'Durée', 'Séquence', 'Responsable'], runOfShow.map((r) => [r.time, `${r.duration} min`, r.item, r.owner]))]);
  const retro = buildRetroplanning(a);
  add('operationnel', 'retroplanning', 'Rétroplanning', [table(['Échéance', 'Tâche', 'Responsable', 'Livrable'], retro.map((r) => [J(r.day), r.task, r.owner, r.deliverable]))]);
  add('operationnel', 'organigramme', 'Organigramme', [
    table(
      ['Pôle', 'Rôle', 'Effectif'],
      [
        ['Direction', 'Directeur·rice de l’événement (décision, go/no-go)', '1'],
        ['Sport', 'Responsable sportif + juge-arbitre + table de marque', `${2 + ops.courts}`],
        ['Spectacle', 'Régisseur, speaker, DJ', '3'],
        ['Accueil & billetterie', 'Contrôle, check-in joueurs, information', `${Math.max(2, ops.entryPoints * 2)}`],
        ['Logistique', 'Montage, matériel, propreté', `${Math.max(3, Math.ceil(c.volunteersNeeded * 0.2))}`],
        ['Restauration', 'Buvette / snack', `${ops.foodPoints * 3}`],
        ['Partenaires & VIP', 'Accueil partenaires, activations', `${Math.max(1, Math.ceil(ops.partners / 3))}`],
        ['Contenus', 'Vidéaste, photographe, community manager', '3'],
        ['Sécurité & secours', 'Référent sécurité (lien DPS / agents)', '1 + prestataires'],
      ],
    ),
  ]);
  add('operationnel', 'responsabilites', 'Répartition des responsabilités (RACI)', [
    table(['Livrable', 'Réalise', 'Valide', 'Consulté', 'Informé'], [
      ['Réservation du lieu', 'Direction', 'Bureau', 'Gestionnaire', 'Équipe'],
      ['Règlement et formats', 'Resp. sportif', 'Direction', 'Arbitres', 'Joueurs'],
      ['Budget et trésorerie', 'Trésorier', 'Bureau', 'Direction', 'Partenaires'],
      ['Sécurité / DPS', 'Référent sécurité', 'Direction', 'Gestionnaire, mairie', 'Équipe'],
      ['Communication', 'Resp. contenus', 'Direction', 'Partenaires', 'Public'],
      ['Publication du planning', 'Resp. sportif', 'Direction (validation obligatoire)', 'Arbitres', 'Joueurs, public'],
    ]),
  ]);
  add('operationnel', 'fiches_benevoles', 'Fiches de poste bénévoles', [
    table(['Poste', 'Mission', 'Horaires', 'Profil', 'Brief'], [
      ['Accueil / contrôle', 'Scanner les billets, orienter, compter', `Créneaux de ${ops.volunteerShiftHours} h`, 'Souriant, à l’aise avec un smartphone', 'J-7 + J0 H-1'],
      ['Check-in joueurs', 'Vérifier identités, autorisations, remettre bracelets', 'Ouverture → fin des poules', 'Rigoureux', 'J-7'],
      ['Table de marque', 'Chrono, score, feuille de match', 'Par terrain', 'Connaît le basket', 'J-1 (règles spéciales)'],
      ['Animation', 'Concours public, tirage au sort, enfants', 'Temps morts', 'Énergique', 'Avec le speaker'],
      ['Buvette', 'Vente, hygiène, réassort', `Créneaux de ${ops.volunteerShiftHours} h`, 'Formé hygiène de base', 'J0 H-1'],
      ['Logistique', 'Montage / démontage, propreté', 'H-4 et après la finale', 'Physique', 'J0 H-4'],
      ['Contenus', 'Stories, interviews, collecte des moments', 'Toute la journée', 'Créatif', 'Plan de captation'],
    ]),
  ]);
  add('operationnel', 'inventaire', 'Inventaire matériel', [table(['Matériel', 'Quantité', 'Source'], inventory(a))]);
  add('operationnel', 'prestataires', 'Gestion des prestataires', [table(['Prestation', 'Statut', 'Échéance devis'], [['DPS (association agréée de sécurité civile)', 'Devis à demander', 'J-90'], ['Sécurité (agents)', c.expectedSpectators > 300 ? 'Obligatoire si palpations (> 300 spectateurs)' : 'Selon gestionnaire', 'J-75'], ['Sono / lumière / écran', 'Devis', 'J-75'], ['Captation vidéo', 'Devis ou partenariat école', 'J-60'], ['Impression', 'Devis', 'J-50'], ['Trophées', 'Commande', 'J-45']])]);
  add('operationnel', 'flux', 'Gestion des flux', [list([`Entrée public : ${ops.entryPoints} file(s) de contrôle, ouverture des portes 60 min avant, billets QR (capacité ≈ ${ops.entryPoints * ops.entryThroughputPerMin} pers./min).`, 'Joueurs : accès séparé, check-in en zone joueurs, circulation vers les terrains sans traverser le public.', 'Secours : cheminement dégagé du poste de secours au terrain et à l’extérieur.', 'Sortie : annonce speaker + musique de sortie ; ouverture de toutes les portes à la fin.', 'PMR : accès dédié, places réservées, accompagnement à la demande.'])]);
  add('operationnel', 'secours', 'Plans de secours', [
    list([
      'DPS dimensionné selon le référentiel national (calcul du ratio d’intervenants à partir de l’effectif et des risques) par une association agréée.',
      'Défibrillateur sur place, emplacement connu de tous les responsables.',
      'Procédure d’évacuation : coupure musique, annonce speaker, ouverture des issues, point de rassemblement.',
      ...(a.venue.indoor ? [] : [`Plan météo : ${ops.weatherPlan}`]),
      'Plan B planning : le moteur de programmation recalcule le tableau en cas de retard, forfait ou terrain indisponible (publication après validation).',
    ]),
  ]);
  const risks = buildRisks(a);
  add('operationnel', 'risques', 'Analyse des risques', [table(['Risque', 'Probabilité', 'Impact', 'Mesure', 'Responsable'], risks.map((r) => [r.risk, r.probability, r.impact, r.mitigation, r.owner]))]);
  add('operationnel', 'checklists', 'Checklists', [
    table(['Moment', 'Points de contrôle'], [
      ['J-30', 'Lieu confirmé · assurance · DPS commandé · 60 % des recettes sécurisées (go/no-go) · règlement publié'],
      ['J-7', 'Planning publié (validé) · briefing bénévoles · conducteur figé · matériel réservé · autorisations reçues'],
      ['J-1', 'Briefing arbitres · test sono/écran · impression feuilles de match · caisse et TPE'],
      ['J0 H-2', 'Tour sécurité · issues dégagées · poste de secours opérationnel · check-in ouvert'],
      ['J+1', 'Démontage · remerciements · collecte retours (QR) · sauvegarde des contenus'],
      ['J+15', 'Bilan partenaires · audit post-événement dans BASK’EST LAB · comptes de l’événement'],
    ]),
  ]);

  // =========================================================================
  // PARTIE ÉCONOMIQUE
  // =========================================================================
  const A = a.budget.assumptions;
  const byCat = costsByCategory(a.budget);
  add('economique', 'budget', 'Budget', [
    table(['Poste', 'Montant (réaliste, hors dérive)'], (Object.keys(byCat) as (keyof typeof byCat)[]).filter((k) => byCat[k] > 0).map((k) => [COST_LABELS[k], fmtEur(byCat[k])])),
    table(['Produit', 'Nature', 'Montant', 'Probabilité', 'Sécurisé'], a.budget.revenues.map((r) => [r.label, NATURE_LABELS[r.nature], fmtEur(revenueAmount(r, A)), `${Math.round(r.probability * 100)} %`, r.secured ? 'oui' : 'non'])),
    table(['Scénario', 'Charges', 'Produits', 'Résultat', 'Point mort (spectateurs)'], a.scenarios.map((s) => [s.name, fmtEur(s.totalCosts), fmtEur(s.totalRevenues), fmtEur(s.result), s.breakEvenSpectators ?? 'non atteignable'])),
    note('Montants unitaires = estimations d’ordre de grandeur (France 2025-2026) à remplacer par des devis. Le budget modifiable est fourni au format Excel.', 'warn'),
  ]);
  add('economique', 'tresorerie', 'Plan de trésorerie', [table(['Jour', 'Solde cumulé'], real.cashflow.map((f) => [J(f.day), fmtEur(f.balance)])), p(`Trésorerie à mobiliser avant l’événement (scénario réaliste) : ${fmtEur(Math.max(0, -real.minCash))}, au plus bas à ${J(real.minCashDay)}.`)]);
  add('economique', 'seuil', 'Seuil de rentabilité', [p(`Scénario réaliste : point mort à ${real.breakEvenSpectators ?? '—'} spectateurs pour ${c.expectedSpectators} attendus. Scénario prudent : ${prud.breakEvenSpectators ?? 'non atteignable'} ; ambitieux : ${amb.breakEvenSpectators ?? '—'}.`)]);
  add('economique', 'tarifs', 'Politique tarifaire', [ops.ticketPrice ? table(['Tarif', 'Prix', 'Note'], pricingGrid(ops.ticketPrice).map((t) => [t.label, `${t.price} €`, t.note ?? ''])) : p('Entrée gratuite (impact social) ; recettes via inscriptions, buvette et partenaires.'), p('Billetterie spectacle sportif : TVA à taux réduit à vérifier avec l’expert-comptable selon le régime fiscal de l’association.')]);
  add('economique', 'commercial', 'Stratégie commerciale', [list(['Prévente « early bird » J-60 → J-30 (sécurise la trésorerie et mesure la demande).', 'Packs clubs (10 billets) et packs entreprises (afterwork).', 'Upsell sur place : merchandising édition limitée, photo souvenir, courtside.', 'Partenaires : prospection dès J-120, signature cible à J-45.'])]);
  const packages = sponsorPackages(c.budgetTier);
  add('economique', 'sponsoring', 'Dossier de sponsoring', [table(['Offre', 'Prix (HT)', 'Nb', 'Contreparties'], packages.map((s) => [s.name, fmtEur(s.price), s.quantity, s.counterparts])), note('Sponsoring (contreparties commerciales, facturé) ≠ mécénat (don, contreparties limitées, reçu fiscal uniquement si l’association est éligible — rescrit recommandé).', 'info')]);
  add('economique', 'offres', 'Offres partenaires', [list(packages.map((s) => `${s.name} — ${s.counterparts}`))]);
  add('economique', 'financements', 'Financements potentiels', [table(['Dispositif', 'Pertinence', 'Calendrier (à vérifier)'], [['Contrat de ville (Grand Nancy) — appel à projets', 'Publics des quartiers prioritaires', 'Souvent oct.-déc. pour N+1'], ['ANS — Projet sportif fédéral (via FFBB)', 'Nécessite l’affiliation FFBB', 'Souvent févr.-avr.'], ['FDVA 2 (Meurthe-et-Moselle)', 'Fonctionnement / projets innovants', 'Souvent janv.-mars'], ['Ville de Nancy / Métropole', 'Subvention + mise à disposition de salle', 'Campagne à l’automne N-1'], ['Région Grand Est / Département 54', 'Manifestations sportives', 'Plusieurs mois avant'], ['Fondations d’entreprise (sport, inclusion)', 'Projets inclusifs / jeunesse', 'Selon appels']]), note('Ne pas déformer l’événement pour coller artificiellement aux critères d’un financeur.', 'warn')]);

  // =========================================================================
  // PARTIE MÉDIATIQUE
  // =========================================================================
  add('mediatique', 'digital', 'Stratégie digitale', [table(['Plateforme', 'Rôle', 'Formats'], [['Instagram', 'Communauté, billetterie', 'Reels, carrousels cartes joueurs, stories live'], ['TikTok', 'Portée chez les 13-25 ans', 'Walkouts, dunks, challenge #BaskEst'], ['YouTube', 'Mémoire et longs formats', 'Résumé, mini-doc, Shorts'], ['LinkedIn', 'Partenaires, collectivités', 'Bilan d’impact, études de cas partenaires']])]);
  add('mediatique', 'editorial', 'Calendrier éditorial', [table(['Échéance', 'Publication'], [['J-60', 'Annonce + date + teaser 15 s'], ['J-45', 'Ouverture billetterie / inscriptions'], ['J-30', 'Révélation des têtes d’affiche / équipes'], ['J-21', 'Règles expliquées en 3 pictos (vidéo)'], ['J-14', 'Portraits joueurs (série)'], ['J-7', 'Compte à rebours + programme'], ['J-1', 'Coulisses montage'], ['J0', 'Live stories, scores, moments forts'], ['J+1', 'Résumé 60 s + photos'], ['J+3', 'Cartes de performance personnalisées'], ['J+14', 'Mini-documentaire + bilan partenaires']])]);
  add('mediatique', 'captation', 'Plan de captation', [table(['Moment', 'Plateforme', 'Format', 'Potentiel'], c.content.map((h) => [h.moment, h.platform, h.format, `${h.viralPotential}/5`])), list(['Liste de plans : entrée du public, walkouts, dunks, tirs décisifs, réactions banc et tribunes, enfants, remise du trophée, bénévoles.', 'Besoins techniques : 2 caméras (dont 1 stabilisée), 1 smartphone vertical dédié, micro-cravate interviews, stockage double.', 'Droits à l’image : collectés à l’inscription ; zone « pas de photo » signalée par bracelet.'])]);
  add('mediatique', 'storyboards', 'Storyboards', [table(['Plan', 'Image', 'Son', 'Durée'], [['1', 'Noir → ballon qui rebondit sur le parquet', 'Battement de cœur', '2 s'], ['2', 'Lumières qui s’allument sur la salle', 'Drop musical', '2 s'], ['3', 'Walkout d’un joueur au ralenti', 'Annonce speaker', '3 s'], ['4', 'Dunk / tir décisif', 'Explosion du public', '3 s'], ['5', 'Enfants qui célèbrent en tribune', 'Musique', '2 s'], ['6', `Logo ${c.identity.name} + date + « by Bask’Est »`, 'Signature sonore', '3 s']], 'Teaser 15 s (J-60)')]);
  add('mediatique', 'videos', 'Formats vidéos', [list(['Teaser 15 s (vertical + horizontal).', 'Résumé 60 s publié sous 24 h.', 'Série « Portraits » (4 × 45 s).', 'Mini-documentaire 8-12 min.', 'Cartes de performance personnalisées pour chaque participant (avec accord).'])]);
  add('mediatique', 'presse', 'Relations presse', [list(['Communiqué J-30 (concept, date, impact territorial) puis J-3 (programme, invités).', 'Cibles : presse quotidienne régionale, radios locales, médias basket nationaux, médias étudiants.', 'Accréditations médias via formulaire, espace médias sur place.', 'Kit presse : visuels HD, chiffres clés, contacts.'])]);
  const kpis = [
    { kpi: 'Spectateurs', target: `${c.expectedSpectators}`, source: 'Billetterie + comptage' },
    { kpi: 'Taux de remplissage', target: '≥ 85 %', source: 'Billetterie' },
    { kpi: 'Satisfaction', target: '≥ 8/10', source: 'Questionnaire QR' },
    { kpi: 'Attente max. joueurs', target: '≤ 75 min', source: 'Moteur de programmation' },
    { kpi: 'Vues contenus J-30 → J+14', target: c.expectedSpectators >= 1000 ? '≥ 100 000' : '≥ 20 000', source: 'Statistiques plateformes' },
    { kpi: 'Abonnés gagnés', target: '≥ 10 % du public', source: 'Instagram / TikTok' },
    { kpi: 'Résultat financier', target: '≥ 0 €', source: 'Comptes de l’événement' },
    { kpi: 'Satisfaction partenaires', target: '≥ 8/10', source: 'Entretien bilan' },
    { kpi: 'Incidents', target: '0 grave', source: 'Main courante' },
  ];
  add('mediatique', 'kpi', 'Indicateurs de performance', [table(['Indicateur', 'Cible', 'Source'], kpis.map((k) => [k.kpi, k.target, k.source]))]);

  // =========================================================================
  // PARTIE JURIDIQUE
  // =========================================================================
  add('juridique', 'autorisations', 'Autorisations à obtenir', [list(c.safety.authorizations), note('Information générale, pas un conseil juridique personnalisé : faire valider auprès de la mairie, de la préfecture et du gestionnaire du lieu ; consulter un avocat pour les contrats et le règlement.', 'warn')]);
  add('juridique', 'assurances', 'Assurances nécessaires', [list(['Responsabilité civile de l’organisateur couvrant l’association, ses préposés et les pratiquants (obligation légale, Code du sport L321-1).', 'Information des participants sur l’intérêt d’une assurance individuelle accident (Code du sport L321-4).', 'Vérifier les exclusions : structures temporaires, cash prize, matériel prêté, annulation météo.'])]);
  add('juridique', 'donnees', 'Protection des données (RGPD)', [list(['Base légale définie pour chaque traitement (inscription = exécution du contrat ; newsletter = consentement).', 'Mineurs de moins de 15 ans : consentement conjoint du représentant légal pour les traitements fondés sur le consentement.', 'Durées de conservation définies (ex. données d’inscription supprimées après la saison ; statistiques anonymisées pour les classements).', 'Profils et classements joueurs : critères transparents, droit d’opposition et de rectification.'])]);
  add('juridique', 'image', 'Droit à l’image', [list(['Autorisation écrite à l’inscription (adultes) ; pour les mineurs, accord des représentants légaux.', 'Bracelet « pas de photo » et floutage par défaut des mineurs non autorisés.', 'Retrait d’une image sur simple demande.'])]);
  add('juridique', 'conditions', 'Conditions de participation', [list(['Acceptation du règlement sportif non officiel et de ses règles spéciales.', 'Attestation / questionnaire de santé selon l’âge et le cadre (à vérifier selon la réglementation en vigueur).', 'Engagement de fair-play et charte anti-discriminations.', 'Politique de remboursement (annulation par l’organisateur = remboursement intégral).'])]);
  add('juridique', 'reglements', 'Règlements applicables', [list(['Règlement de la salle / convention de mise à disposition.', 'Règles FIBA/FFBB pour tout ce qui n’est pas modifié par le règlement de l’événement.', 'Réglementation ERP du lieu et éventuelles prescriptions de la commission de sécurité.', 'Réglementation des débits de boissons temporaires et des jeux-concours (tirages au sort).'])]);
  add('juridique', 'accessibilite', 'Accessibilité', [list(c.safety.accessibility), p(`Places PMR à prévoir (indicatif) : ${a.layout.capacity.pmrPlacesRequired}.`)]);
  add('juridique', 'securite', 'Obligations de sécurité', [list(['Respect de la jauge autorisée et du plan d’évacuation du lieu.', 'Palpations uniquement par agents de sécurité privée habilités (au-delà de 300 spectateurs).', 'Déclaration en mairie pour les manifestations de plus de 1 500 personnes (à anticiper ≥ 1 mois).', 'Posture Vigipirate en vigueur à vérifier à J-7.', `Zones de dégagement autour des terrains : ${c.safety.runOffM} m.`])]);
  add('juridique', 'pi', 'Propriété intellectuelle', [list(['Dépôt de la marque (nom + logo) à l’INPI dans les classes pertinentes (ex. 41 : organisation d’événements sportifs ; 25 : vêtements ; 28 : articles de sport) après recherche d’antériorité.', 'Règlement, manuel de duplication et charte : protégés par le droit d’auteur (dater et conserver les versions).', 'Contrats de licence pour les éditions organisées par des tiers (cahier des charges, redevance, contrôle qualité, retrait).', 'Musiques et visuels : licences et droits d’auteur des créatifs cédés par contrat.'])]);

  // =========================================================================
  // PARTIE DÉVELOPPEMENT
  // =========================================================================
  const scales = (['micro', 'standard', 'premium'] as const).map((tier, i) => {
    const b = budgetTemplate({ label: `${c.title} ${tier}`, scale: tier, venueType: i === 0 ? 'gymnase' : i === 1 ? c.venueType : 'arena', spectators: [250, c.expectedSpectators, Math.max(3000, c.expectedSpectators * 2)][i], participants: c.format.teams * c.format.rosterSize, teams: c.format.teams, hours: c.durationHours, ticketPrice: [5, ops.ticketPrice || 8, 15][i], registrationPerTeam: ops.registrationFee, cashPrize: 0, volunteers: [15, c.volunteersNeeded, c.volunteersNeeded * 2][i] });
    const r = runScenarios(b)[1];
    return [['Édition locale', 'Édition régionale', 'Édition nationale / internationale'][i], fmtEur(r.totalCosts), fmtEur(r.result), `${b.assumptions.spectators}`];
  });
  add('developpement', 'duplication', 'Manuel de duplication', [
    table(['Élément', 'Statut'], [
      ['Nom, logo, signature « by Bask’Est »', 'Obligatoire'],
      ['Format sportif et règles spéciales', 'Obligatoire — non modifiable'],
      ['Durée des matchs, nombre d’équipes', 'Personnalisable dans les bornes du manuel'],
      ['Parcours spectateur (8 phases)', 'Obligatoire (contenu personnalisable)'],
      ['Animations, artistes, restauration', 'Optionnel / personnalisable'],
      ['Sécurité, DPS, assurance, droit à l’image', 'Obligatoire — non négociable'],
    ]),
    kv([
      ['Besoins humains minimums', `${Math.ceil(c.volunteersNeeded * 0.6)} bénévoles + ${ops.officials} arbitres`],
      ['Besoins matériels minimums', `${ops.courts} terrain(s), paniers, scoring, sono, poste de secours`],
      ['Lieux compatibles', c.format.teamSize <= 3 ? 'Gymnase, complexe, place publique, campus, centre commercial' : 'Gymnase (≥ 44 × 24 m), complexe, palais des sports'],
      ['Contrôle qualité', 'Audit BASK’EST LAB post-édition ≥ 70 % d’objectifs atteints pour renouveler la licence'],
      ['Autorisation d’une nouvelle édition', 'Dossier candidat + visite + budget prudent à l’équilibre + référent formé'],
    ]),
    table(['Échelle', 'Charges (réaliste)', 'Résultat (réaliste)', 'Public'], scales, 'Budgets par échelle (estimations générées)'),
  ]);
  add('developpement', 'croissance', 'Potentiel de croissance', [list(['Année 1 : édition pilote auditée, contenus et partenaires de référence.', 'Année 2 : 2 éditions (dont une hors Nancy) → statut « format validé » si objectifs atteints.', 'Année 3 : licences à des clubs / associations du Grand Est ; finale régionale à Nancy.'])]);
  add('developpement', 'territoire', 'Stratégie d’implantation territoriale', [list(['Priorité aux villes du Grand Est disposant d’un club partenaire et d’une salle ≥ 500 places (Metz, Strasbourg, Reims, Mulhouse, Épinal…).', 'Partenariat type : club local (sport) + collectivité (lieu) + Bask’Est (format, marque, outils).', 'Qualifications locales → finale régionale : un calendrier interconnecté plutôt que des événements isolés.'])]);
  add('developpement', 'evolutions', 'Évolutions possibles', [list(['Version digitale : votes, pronostics, cartes joueurs évolutives.', 'Version inclusive renforcée (tableau fauteuil, sport adapté).', 'Version premium en grande salle avec plateau TV.'])]);
  add('developpement', 'versions', 'Historique des versions', [table(['Version', 'Date', 'Modification'], [[c.version, new Date().toISOString().slice(0, 10), 'Génération du Blueprint par BASK’EST LAB']])]);
  add('developpement', 'retex', 'Retours d’expérience', [nonOk.length ? table(['Règle', 'Constat', 'Action'], nonOk.map((r) => [`${r.ruleId} ${r.label}`, r.message, r.fix ?? '—'])) : p('Aucune alerte de conception.'), p('À compléter après l’événement par l’audit post-événement (module Analyse post-événement).')]);

  // Évaluation (annexe stratégique)
  add('strategie', 'evaluation', 'Évaluation BASK’EST LAB', [
    table(['Critère', 'Points', 'Justification'], ev.criteria.map((cr) => [cr.label, `${cr.points} / ${cr.max}`, cr.reasons.join(' ; ')])),
    kv([['Total', `${ev.total}/100 (${ev.grade})`], ['Sécurité', ev.gates.safety], ['Équité', ev.gates.fairness], ['Conformité', ev.gates.compliance], ['Maturité', maturityLabel(ev.maturity)]]),
    ...(ev.gates.details.length ? [list(ev.gates.details)] : []),
    table(['Niveau', 'Exigence'], MATURITY_LEVELS.map((m) => [m.label, m.requirement])),
    table(['Règle', 'Résultat', 'Message'], a.rules.map((r) => [`${r.ruleId} ${DESIGN_RULES.find((d) => d.id === r.ruleId)?.label ?? ''}`, r.outcome, r.message])),
  ]);

  // Ordre final par partie
  const order: PartId[] = ['strategie', 'sportif', 'creatif', 'operationnel', 'economique', 'mediatique', 'juridique', 'developpement'];
  sections.sort((x, y) => order.indexOf(x.part) - order.indexOf(y.part));

  return {
    id: `blueprint-${c.id}`,
    title: `${c.identity.name} — BASK’EST EVENT BLUEPRINT`,
    subtitle: `${extras.edition ?? `Version ${c.version}`} · ${extras.date ?? 'date à fixer'} · ${venueLabel}`,
    version: c.version,
    generatedAt: new Date().toISOString(),
    status: `${maturityLabel(ev.maturity)} · ${ev.total}/100`,
    sections,
    assets: [
      { name: 'logo', label: 'Logo', svg: logoSvg(assetIn) },
      { name: 'affiche', label: 'Affiche', svg: posterSvg(assetIn) },
      { name: 'maillot-domicile', label: 'Maillot domicile', svg: jerseySvg(assetIn, 23, 'NOM', 'home') },
      { name: 'maillot-exterieur', label: 'Maillot extérieur', svg: jerseySvg(assetIn, 7, 'NOM', 'away') },
      { name: 'billet', label: 'Billet', svg: ticketSvg(assetIn) },
      { name: 'accreditation-benevole', label: 'Accréditation bénévole', svg: badgeSvg(assetIn) },
      { name: 'accreditation-joueur', label: 'Accréditation joueur', svg: badgeSvg(assetIn, 'JOUEUR', ['Terrain', 'Zone joueurs']) },
      { name: 'reseaux-j7', label: 'Visuel réseaux J-7', svg: socialSvg(assetIn) },
      { name: 'ecran', label: 'Habillage écran', svg: screenSvg(assetIn) },
      { name: 'plan', label: 'Plan d’implantation', svg: layoutSvg },
    ],
    data: {
      budgetLines: [
        ...a.budget.costs.map((l) => ({ type: 'charge' as const, category: COST_LABELS[l.category], label: l.label, basis: l.basis, unit: l.unitCost, quantity: l.quantity, inKind: !!l.inKind })),
        ...a.budget.revenues.map((l) => ({ type: 'produit' as const, category: l.stream, label: l.label, basis: l.basis, unit: l.unitAmount, quantity: l.quantity, probability: l.probability, nature: NATURE_LABELS[l.nature], secured: l.secured })),
      ],
      assumptions: { spectateurs: A.spectators, participants: A.participants, equipes: A.teams, part_payante: A.paidShare, imprevus: a.budget.contingencyRate },
      scenarios: a.scenarios.map((s) => ({ name: s.name, costs: s.totalCosts, revenues: s.totalRevenues, result: s.result, breakEven: s.breakEvenSpectators, minCash: s.minCash })),
      cashflow: real.cashflow,
      schedule: sched.map((m) => ({ time: fmtTime(m.start!, opening), court: m.courtId ?? '', label: m.label, home: teamName(m.home, m.homeFrom), away: teamName(m.away, m.awayFrom) })),
      runOfShow,
      retroplanning: retro,
      risks,
      sponsorPackages: packages,
      kpis,
      score: ev.criteria.map((x) => ({ criterion: x.label, points: x.points, max: x.max })),
    },
  };
}

// ---------------------------------------------------------------------------
// Générateurs de sous-contenus
// ---------------------------------------------------------------------------

function audienceNeed(a: string): string {
  const m: Record<string, string> = {
    enfants: 'S’amuser, approcher les joueurs', familles: 'Sortie abordable et sûre', passionnes: 'Niveau, enjeu, nouveauté', supporters: 'Ambiance, appartenance', entreprises: 'Visibilité, relations', vip: 'Confort, accès privilégié', pmr: 'Accès, confort, participation', jeunes: 'Jouer, être vu, progresser', femmes: 'Place égale, scène dédiée', etudiants: 'Prix, ambiance, réseau', amateurs: 'Jouer beaucoup, se mesurer', haut_niveau: 'Visibilité, opposition', eloignes_pratique: 'Entrée facile, bienveillance',
  };
  return m[a] ?? '—';
}
function audienceAnswer(a: string): string {
  const m: Record<string, string> = {
    enfants: 'Gratuit -12 ans, mini-basket sur le parquet, meet & greet', familles: 'Pack famille, horaires raisonnables, zone calme', passionnes: 'Format inédit, simulation publiée, statistiques', supporters: 'Bracelets par quartier, chants, MVP du public', entreprises: 'Packs partenaires, afterwork', vip: 'Courtside, accueil dédié', pmr: 'Places réservées, parcours accessible, manche fauteuil', jeunes: 'Contenus personnalisés, passerelles', femmes: 'Tableau ou mixité garantie, même scène', etudiants: 'Tarif réduit, partenariat BDE', amateurs: `Matchs garantis, classement régional`, haut_niveau: 'Plateau relevé, captation', eloignes_pratique: 'Inscription simple, règles d’équilibre',
  };
  return m[a] ?? '—';
}

function buildRunOfShow(a: ConceptAnalysis, opening: string) {
  const rows: { time: string; duration: number; item: string; owner: string }[] = [];
  const push = (min: number, duration: number, item: string, owner: string) => rows.push({ time: fmtTime(min, opening), duration, item, owner });
  push(-240, 180, 'Montage, tests son/lumière/écran, implantation des zones', 'Logistique / régie');
  push(-60, 15, 'Briefing général bénévoles et arbitres', 'Direction');
  push(-60, 60, 'Ouverture des portes, check-in joueurs, musique d’accueil', 'Accueil');
  for (const b of a.schedule.blocks.slice().sort((x, y) => x.start - y.start)) push(b.start, b.duration, b.label, b.kind === 'ceremonie' ? 'Speaker / régie' : 'Animation');
  const stagesSeen = new Set<string>();
  for (const m of a.schedule.matches.filter((x) => x.start !== undefined).sort((x, y) => x.start! - y.start!)) {
    const key = `${m.stageId}-${m.round}`;
    if (stagesSeen.has(key)) continue;
    stagesSeen.add(key);
    push(m.start!, m.duration, `${m.label.split('·')[0].trim()} — début de la ronde ${m.round}`, 'Resp. sportif');
  }
  push(a.schedule.endsAt, 20, 'Remise des trophées, MVP du public, photo officielle', 'Speaker / partenaires');
  push(a.schedule.endsAt + 20, 20, 'Meet & greet, sortie du public', 'Accueil');
  push(a.schedule.endsAt + 40, 120, 'Démontage, état des lieux', 'Logistique');
  return rows.sort((x, y) => x.time.localeCompare(y.time));
}

function buildRetroplanning(a: ConceptAnalysis) {
  const big = a.concept.expectedSpectators > 1500;
  return [
    { day: -180, task: 'Validation du concept (note ≥ 65, portes de sécurité/équité/conformité)', owner: 'Bureau', deliverable: 'Blueprint v1' },
    { day: -150, task: 'Demande de mise à disposition du lieu', owner: 'Direction', deliverable: 'Convention' },
    { day: -120, task: 'Prospection partenaires + dépôt des demandes de subvention', owner: 'Partenariats', deliverable: 'Dossier sponsoring' },
    { day: -90, task: 'Devis DPS, sécurité, sono/écran, captation', owner: 'Logistique', deliverable: 'Devis signés' },
    { day: -75, task: 'Recherche d’antériorité et dépôt de la marque', owner: 'Direction', deliverable: 'Dépôt INPI' },
    { day: -60, task: 'Annonce publique + teaser + prévente early bird', owner: 'Contenus', deliverable: 'Teaser, billetterie' },
    { day: -45, task: 'Ouverture des inscriptions, recrutement bénévoles', owner: 'Resp. sportif', deliverable: 'Formulaire, fiches de poste' },
    ...(big ? [{ day: -35, task: 'Déclaration en mairie (manifestation > 1 500 personnes)', owner: 'Direction', deliverable: 'Récépissé' }] : []),
    { day: -30, task: 'GO / NO-GO : recettes sécurisées ≥ 60 %, préventes, DPS confirmé', owner: 'Bureau', deliverable: 'Décision écrite' },
    { day: -21, task: 'Commandes : trophées, impression, merchandising', owner: 'Logistique', deliverable: 'Bons de commande (validés)' },
    { day: -14, task: 'Simulation finale du format avec les équipes inscrites', owner: 'Resp. sportif', deliverable: 'Rapport de simulation' },
    { day: -7, task: 'Publication du planning (après validation), briefing bénévoles, conducteur figé', owner: 'Direction', deliverable: 'Planning v1, conducteur' },
    { day: -3, task: 'Clôture des inscriptions, check-list matériel', owner: 'Resp. sportif', deliverable: 'Liste définitive' },
    { day: -1, task: 'Briefing arbitres, tests techniques', owner: 'Régie', deliverable: 'PV de test' },
    { day: 0, task: 'Événement', owner: 'Tous', deliverable: 'Main courante' },
    { day: 1, task: 'Résumé vidéo, remerciements', owner: 'Contenus', deliverable: 'Résumé 60 s' },
    { day: 15, task: 'Bilan partenaires + audit post-événement', owner: 'Direction', deliverable: 'Audit BASK’EST LAB' },
    { day: 45, task: 'Comptes de l’événement, justificatifs subventions', owner: 'Trésorier', deliverable: 'Compte-rendu financier' },
  ];
}

function buildRisks(a: ConceptAnalysis) {
  const rows = [
    { risk: 'Affluence inférieure aux prévisions', probability: 'Moyenne', impact: 'Élevé', mitigation: 'Prévente, go/no-go J-30, partenariats clubs/écoles', owner: 'Direction' },
    { risk: 'Retards en cascade', probability: 'Élevée', impact: 'Moyen', mitigation: `Marge de planning, replanification automatique validée, matchs de ${a.ops.slotMinutes} min`, owner: 'Resp. sportif' },
    { risk: 'Blessure d’un joueur', probability: 'Moyenne', impact: 'Élevé', mitigation: 'DPS, dégagements ≥ 2 m, repos minimum, sol vérifié', owner: 'Référent sécurité' },
    { risk: 'Défection d’un partenaire', probability: 'Moyenne', impact: 'Moyen', mitigation: 'Contrats signés avant engagement des dépenses, diversification', owner: 'Partenariats' },
    { risk: 'Manque de bénévoles le jour J', probability: 'Moyenne', impact: 'Moyen', mitigation: 'Sur-recrutement de 20 %, postes ≤ 4 h, repas et tenue', owner: 'Coordination bénévoles' },
    { risk: 'Incident de sécurité / tension', probability: 'Faible', impact: 'Élevé', mitigation: 'Agents habilités, procédure d’exclusion, médiation', owner: 'Référent sécurité' },
    { risk: 'Image d’un mineur diffusée sans accord', probability: 'Faible', impact: 'Élevé', mitigation: 'Bracelets, validation avant publication', owner: 'Contenus' },
  ];
  if (!a.venue.indoor) rows.push({ risk: 'Chaleur / pluie', probability: 'Élevée', impact: 'Élevé', mitigation: a.ops.weatherPlan ?? 'Plan de repli', owner: 'Direction' });
  for (const r of a.rules.filter((x) => x.outcome === 'bloquant')) rows.unshift({ risk: `Règle ${r.ruleId} bloquante : ${r.label}`, probability: 'Certaine', impact: 'Élevé', mitigation: r.fix ?? 'À corriger avant validation', owner: 'Direction' });
  return rows;
}

function inventory(a: ConceptAnalysis): (string | number)[][] {
  const courts = a.ops.courts;
  return [
    ['Paniers (ou paires de paniers)', a.concept.format.teamSize <= 3 ? courts : courts * 2, 'Lieu / location'],
    ['Ballons de match', courts * 4, 'Achat / partenaire'],
    ['Tableaux de score / tablettes', courts, 'Lieu / prêt'],
    ['Chronos de possession', courts, 'Lieu / location'],
    ['Chasubles', a.concept.format.teams * 2, 'Stock association'],
    ['Sono + micros (dont HF speaker)', 1, 'Prestataire'],
    ['Écran / vidéoprojecteur', a.ops.screens ? 1 : 0, 'Lieu / prestataire'],
    ['Barrières / balisage', Math.ceil(a.concept.expectedSpectators / 100), 'Mairie / location'],
    ['Tables + chaises (accueil, marque, buvette)', 8 + courts * 2, 'Lieu'],
    ['Tentes / stands partenaires', a.ops.partners, 'Partenaires'],
    ['Défibrillateur + trousse', 1, 'Lieu / DPS'],
    ['Talkies-walkies', 6 + courts, 'Location'],
    ['Bracelets / accréditations', a.concept.expectedSpectators + a.concept.volunteersNeeded, 'Impression'],
  ].filter((r) => r[1] !== 0) as (string | number)[][];
}

function sponsorPackages(tier: string) {
  const k = tier === 'premium' ? 2.5 : tier === 'standard' ? 1 : tier === 'limite' ? 0.4 : 0.15;
  return [
    { name: 'Partenaire titre (naming)', price: Math.round(5000 * k), quantity: 1, counterparts: 'Nom associé à l’événement, logo central terrain/écran, activation exclusive (ex. concours de tir), 10 places VIP, bilan chiffré' },
    { name: 'Partenaire officiel', price: Math.round(1500 * k), quantity: 4, counterparts: 'Logo affiches/écran, un moment parrainé (MVP, Money Time…), stand village, 4 places VIP' },
    { name: 'Fournisseur officiel', price: 0, quantity: 4, counterparts: 'Apport en nature (boissons, matériel, impression) contre visibilité et stand' },
    { name: 'Club des supporters (TPE / commerces)', price: Math.round(400 * k), quantity: 10, counterparts: 'Logo mur des partenaires, mention réseaux, 2 places' },
  ];
}
