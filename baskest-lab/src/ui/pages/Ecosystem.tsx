import { Page, Panel, Table, useLocal, Gate } from '../ui';
import { feature } from '../features';
import { CONNECTORS } from '../../core/integration/contracts';
import type { ApprovalRequest, Notification } from '../../core/model';

const FLOWS = [
  ['Concept validé → projet', 'Dashboard administratif', 'Concept, budget réaliste, rétroplanning, besoins bénévoles', 'Validation du bureau'],
  ['Inscriptions', 'Site / billetterie (HelloAsso, Billetweb)', 'Format, nombre d’équipes, tarif, clôture, autorisations parentales', 'Publication validée'],
  ['Budget', 'Comptabilité', 'Lignes de charges et produits avec leur nature', 'Trésorier'],
  ['Planning', 'Site, écrans, espaces joueurs', 'Matchs, terrains, horaires, versions', 'Responsable événement'],
  ['Partenaires', 'CRM', 'Offres, contreparties, activations, bilans', '—'],
  ['Communication', 'Réseaux sociaux', 'Calendrier éditorial, visuels, textes', 'Responsable contenus'],
  ['Résultats', 'Base de résultats / classements', 'Scores, classements, statistiques', '—'],
  ['Billetterie immersive / 3D', 'Prestataire à choisir', 'Plan d’implantation (SVG), catégories de places', 'Bureau'],
];

export function Ecosystem() {
  const f = feature('ecosysteme');
  const [approvals, setApprovals] = useLocal<ApprovalRequest[]>('approvals', []);
  const decide = (id: string, status: ApprovalRequest['status']) => setApprovals(approvals.map((a) => (a.id === id ? { ...a, status } : a)));
  return (
    <Page title="Intégrations et validations" intro="Les connexions avec l’écosystème digital Bask’Est. Chaque connecteur fonctionne en mode simulation tant qu’il n’est pas branché ; aucune publication, dépense, commande ou réservation ne part sans validation." status={f.status}>
      <div className="grid two">
        <Panel title="Connecteurs">
          <Table head={['Connecteur', 'Statut', 'Action sensible']} rows={Object.values(CONNECTORS).map((c) => [c.label, c.status === 'integration' ? 'à brancher' : c.status, c.sensitive ? 'validation obligatoire' : 'non'])} />
        </Panel>
        <Panel title="File de validation">
          {approvals.length === 0 && <p className="muted">Aucune demande. Les demandes de publication du planning ou des dossiers apparaissent ici.</p>}
          {approvals.length > 0 && (
            <Table
              head={['Action', 'Demandée par', 'Rôle requis', 'Statut', '']}
              rows={approvals.map((a) => [
                a.action,
                a.requestedBy,
                a.requiredRole.replace('_', ' '),
                <Gate s={a.status === 'approuve' ? 'ok' : a.status === 'refuse' ? 'bloquant' : 'alerte'} label={a.status.replace('_', ' ')} />,
                a.status === 'en_attente' ? (
                  <span className="row">
                    <button className="btn" onClick={() => decide(a.id, 'approuve')}>Approuver</button>
                    <button className="btn ghost" onClick={() => decide(a.id, 'refuse')}>Refuser</button>
                  </span>
                ) : (
                  '—'
                ),
              ])}
            />
          )}
          <p className="small muted">Une fois approuvée, la charge utile est prête pour le connecteur ; l’envoi réel nécessite le branchement du service (voir docs/12-integration-ecosysteme.md).</p>
        </Panel>
      </div>
      <Panel title="Flux de données prévus">
        <Table head={['Flux', 'Destination', 'Données transmises', 'Validation']} rows={FLOWS} />
      </Panel>
    </Page>
  );
}

export function Notifications() {
  const f = feature('notifications');
  const [notes, setNotes] = useLocal<Notification[]>('notifications', []);
  return (
    <Page title="Notifications" intro="Ce que les moteurs ont produit ou détecté. Les notifications push et e-mail dépendent d’une intégration." status={f.status} actions={notes.length ? <button className="btn ghost" onClick={() => setNotes(notes.map((n) => ({ ...n, read: true })))}>Tout marquer comme lu</button> : undefined}>
      <Panel>
        {notes.length === 0 && <p className="muted">Aucune notification. Enregistrer un concept, demander une publication ou modifier un projet en crée.</p>}
        <ul className="list-plain">
          {notes.map((n) => (
            <li key={n.id} style={{ fontWeight: n.read ? 400 : 600 }}>
              {new Date(n.at).toLocaleString('fr-FR')} : {n.message} {n.link && <a href={n.link}>Ouvrir</a>}
            </li>
          ))}
        </ul>
      </Panel>
    </Page>
  );
}

export function Collaboration() {
  const f = feature('collaboratif');
  return (
    <Page title="Espaces collaboratifs" intro="Travailler à plusieurs sur un concept : commentaires, rôles, historique partagé. Cette fonction demande une base de données partagée, dont le schéma est prêt." status={f.status}>
      <div className="grid two">
        <Panel title="Rôles prévus">
          <Table
            head={['Rôle', 'Peut', 'Ne peut pas']}
            rows={[
              ['Président·e / bureau', 'Valider concepts, budgets, publications', '—'],
              ['Trésorier·e', 'Valider dépenses et budgets', 'Publier'],
              ['Responsable événement', 'Valider planning et publication du programme', 'Engager des dépenses'],
              ['Bénévole référent', 'Commenter, mettre à jour les tâches', 'Publier, dépenser'],
              ['Partenaire (lecture)', 'Lire le dossier qui le concerne', 'Voir les budgets internes'],
            ]}
          />
        </Panel>
        <Panel title="Pour activer la collaboration">
          <ol>
            <li>Créer une base Postgres (ex. Supabase, offre gratuite) et appliquer db/schema.sql.</li>
            <li>Activer l’authentification et les politiques de sécurité par ligne (rôles ci-contre).</li>
            <li>Remplacer le stockage local du navigateur par le client de la base (src/ui/ui.tsx, fonction useLocal).</li>
          </ol>
          <p className="small muted">D’ici là, chaque poste conserve ses projets et notes en local ; les dossiers se partagent par export (HTML, PDF, Word).</p>
        </Panel>
      </div>
    </Page>
  );
}
