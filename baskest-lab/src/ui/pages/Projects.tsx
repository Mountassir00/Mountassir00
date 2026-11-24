import { useMemo, useState } from 'react';
import { Page, Panel, Table, useLocal, Tabs, SelectField } from '../ui';
import { feature } from '../features';
import { allConcepts, analysisOf } from '../lab';
import type { Project } from '../../core/model';
import { buildBlueprint } from '../../core/blueprint/blueprint';

/** Gestionnaire de projets : un concept validé devient un projet (rétroplanning, versions, visibilité). */
export function Projects() {
  const f = feature('projets');
  const concepts = allConcepts();
  const [projects, setProjects] = useLocal<Project[]>('projects', []);
  const [tab, setTab] = useState<'projets' | 'calendrier' | 'versions'>('projets');
  const [conceptId, setConceptId] = useState(concepts[0].id);
  const [date, setDate] = useState('2027-06-12');
  const [sel, setSel] = useState(0);

  function createProject() {
    const c = concepts.find((x) => x.id === conceptId)!;
    const bp = buildBlueprint(analysisOf(c, 80));
    const p: Project = {
      id: `prj-${Date.now()}`,
      conceptId: c.id,
      name: c.title,
      stage: 'conception',
      owner: 'Bureau Bask’Est',
      eventDate: date,
      tasks: bp.data.retroplanning.map((r, i) => ({ id: `t${i}`, title: r.task, due: r.day, owner: r.owner, done: false, deliverable: r.deliverable })),
      versions: [{ version: 1, at: new Date().toISOString(), author: 'BASK’EST LAB', summary: `Projet créé depuis le concept v${c.version}` }],
      visibility: 'prive',
    };
    setProjects([...projects, p]);
    setSel(projects.length);
  }

  const p = projects[sel];
  const due = (d: number) => {
    if (!p?.eventDate) return `J${d}`;
    const t = new Date(p.eventDate);
    t.setDate(t.getDate() + d);
    return t.toLocaleDateString('fr-FR');
  };
  const update = (np: Project, summary: string) =>
    setProjects(projects.map((x, i) => (i === sel ? { ...np, versions: [...np.versions, { version: np.versions.length + 1, at: new Date().toISOString(), author: 'équipe', summary }] } : x)));

  const calendar = useMemo(
    () =>
      projects
        .filter((x) => x.eventDate)
        .map((x) => ({ date: x.eventDate!, name: x.name, stage: x.stage }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [projects],
  );

  return (
    <Page title="Projets et calendrier" intro="Un concept validé devient un projet : rétroplanning daté, responsables, versions, calendrier de saison. Les projets restent privés jusqu’à publication volontaire." status={f.status}>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'projets', label: 'Projets' }, { value: 'calendrier', label: 'Calendrier événementiel' }, { value: 'versions', label: 'Gestion des versions' }]} />
      {tab === 'projets' && (
        <div className="grid side">
          <Panel title="Nouveau projet">
            <div className="form">
              <SelectField label="Concept" value={conceptId} onChange={setConceptId} options={concepts.map((c) => ({ value: c.id, label: c.title }))} />
              <label className="field">
                <span>Date de l’événement</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <button className="btn" onClick={createProject}>Créer le projet</button>
            </div>
            {projects.length > 0 && (
              <>
                <h3>Projets</h3>
                <ul className="list-plain">
                  {projects.map((x, i) => (
                    <li key={x.id} className="clickable" onClick={() => setSel(i)} style={{ fontWeight: i === sel ? 700 : 400 }}>
                      {x.name} <span className="tag">{x.stage}</span> <span className="tag">{x.visibility}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
          <Panel title={p ? p.name : 'Aucun projet'}>
            {!p && <p className="muted">Choisissez un concept et une date pour générer le rétroplanning complet.</p>}
            {p && (
              <>
                <div className="row">
                  <SelectField label="Étape" value={p.stage} onChange={(v) => update({ ...p, stage: v }, `Étape : ${v}`)} options={['conception', 'validation', 'production', 'exploitation', 'bilan'].map((v) => ({ value: v as Project['stage'], label: v }))} />
                  <SelectField label="Visibilité" value={p.visibility} onChange={(v) => update({ ...p, visibility: v }, `Visibilité : ${v}`)} options={[{ value: 'prive', label: 'Privé' }, { value: 'equipe', label: 'Équipe' }, { value: 'publie', label: 'Publié (après validation)' }]} />
                </div>
                <p className="small muted">
                  {p.tasks.filter((t) => t.done).length}/{p.tasks.length} tâches faites.
                </p>
                <Table
                  head={['Fait', 'Échéance', 'Tâche', 'Responsable', 'Livrable']}
                  rows={p.tasks.map((t) => [
                    <input type="checkbox" checked={t.done} aria-label={`Marquer « ${t.title} » comme faite`} onChange={(e) => update({ ...p, tasks: p.tasks.map((x) => (x.id === t.id ? { ...x, done: e.target.checked } : x)) }, `${e.target.checked ? 'Fait' : 'Rouvert'} : ${t.title}`)} />,
                    due(t.due),
                    t.title,
                    t.owner,
                    t.deliverable ?? '',
                  ])}
                />
              </>
            )}
          </Panel>
        </div>
      )}
      {tab === 'calendrier' && (
        <Panel title="Saison interconnectée">
          <p className="muted">Les formats Bask’Est se répondent : les qualifications locales mènent aux grands rendez-vous. Ajoutez des projets datés pour remplir la saison.</p>
          <Table
            head={['Période', 'Rendez-vous', 'Lien avec la saison']}
            rows={[
              ['Septembre → mars', 'L’Échelle de l’Est (défis 3x3 sur les city-stades)', 'Le leader gagne sa place en finale « Road to ASG »'],
              ['Avril → mai', 'Bask’Cup', 'Le champion gagne sa place en finale « Road to ASG »'],
              ['Juin', 'All Star Game Grand Est', 'Sommet de la saison, sélection + vote du public'],
              ['Juillet → août', 'City Tour 54 (quartiers)', 'Repère les joueurs pour l’Échelle de la saison suivante'],
              ...calendar.map((c) => [new Date(c.date).toLocaleDateString('fr-FR'), c.name, `Projet (${c.stage})`]),
            ]}
          />
        </Panel>
      )}
      {tab === 'versions' && (
        <Panel title="Historique des versions">
          {!p && <p className="muted">Créez un projet pour suivre ses versions.</p>}
          {p && <Table head={['Version', 'Date', 'Auteur', 'Modification']} rows={p.versions.slice().reverse().map((v) => [v.version, new Date(v.at).toLocaleString('fr-FR'), v.author, v.summary])} />}
        </Panel>
      )}
    </Page>
  );
}
