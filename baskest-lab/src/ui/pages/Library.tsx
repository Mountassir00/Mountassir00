import { useMemo, useState } from 'react';
import { Page, Panel, Table, download, Scoreboard } from '../ui';
import { feature } from '../features';
import { allConcepts, analysisOf } from '../lab';
import { buildBlueprint } from '../../core/blueprint/blueprint';
import { blueprintToHtml, blueprintToMarkdown } from '../../core/blueprint/render';
import { PART_LABELS } from '../../core/blueprint/types';
import { ASG_2027, ASG_2027_EXTRAS } from '../../data/flagship-asg-2027';
import { INNOVATIONS } from '../../data/innovations';

export function Library() {
  const f = feature('dossiers');
  const concepts = allConcepts();
  const [sel, setSel] = useState(0);
  const c = concepts[sel];
  const a = useMemo(() => analysisOf(c, 150), [c]);
  const bp = useMemo(() => buildBlueprint(a, c.id === ASG_2027.id ? ASG_2027_EXTRAS : {}, INNOVATIONS), [a, c]);
  const html = useMemo(() => blueprintToHtml(bp), [bp]);
  const slug = c.id;
  const parts = Object.entries(PART_LABELS).map(([k, v]) => [v, bp.sections.filter((s) => s.part === k).map((s) => s.title).join(', ')]);
  return (
    <Page title="Bibliothèque des dossiers" intro="Un BASK’EST EVENT BLUEPRINT par concept : cahier des charges, dossier de présentation, manuel d’exploitation et base de la prochaine édition, en 8 parties." status={f.status}>
      <div className="grid side">
        <Panel title="Dossiers">
          <Table head={['Concept', 'Note']} numeric={[1]} selected={sel} onRowClick={setSel} rows={concepts.map((x) => [x.title, x.id === c.id ? a.evaluation.total : '…'])} />
          <p className="small muted" style={{ marginTop: 10 }}>
            Les exports Word, Excel (budget modifiable), PowerPoint (partenaires), PDF et le kit opérationnel sont produits par <code>npm run blueprint</code> puis <code>npm run exports</code>. Le dossier phare est déjà disponible dans docs/blueprints/.
          </p>
        </Panel>
        <div className="grid">
          <Panel title={bp.title}>
            <Scoreboard ev={a.evaluation} title={bp.subtitle} />
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => download(`${slug}-blueprint.html`, html, 'text/html')}>Télécharger (HTML imprimable en PDF)</button>
              <button className="btn ghost" onClick={() => download(`${slug}-blueprint.md`, blueprintToMarkdown(bp, (n) => `${n}.svg`), 'text/markdown')}>Markdown</button>
              <button className="btn ghost" onClick={() => download(`${slug}-blueprint.json`, JSON.stringify(bp, null, 2), 'application/json')}>Données (JSON)</button>
              {bp.assets.map((x) => (
                <button key={x.name} className="btn ghost" onClick={() => download(`${slug}-${x.name}.svg`, x.svg, 'image/svg+xml')}>{x.label}</button>
              ))}
            </div>
            <h3>Contenu ({bp.sections.length} sections)</h3>
            <Table head={['Partie', 'Sections']} rows={parts} />
          </Panel>
          <Panel title="Aperçu">
            <iframe className="preview-frame" title={`Aperçu ${bp.title}`} srcDoc={html} sandbox="" />
          </Panel>
        </div>
      </div>
    </Page>
  );
}
