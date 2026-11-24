import { Page, Panel, Table } from '../ui';
import { feature } from '../features';
import { TRENDS, WEAK_SIGNALS } from '../../data/trends';
import { INNOVATIONS } from '../../data/innovations';

export function Trends() {
  const f = feature('tendances');
  return (
    <Page title="Observatoire des tendances" intro="Ce qui change dans le basket et le divertissement sportif, avec les preuves et ce que Bask’Est peut en faire. Relevé du 24 novembre 2026." status={f.status}>
      <Panel title="Tendances 2025-2026">
        <Table
          head={['Tendance', 'Preuves', 'Pour Bask’Est', 'Force', 'Innovations liées']}
          rows={TRENDS.map((t) => [
            <b>{t.title}</b>,
            t.evidence,
            t.forBaskest,
            ['', 'signal', 'confirmée', 'forte'][t.strength],
            t.innovationIds.map((id) => INNOVATIONS.find((i) => i.id === id)?.title ?? id).join(' ; ') || '—',
          ])}
        />
      </Panel>
      <Panel title="Signaux faibles en France et en Europe">
        <p className="muted small">Initiatives émergentes ou locales à fort potentiel, parfois plus innovantes que les grandes organisations.</p>
        <Table head={['Signal', 'Où, quand', 'Pourquoi c’est intéressant', 'Fiabilité']} rows={WEAK_SIGNALS.map((s) => [<a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>, s.where, s.why, s.status])} />
      </Panel>
    </Page>
  );
}
