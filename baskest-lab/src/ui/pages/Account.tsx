// v0.4 — Compte et organisation : connexion, organisations, membres et rôles, invitations,
// synchronisation, suppression du compte, mode local.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Page, Panel, Tabs, download } from '../ui';
import { feature } from '../features';
import { ROLE_LABEL, atLeast, copyWorkspace, type MemberRole } from '../../core/sync';
import type { DeletionPreviewRow, InvitationInfo, MemberInfo, PendingInvitation } from '../../core/sync/account-supabase';
import { redirectUrl } from '../backend';
import { syncSummary } from '../SyncIndicator';
import { activeMembership, activeWorkspace, afterSignOut, forgetOrganizationsOnDevice, getAccount, refreshMemberships, repoFor, requestSync, setActiveOrg, setPreferLocal, syncNow, useApp } from '../workspace';

const ROLES: MemberRole[] = ['lecteur', 'editeur', 'administrateur', 'proprietaire'];
const ROLE_CAN: Record<MemberRole, string> = {
  lecteur: 'lire les événements, versions et le journal',
  editeur: 'créer et modifier des brouillons, les soumettre en revue',
  administrateur: 'valider, archiver, inviter et gérer les membres (sauf propriétaires)',
  proprietaire: 'tout, y compris nommer un propriétaire et supprimer l’organisation',
};
const OUTCOME_TEXT: Record<DeletionPreviewRow['outcome'], string> = {
  organisation_supprimee: 'supprimée avec toutes ses données (vous en êtes le seul membre)',
  bloquant: 'BLOQUANT : vous en êtes le seul propriétaire et d’autres membres restent — nommez d’abord un autre propriétaire',
  adhesion_retiree: 'votre adhésion est retirée ; l’organisation et ses données restent',
};
const ALERT_TEXT: Record<string, string> = { conflit: 'Conflit', renumerotation: 'Renumérotation', refus: 'Refus', suppression_annulee: 'Suppression annulée', integrite: 'Intégrité', transition_non_appliquee: 'Transition' };

type Msg = { kind: 'ok' | 'block' | 'warn'; text: string } | null;
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p className={`alert ${msg.kind === 'ok' ? 'ok' : msg.kind === 'block' ? 'block' : ''}`} role={msg.kind === 'block' ? 'alert' : 'status'}>
      {msg.text}
    </p>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

// ---------------------------------------------------------------------------- mode local
function LocalData() {
  const app = useApp();
  const local = repoFor('local');
  const m = app.migration;
  const exportLocal = () => download(`event-lab-donnees-locales-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), events: local.events(), versions: local.versions() }, null, 2), 'application/json');
  return (
    <>
      <dl className="kv">
        <dt>Espace local</dt>
        <dd>
          {local.events().length} événement(s), {local.versions().length} version(s) enregistrée(s) dans ce navigateur
        </dd>
        <dt>Reprise de la v0.3</dt>
        <dd>
          {!m
            ? 'non effectuée'
            : m.imported + m.duplicates === 0 && !m.skipped.length
              ? 'rien à reprendre'
              : `${m.imported} version(s) reprise(s)${m.renumbered.length ? `, ${m.renumbered.length} renumérotée(s) (numéro déjà pris)` : ''}${m.skipped.length ? `, ${m.skipped.length} élément(s) illisible(s) ignoré(s)` : ''} ; les données d’origine restent dans le navigateur comme sauvegarde`}
        </dd>
        <dt>Stockage</dt>
        <dd>{app.storageAvailable ? 'disponible' : 'indisponible : les données restent en mémoire jusqu’à la fermeture de la page'}</dd>
      </dl>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn ghost" onClick={exportLocal}>
          Exporter les données locales (JSON)
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------- connexion
function SignIn() {
  const [tab, setTab] = useState<'lien' | 'mdp'>('lien');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const run = async (f: () => Promise<string | void>) => {
    setBusy(true);
    setMsg(null);
    try {
      const t = await f();
      if (t) setMsg({ kind: 'ok', text: t });
    } catch (e) {
      setMsg({ kind: 'block', text: errText(e) });
    } finally {
      setBusy(false);
    }
  };
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const onLink = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const a = await getAccount();
      await a!.sendMagicLink(email.trim(), redirectUrl());
      return `Lien envoyé à ${email.trim()}. Ouvrez-le sur cet appareil, dans ce navigateur (le lien expire au bout d’un moment).`;
    });
  };
  const onPassword = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const a = await getAccount();
      await a!.signInWithPassword(email.trim(), password);
    });
  };
  const onSignUp = () =>
    void run(async () => {
      const a = await getAccount();
      const r = await a!.signUp(email.trim(), password, redirectUrl());
      return r === 'session' ? 'Compte créé, vous êtes connecté.' : `Compte créé : confirmez l’adresse avec le lien envoyé à ${email.trim()}.`;
    });
  return (
    <>
      <Tabs
        value={tab}
        onChange={(t) => {
          setTab(t);
          setMsg(null);
        }}
        tabs={[
          { value: 'lien', label: 'Lien par e-mail' },
          { value: 'mdp', label: 'Mot de passe' },
        ]}
      />
      {tab === 'lien' ? (
        <form className="form" onSubmit={onLink}>
          <Field label="Adresse e-mail" hint="Un lien de connexion à usage unique est envoyé ; il crée le compte s’il n’existe pas.">
            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <div className="row">
            <button className="btn" type="submit" disabled={busy || !validEmail}>
              Recevoir un lien de connexion
            </button>
          </div>
        </form>
      ) : (
        <form className="form" onSubmit={onPassword}>
          <Field label="Adresse e-mail">
            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Mot de passe" hint="8 caractères au moins.">
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </Field>
          <div className="row">
            <button className="btn" type="submit" disabled={busy || !validEmail || password.length < 8}>
              Se connecter
            </button>
            <button className="btn ghost" type="button" disabled={busy || !validEmail || password.length < 8} onClick={onSignUp}>
              Créer un compte
            </button>
          </div>
        </form>
      )}
      <Notice msg={msg} />
    </>
  );
}

// ---------------------------------------------------------------------------- organisations
function Organizations() {
  const app = useApp();
  const [name, setName] = useState('');
  const [display, setDisplay] = useState('');
  const [invites, setInvites] = useState<PendingInvitation[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const active = activeWorkspace(app) !== 'local' ? app.activeOrgId : null;
  const loadInvites = async () => {
    try {
      const a = await getAccount();
      setInvites((await a?.myInvitations()) ?? []);
    } catch {
      setInvites([]);
    }
  };
  useEffect(() => {
    void loadInvites();
  }, [app.session?.userId]);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const a = await getAccount();
      const id = await a!.createOrganization(name.trim(), display.trim());
      await refreshMemberships();
      setActiveOrg(id);
      setName('');
      setMsg({ kind: 'ok', text: `Organisation « ${name.trim()} » créée ; vous en êtes propriétaire.` });
    } catch (err) {
      setMsg({ kind: 'block', text: errText(err) });
    } finally {
      setBusy(false);
    }
  };
  const accept = async (inv: PendingInvitation) => {
    try {
      const a = await getAccount();
      const id = await a!.acceptInvitation(inv.id, display.trim() || null);
      await refreshMemberships();
      setActiveOrg(id);
      await loadInvites();
      setMsg({ kind: 'ok', text: `Vous avez rejoint « ${inv.organizationName} » (${ROLE_LABEL[inv.role].toLowerCase()}).` });
    } catch (err) {
      setMsg({ kind: 'block', text: errText(err) });
    }
  };
  return (
    <>
      {app.memberships.length === 0 ? (
        <p className="muted">Vous n’êtes membre d’aucune organisation : créez-en une ou acceptez une invitation.</p>
      ) : (
        <div className="org-list" role="radiogroup" aria-label="Organisation active">
          {app.memberships.map((m) => (
            <button key={m.organizationId} role="radio" aria-checked={active === m.organizationId} className={`org-choice ${active === m.organizationId ? 'on' : ''}`} onClick={() => setActiveOrg(m.organizationId)}>
              <b>{m.organizationName}</b>
              <span className="small">
                {ROLE_LABEL[m.role]}
                {m.functionLabel ? ` · ${m.functionLabel}` : ''}
              </span>
            </button>
          ))}
          <button role="radio" aria-checked={active === null} className={`org-choice ${active === null ? 'on' : ''}`} onClick={() => setPreferLocal(true)}>
            <b>Mode local</b>
            <span className="small">Données de cet appareil seulement</span>
          </button>
        </div>
      )}
      {invites.length > 0 && (
        <>
          <h3>Invitations reçues</h3>
          <ul className="list-plain">
            {invites.map((i) => (
              <li key={i.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span>
                  <b>{i.organizationName}</b> — {ROLE_LABEL[i.role].toLowerCase()}
                  {i.functionLabel ? ` (${i.functionLabel})` : ''}, jusqu’au {new Date(i.expiresAt).toLocaleDateString('fr-FR')}
                </span>
                <button className="btn" onClick={() => void accept(i)}>
                  Accepter
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3>Créer une organisation</h3>
      <form className="controls" onSubmit={create}>
        <Field label="Nom de l’organisation">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required placeholder="ex. Bask’Est" />
        </Field>
        <Field label="Votre nom affiché" hint="Visible des autres membres.">
          <input value={display} onChange={(e) => setDisplay(e.target.value)} maxLength={80} autoComplete="name" />
        </Field>
        <div>
          <button className="btn" type="submit" disabled={busy || !name.trim()}>
            Créer
          </button>
        </div>
      </form>
      <Notice msg={msg} />
    </>
  );
}

// ---------------------------------------------------------------------------- membres
function Members() {
  const app = useApp();
  const me = activeMembership(app);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [invitations, setInvitations] = useState<InvitationInfo[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('editeur');
  const [fn, setFn] = useState('');
  const [confirmOrg, setConfirmOrg] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const orgId = me?.organizationId ?? null;
  const admin = atLeast(me?.role, 'administrateur');
  const owner = me?.role === 'proprietaire';
  const load = async () => {
    if (!orgId) return;
    try {
      const a = await getAccount();
      setMembers((await a?.members(orgId)) ?? []);
      setInvitations(admin ? ((await a?.invitations(orgId)) ?? []) : []);
    } catch (e) {
      setMsg({ kind: 'warn', text: `Liste des membres indisponible (${errText(e)}).` });
    }
  };
  useEffect(() => {
    void load();
  }, [orgId, admin]);
  if (!me || !orgId) return <p className="muted">Choisissez une organisation pour voir ses membres.</p>;
  const act = async (f: () => Promise<void>, ok: string) => {
    setMsg(null);
    try {
      await f();
      await Promise.all([load(), refreshMemberships()]);
      setMsg({ kind: 'ok', text: ok });
    } catch (e) {
      setMsg({ kind: 'block', text: errText(e) });
    }
  };
  const canEditRole = (m: MemberInfo) => owner || (admin && m.role !== 'proprietaire');
  const roleOptions = owner ? ROLES : ROLES.filter((r) => r !== 'proprietaire');
  const pending = invitations.filter((i) => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt) > new Date());
  return (
    <>
      <ul className="member-rows" aria-label="Membres de l’organisation">
        {members.map((m) => {
          const self = m.userId === app.session?.userId;
          return (
            <li key={m.userId}>
              <span className="who">
                <b>{m.displayName}</b>
                {self && <span className="tag">vous</span>}
              </span>
              <span className="fn small">{m.functionLabel ?? '—'}</span>
              <span className="role">
                {canEditRole(m) && !self ? (
                  <select aria-label={`Rôle de ${m.displayName}`} value={m.role} onChange={(e) => void act(async () => (await getAccount())!.setMemberRole(orgId, m.userId, e.target.value as MemberRole, m.rowVersion), `Rôle de ${m.displayName} : ${ROLE_LABEL[e.target.value as MemberRole].toLowerCase()}.`)}>
                    {(m.role === 'proprietaire' ? ROLES : roleOptions).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  ROLE_LABEL[m.role]
                )}
              </span>
              <span className="act">
                {self ? (
                  <button className="btn ghost" onClick={() => void act(async () => (await getAccount())!.removeMember(orgId, m.userId), 'Vous avez quitté l’organisation.')}>
                    Quitter
                  </button>
                ) : canEditRole(m) ? (
                  <button className="btn ghost" aria-label={`Retirer ${m.displayName}`} onClick={() => void act(async () => (await getAccount())!.removeMember(orgId, m.userId), `${m.displayName} retiré(e) de l’organisation.`)}>
                    Retirer
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="small muted">
        Lecteur : {ROLE_CAN.lecteur}. Éditeur : {ROLE_CAN.editeur}. Administrateur : {ROLE_CAN.administrateur}. Propriétaire : {ROLE_CAN.proprietaire}. La fonction (trésorier, présidente…) est un libellé libre, sans effet sur les droits.
      </p>
      {admin && (
        <>
          <h3>Inviter une personne</h3>
          <form
            className="controls"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                await (await getAccount())!.invite(orgId, email, role, fn.trim() || null);
                setEmail('');
                setFn('');
              }, `Invitation enregistrée pour ${email.trim().toLowerCase()}. Prévenez cette personne : elle se connecte avec cette adresse et accepte l’invitation sur cette page (aucun e-mail n’est envoyé automatiquement).`);
            }}
          >
            <Field label="Adresse e-mail">
              <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Rôle">
              <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fonction (facultatif)">
              <input value={fn} onChange={(e) => setFn(e.target.value)} maxLength={80} placeholder="ex. trésorier" />
            </Field>
            <div>
              <button className="btn" type="submit" disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())}>
                Inviter
              </button>
            </div>
          </form>
          {pending.length > 0 && (
            <>
              <h3>Invitations en attente</h3>
              <ul className="member-rows">
                {pending.map((i) => (
                  <li key={i.id}>
                    <span className="who">
                      <b>{i.email}</b>
                    </span>
                    <span className="fn small">expire le {new Date(i.expiresAt).toLocaleDateString('fr-FR')}</span>
                    <span className="role">{ROLE_LABEL[i.role]}</span>
                    <span className="act">
                      <button className="btn ghost" aria-label={`Révoquer l’invitation de ${i.email}`} onClick={() => void act(async () => (await getAccount())!.revokeInvitation(i.id), `Invitation de ${i.email} révoquée.`)}>
                        Révoquer
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {owner && (
        <details className="danger-zone">
          <summary>Supprimer l’organisation « {me.organizationName} »</summary>
          <p className="small">Supprime définitivement l’organisation et toutes ses données sur le serveur, y compris les versions validées et le journal d’audit. Saisissez son nom exact pour confirmer.</p>
          <div className="controls">
            <Field label="Nom de l’organisation">
              <input value={confirmOrg} onChange={(e) => setConfirmOrg(e.target.value)} />
            </Field>
            <div>
              <button className="btn danger" disabled={confirmOrg !== me.organizationName} onClick={() => void act(async () => (await getAccount())!.deleteOrganization(orgId, confirmOrg), 'Organisation supprimée.')}>
                Supprimer l’organisation
              </button>
            </div>
          </div>
        </details>
      )}
      <Notice msg={msg} />
    </>
  );
}

// ---------------------------------------------------------------------------- synchronisation
function SyncPanel() {
  const app = useApp();
  const w = activeWorkspace(app);
  const repo = repoFor(w);
  const me = activeMembership(app);
  const s = syncSummary(app);
  const [msg, setMsg] = useState<Msg>(null);
  const local = repoFor('local');
  const alerts = [...repo.data.alerts].reverse().slice(0, 20);
  const copyLocal = () => {
    try {
      const r = copyWorkspace(local, repo);
      requestSync(0);
      setMsg({ kind: r.failed.length ? 'warn' : 'ok', text: `${r.copied} version(s) copiée(s) vers « ${me?.organizationName} », ${r.alreadyThere} déjà présente(s)${r.renumbered.length ? `, ${r.renumbered.length} renumérotée(s)` : ''}${r.failed.length ? `, ${r.failed.length} en échec` : ''}. L’espace local n’est pas modifié.` });
    } catch (e) {
      setMsg({ kind: 'block', text: errText(e) });
    }
  };
  return (
    <>
      <p className={`sync-line ${s.tone}`}>
        <i aria-hidden="true" /> <b>{s.label}</b> — {s.detail}
      </p>
      {w !== 'local' && (
        <>
          <div className="row">
            <button className="btn" disabled={app.syncing} onClick={() => void syncNow()}>
              Synchroniser maintenant
            </button>
            {atLeast(me?.role, 'editeur') && local.versions().length > 0 && (
              <button className="btn ghost" onClick={copyLocal}>
                Copier mes {local.versions().length} version(s) locale(s) vers cette organisation
              </button>
            )}
            {repo.unseenAlerts().length > 0 && (
              <button className="btn ghost" onClick={() => repo.markAlertsSeen()}>
                Marquer les alertes comme lues
              </button>
            )}
          </div>
          {app.lastReport?.error && <p className="alert block">{app.lastReport.error}</p>}
          {alerts.length > 0 && (
            <ul className="list-plain sync-alerts">
              {alerts.map((a) => (
                <li key={a.id} className={a.seen ? 'muted' : ''}>
                  <span className={`tag ${a.seen ? '' : 'hot'}`}>{ALERT_TEXT[a.kind] ?? a.kind}</span> {new Date(a.at).toLocaleString('fr-FR')} — {a.message}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p className="small muted">
        Hors ligne d’abord : chaque modification est enregistrée sur l’appareil, puis envoyée dans l’ordre au retour du réseau. Un conflit ne peut porter que sur un brouillon : la version du serveur est gardée et la vôtre devient un nouveau brouillon, avec une alerte. Une version validée n’est jamais réécrite.
      </p>
      <Notice msg={msg} />
    </>
  );
}

// ---------------------------------------------------------------------------- suppression du compte
function DeleteAccount() {
  const [preview, setPreview] = useState<DeletionPreviewRow[] | null>(null);
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const blocking = preview?.some((p) => p.outcome === 'bloquant');
  const check = async () => {
    setMsg(null);
    try {
      setPreview((await (await getAccount())!.deletionPreview()) ?? []);
    } catch (e) {
      setMsg({ kind: 'block', text: errText(e) });
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await (await getAccount())!.deleteMyAccount();
      forgetOrganizationsOnDevice();
      afterSignOut(true);
      setMsg({ kind: 'ok', text: 'Compte supprimé. Les données de l’espace local de cet appareil n’ont pas été touchées.' });
    } catch (e) {
      setMsg({ kind: 'block', text: errText(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <p className="small">
        Règle : pour chaque organisation, si vous en êtes le <b>seul membre</b>, elle est supprimée avec toutes ses données ; si vous en êtes le <b>seul propriétaire</b> et que d’autres membres restent, la suppression est <b>refusée</b> tant qu’un autre propriétaire n’est pas nommé ; sinon, seule votre adhésion est retirée et vos contributions restent à l’organisation.
      </p>
      <div className="row">
        <button className="btn ghost" onClick={() => void check()}>
          Vérifier ce qui sera supprimé
        </button>
      </div>
      {preview && (
        <>
          {preview.length === 0 ? (
            <p className="small">Aucune organisation : seul le compte sera supprimé.</p>
          ) : (
            <ul className="list-plain">
              {preview.map((p) => (
                <li key={p.organizationId}>
                  <b>{p.organizationName}</b> <span className="muted small">({ROLE_LABEL[p.myRole].toLowerCase()})</span> : <span className={p.outcome === 'bloquant' ? 'neg' : ''}>{OUTCOME_TEXT[p.outcome]}</span>
                </li>
              ))}
            </ul>
          )}
          {!blocking && (
            <div className="controls" style={{ marginTop: 10 }}>
              <Field label="Saisissez SUPPRIMER pour confirmer">
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
              </Field>
              <div>
                <button className="btn danger" disabled={busy || confirm !== 'SUPPRIMER'} onClick={() => void remove()}>
                  Supprimer définitivement mon compte
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <Notice msg={msg} />
    </>
  );
}

// ---------------------------------------------------------------------------- page
export function Account() {
  const f = feature('compte');
  const app = useApp();
  const [clearOnSignOut, setClearOnSignOut] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const signOut = async () => {
    try {
      await (await getAccount())?.signOut();
    } catch (e) {
      setMsg({ kind: 'warn', text: `Déconnexion locale seulement : ${errText(e)}` });
    }
    afterSignOut(clearOnSignOut);
  };
  const pendingOrg = app.memberships.reduce((s, m) => s + repoFor(`org:${m.organizationId}`).pendingCount(), 0);
  return (
    <Page
      title="Compte et organisation"
      intro="Se connecter, choisir son organisation, gérer les membres et leurs rôles. Sans serveur configuré, ou si vous le choisissez, EVENT LAB fonctionne en mode local : les données restent dans ce navigateur, comme en v0.3."
      status={f.status}
    >
      {!app.configured ? (
        <div className="grid two">
          <Panel title="Mode local">
            <p>
              Aucun serveur n’est configuré pour cette installation : tout fonctionne sur cet appareil, sans compte et sans envoi de données. C’est le fonctionnement de la v0.3.
            </p>
            <LocalData />
          </Panel>
          <Panel title="Activer les comptes et la synchronisation">
            <ol className="mini-list">
              <li>Le porteur crée un projet Supabase (offre gratuite, région UE) et applique les migrations du dossier <code>supabase/migrations/</code>.</li>
              <li>Il renseigne <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> (clé publique) dans un fichier <code>.env</code> (modèle : <code>.env.example</code>), puis reconstruit l’application.</li>
              <li>Cette page propose alors la connexion par lien e-mail ou mot de passe, les organisations et les rôles.</li>
            </ol>
            <p className="small muted">Procédure détaillée : event-lab/docs/14-socle-saas.md. La démo en un seul fichier reste toujours en mode local.</p>
          </Panel>
        </div>
      ) : (
        <div className="grid two">
          <Panel title={app.session ? 'Mon compte' : 'Connexion'}>
            <p className="small muted">
              Serveur : <code>{app.host}</code> (intégration non vérifiée sur un projet réel au moment de la v0.4).
            </p>
            {app.authError && <p className="alert block">{app.authError}</p>}
            {!app.authReady ? (
              <p className="muted">Lecture de la session…</p>
            ) : app.session ? (
              <>
                <dl className="kv">
                  <dt>Connecté</dt>
                  <dd>{app.session.email ?? 'adresse inconnue'}</dd>
                  <dt>Organisation active</dt>
                  <dd>{activeMembership(app)?.organizationName ?? 'aucune (mode local)'}</dd>
                </dl>
                <label className="check-line">
                  <input type="checkbox" checked={clearOnSignOut} onChange={(e) => setClearOnSignOut(e.target.checked)} />
                  Effacer de cet appareil les copies des organisations à la déconnexion
                  {pendingOrg > 0 ? ` (attention : ${pendingOrg} modification(s) pas encore envoyée(s))` : ''}
                </label>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn ghost" onClick={() => void signOut()}>
                    Se déconnecter
                  </button>
                </div>
                <Notice msg={msg} />
              </>
            ) : (
              <>
                <SignIn />
                <p className="small muted" style={{ marginTop: 12 }}>
                  Sans compte, l’application reste utilisable en mode local.
                </p>
              </>
            )}
          </Panel>
          <Panel title="Synchronisation">
            <SyncPanel />
            {(!app.session || activeWorkspace(app) === 'local') && <LocalData />}
            {app.session && app.preferLocal && app.memberships.length > 0 && (
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn ghost" onClick={() => setPreferLocal(false)}>
                  Revenir à l’organisation
                </button>
              </div>
            )}
          </Panel>
          {app.session && (
            <>
              <Panel title="Organisations">
                <Organizations />
              </Panel>
              <Panel title={`Membres${activeMembership(app) ? ` — ${activeMembership(app)!.organizationName}` : ''}`}>
                <Members />
              </Panel>
              <Panel title="Supprimer mon compte" className="danger-panel">
                <DeleteAccount />
              </Panel>
            </>
          )}
        </div>
      )}
    </Page>
  );
}
