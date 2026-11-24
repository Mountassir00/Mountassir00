/**
 * "Assistance" side panel. No model is ever called: every action is a local,
 * deterministic computation, and the actions that would need a model are
 * shown disabled with the reason (they would have to be arbitrated first).
 */
import type { ReactNode } from 'react';
import { fmtRelative, type AgentStatus, type DataNature } from '@sdk';
import { IconClose, NatureBadge, StatusPill } from '@ds';
import type { BoardSummary } from './data';
import type { Arrange, StickyColor } from './model';
import { GAlign, GDoc, GEdit, GFlow, GLock, GSpark, GSticky, GSummary } from './glyphs';

export interface LinkedAgent {
  id: string;
  name: string;
  role: string;
  hue: number;
  status?: AgentStatus;
}

export interface Activity {
  ts: number;
  text: string;
}

export interface SelectedInfo {
  kind: 'none' | 'frame' | 'object' | 'many';
  title: string;
  detail?: string;
  color?: StickyColor;
  editable?: boolean;
  generated?: boolean;
  box?: { x: number; y: number; w: number; h: number };
  count?: number;
}

export interface PanelProps {
  tab: 'assist' | 'props';
  onTab: (t: 'assist' | 'props') => void;
  onClose: () => void;
  sheet: boolean;
  boardName: string;
  selectionText: string;
  periodLabel: string;
  live: boolean;
  nature: DataNature;
  summary: BoardSummary | null;
  onSummarize: () => void;
  onPlaceSummary: () => void;
  onCopySummary: () => void;
  onCloseSummary: () => void;
  pendingCount: number;
  onStickiesFromDecisions: () => void;
  movableSelected: number;
  onArrange: (m: Arrange) => void;
  onGenerateCycle: () => void;
  onOpenDecisions: () => void;
  agents: LinkedAgent[];
  onSelectAgent: (id: string) => void;
  activity: Activity[];
  now: number;
  selected: SelectedInfo;
  hiddenFrames: number;
  onColor: (c: StickyColor) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onShowFrames: () => void;
  onResetLayout: () => void;
  onClear: () => void;
  objectCount: number;
}

const COLORS: Array<[StickyColor, string]> = [
  ['yellow', 'Jaune'],
  ['pink', 'Rose'],
  ['green', 'Vert'],
  ['blue', 'Bleu'],
  ['violet', 'Violet'],
  ['orange', 'Orange'],
];

function Action({ icon, title, desc, onClick, disabled, children }: { icon: ReactNode; title: string; desc: string; onClick?: () => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <li className="wb-action" data-disabled={disabled || undefined}>
      <button type="button" className="wb-action__btn" onClick={onClick} disabled={disabled} aria-describedby={undefined}>
        <span className="wb-action__icon">{icon}</span>
        <span className="wb-action__text">
          <b>{title}</b>
          <small>{desc}</small>
        </span>
      </button>
      {children}
    </li>
  );
}

export function AssistPanel(p: PanelProps) {
  return (
    <aside className="wb-panel" data-sheet={p.sheet || undefined} aria-label="Assistance du tableau">
      {p.sheet && <span className="wb-panel__grip" aria-hidden />}
      <div className="wb-panel__head">
        <div className="wb-tabs" role="tablist" aria-label="Panneau">
          <button type="button" role="tab" aria-selected={p.tab === 'assist'} onClick={() => p.onTab('assist')}>
            Assistance
          </button>
          <button type="button" role="tab" aria-selected={p.tab === 'props'} onClick={() => p.onTab('props')}>
            Propriétés
          </button>
        </div>
        <button type="button" className="wb-icon" onClick={p.onClose} aria-label="Fermer le panneau">
          <IconClose size={16} />
        </button>
      </div>
      <div className="wb-panel__body" role="tabpanel">
        {p.tab === 'assist' ? <AssistTab {...p} /> : <PropsTab {...p} />}
      </div>
    </aside>
  );
}

function AssistTab(p: PanelProps) {
  const canArrange = p.movableSelected >= 2;
  return (
    <>
      <section className="wb-sec">
        <h4 className="wb-sec__title">Contexte</h4>
        <ul className="wb-ctx">
          <li>
            <GDoc size={15} /> {p.boardName}
          </li>
          <li>
            <GSticky size={15} /> {p.selectionText}
          </li>
          <li>
            <GSpark size={15} /> {p.periodLabel} · {p.live ? 'en direct' : 'replay'} <NatureBadge nature={p.nature} />
          </li>
        </ul>
        <p className="wb-local">Calculs locaux et déterministes : aucun modèle d’IA n’est appelé depuis ce tableau.</p>
      </section>

      <section className="wb-sec">
        <h4 className="wb-sec__title">Actions</h4>
        <ul className="wb-actions">
          <Action icon={<GSummary size={17} />} title="Résumer le tableau" desc="Comptes et listes tirés des données" onClick={p.onSummarize} />
          {p.summary && (
            <li className="wb-summary" aria-live="polite">
              <div className="wb-summary__head">
                <b>Résumé calculé</b>
                <NatureBadge nature={p.summary.nature} />
              </div>
              <ul>
                {p.summary.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
              <div className="wb-summary__actions">
                <button type="button" className="btn btn--sm btn--primary" onClick={p.onPlaceSummary}>
                  Placer sur le tableau
                </button>
                <button type="button" className="btn btn--sm" onClick={p.onCopySummary}>
                  Copier
                </button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={p.onCloseSummary}>
                  Fermer
                </button>
              </div>
            </li>
          )}
          <Action
            icon={<GSticky size={17} />}
            title="Créer des post-it depuis les décisions"
            desc={p.pendingCount ? `${p.pendingCount} décision(s) en attente, colorées selon le risque` : 'Aucune décision en attente'}
            onClick={p.onStickiesFromDecisions}
            disabled={!p.pendingCount}
          />
          <Action
            icon={<GAlign size={17} />}
            title="Aligner / organiser la sélection"
            desc={canArrange ? `${p.movableSelected} éléments sélectionnés` : 'Sélectionnez au moins deux éléments (Maj + clic)'}
            disabled={!canArrange}
          >
            {canArrange && (
              <div className="wb-action__sub">
                <button type="button" className="btn btn--sm" onClick={() => p.onArrange('top')}>
                  Aligner en haut
                </button>
                <button type="button" className="btn btn--sm" onClick={() => p.onArrange('row')}>
                  En ligne
                </button>
                <button type="button" className="btn btn--sm" onClick={() => p.onArrange('grid')}>
                  En grille
                </button>
              </div>
            )}
          </Action>
          <Action icon={<GFlow size={17} />} title="Générer le diagramme du cycle des tâches" desc="Copie modifiable avec les comptes actuels" onClick={p.onGenerateCycle} />
        </ul>
        <h4 className="wb-sec__title wb-sec__title--sub">Nécessitent un modèle d’IA</h4>
        <ul className="wb-actions">
          <Action icon={<GLock size={17} />} title="Développer des notes" desc="Nécessite un modèle : à arbitrer en GO / NO GO" disabled />
          <Action icon={<GLock size={17} />} title="Convertir en spec" desc="Nécessite un modèle : à arbitrer en GO / NO GO" disabled />
        </ul>
        <p className="wb-explain">
          Ces actions produiraient du texte avec un modèle, donc une dépense. Elles restent désactivées tant qu’une proposition n’a pas été validée dans le centre GO / NO GO.{' '}
          <button type="button" className="wb-link" onClick={p.onOpenDecisions}>
            Ouvrir le centre GO / NO GO
          </button>
        </p>
      </section>

      <section className="wb-sec">
        <h4 className="wb-sec__title">
          Agents liés <span className="wb-count">{p.agents.length}</span>
        </h4>
        <p className="wb-sec__hint">Agents des départements présents dans les cadres générés.</p>
        <ul className="wb-agents">
          {p.agents.map((a) => (
            <li key={a.id}>
              <button type="button" className="wb-agent" onClick={() => p.onSelectAgent(a.id)} aria-label={`${a.name}, ${a.role}. Ouvrir dans l’inspecteur`}>
                <span className="wb-agent__dot" style={{ background: `hsl(${a.hue} 62% 62%)` }} aria-hidden>
                  {a.name.slice(0, 1)}
                </span>
                <span className="wb-agent__text">
                  <b>{a.name}</b>
                  <small>{a.role}</small>
                </span>
                {a.status ? <StatusPill status={a.status} /> : <span className="t-micro t-muted">Sans activité</span>}
              </button>
            </li>
          ))}
          {!p.agents.length && <li className="t-small t-muted">Aucun agent lié aux cadres affichés.</li>}
        </ul>
      </section>

      <section className="wb-sec">
        <h4 className="wb-sec__title">Activité</h4>
        <ul className="wb-activity">
          {p.activity.slice(0, 8).map((a, i) => (
            <li key={`${a.ts}-${i}`}>
              <span>
                <b>Vous</b> · {a.text}
              </span>
              <time className="t-micro t-muted">{fmtRelative(a.ts, p.now)}</time>
            </li>
          ))}
          {!p.activity.length && <li className="t-small t-muted">Aucune modification pour l’instant.</li>}
        </ul>
      </section>
    </>
  );
}

function PropsTab(p: PanelProps) {
  const s = p.selected;
  return (
    <>
      <section className="wb-sec">
        <h4 className="wb-sec__title">{s.title}</h4>
        {s.detail && <p className="wb-sec__hint">{s.detail}</p>}
        {s.box && (
          <dl className="kv wb-kv">
            <dt>Position</dt>
            <dd className="num">
              {Math.round(s.box.x)}, {Math.round(s.box.y)}
            </dd>
            <dt>Taille</dt>
            <dd className="num">
              {Math.round(s.box.w)} × {Math.round(s.box.h)}
            </dd>
          </dl>
        )}
      </section>
      {s.color && (
        <section className="wb-sec">
          <h4 className="wb-sec__title">Couleur</h4>
          <div className="wb-swatches" role="radiogroup" aria-label="Couleur du post-it">
            {COLORS.map(([c, label]) => (
              <button key={c} type="button" role="radio" aria-checked={s.color === c} aria-label={label} title={label} className="wb-swatch" data-color={c} onClick={() => p.onColor(c)} />
            ))}
          </div>
        </section>
      )}
      {s.kind !== 'none' && (
        <section className="wb-sec wb-props-actions">
          {s.editable && (
            <button type="button" className="btn btn--sm" onClick={p.onEdit}>
              <GEdit size={14} /> Modifier le texte
            </button>
          )}
          {(s.kind === 'object' || s.kind === 'many') && (
            <button type="button" className="btn btn--sm" onClick={p.onDuplicate}>
              Dupliquer <span className="kbd">Ctrl D</span>
            </button>
          )}
          <button type="button" className="btn btn--sm btn--danger" onClick={p.onDelete}>
            {s.kind === 'frame' ? 'Masquer le cadre' : 'Supprimer'} <span className="kbd">Suppr</span>
          </button>
        </section>
      )}
      {s.kind === 'many' && p.movableSelected >= 2 && (
        <section className="wb-sec wb-props-actions">
          <button type="button" className="btn btn--sm" onClick={() => p.onArrange('top')}>
            Aligner en haut
          </button>
          <button type="button" className="btn btn--sm" onClick={() => p.onArrange('row')}>
            En ligne
          </button>
          <button type="button" className="btn btn--sm" onClick={() => p.onArrange('grid')}>
            En grille
          </button>
        </section>
      )}
      <section className="wb-sec">
        <h4 className="wb-sec__title">Tableau</h4>
        <p className="wb-sec__hint">
          {p.objectCount} objet(s) ajouté(s) par vous · enregistré sur cet appareil. Les cadres générés se déplacent et se redimensionnent ; leur contenu suit les données.
        </p>
        <div className="wb-props-actions">
          {p.hiddenFrames > 0 && (
            <button type="button" className="btn btn--sm" onClick={p.onShowFrames}>
              Réafficher les cadres masqués ({p.hiddenFrames})
            </button>
          )}
          <button type="button" className="btn btn--sm" onClick={p.onResetLayout}>
            Réinitialiser la disposition des cadres
          </button>
          <button type="button" className="btn btn--sm btn--danger" onClick={p.onClear} disabled={!p.objectCount}>
            Retirer mes objets
          </button>
        </div>
        <p className="wb-sec__hint">Tout est annulable avec Ctrl + Z.</p>
      </section>
      <section className="wb-sec">
        <h4 className="wb-sec__title">Raccourcis</h4>
        <dl className="kv wb-kv wb-keys">
          <dt>Outils</dt>
          <dd>V · H · R · P · T · N · C</dd>
          <dt>Annuler / rétablir</dt>
          <dd>Ctrl Z · Ctrl Maj Z</dd>
          <dt>Dupliquer</dt>
          <dd>Ctrl D</dd>
          <dt>Déplacer</dt>
          <dd>Flèches (Maj : ×10)</dd>
          <dt>Multi-sélection</dt>
          <dd>Maj + clic, ou glisser</dd>
          <dt>Vue</dt>
          <dd>Espace + glisser · Ctrl molette · Maj 1</dd>
        </dl>
      </section>
    </>
  );
}
