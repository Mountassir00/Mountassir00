import { useEffect, useState } from 'react';
import { Page, Panel, Table } from '../ui';
import { feature } from '../features';
import { pwaState, isStandalone, type SwState } from '../pwa';

const SW_TEXT: Record<SwState, string> = {
  non_pris_en_charge: 'non pris en charge par ce navigateur',
  desactive_demo: 'absent : démo en fichier unique (fonctionne hors ligne une fois le fichier ouvert, sans installation)',
  desactive_protocole: 'désactivé : page ouverte hors http(s) (fichier local ou enveloppe) — tout est déjà local',
  desactive_dev: 'désactivé en développement (serveur Vite)',
  enregistrement: 'en cours d’enregistrement',
  actif: 'actif : l’application et ses données sont en cache pour un usage hors ligne',
  erreur: 'erreur d’enregistrement',
};

export function MobileApp() {
  const f = feature('application');
  const [, tick] = useState(0);
  const [cached, setCached] = useState<number | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  useEffect(() => {
    const l = () => tick((x) => x + 1);
    pwaState.listeners.add(l);
    const on = () => setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      pwaState.listeners.delete(l);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);
  useEffect(() => {
    if (pwaState.sw !== 'actif' || typeof caches === 'undefined') return;
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.open(k).then((c) => c.keys()))))
      .then((lists) => setCached(lists.reduce((s, l) => s + l.length, 0)))
      .catch(() => setCached(null));
  }, [pwaState.sw]);
  const standalone = isStandalone();
  const install = async () => {
    const p = pwaState.installPrompt;
    if (!p) return;
    await p.prompt();
    await p.userChoice.catch(() => undefined);
    pwaState.installPrompt = null;
    tick((x) => x + 1);
  };
  return (
    <Page title="Application mobile (PWA)" intro="EVENT LAB s’installe comme une application depuis le navigateur (Android, iOS, ordinateur) et fonctionne hors ligne une fois chargée. Cette page affiche l’état réel de ce navigateur ; rien n’est publié dans un magasin d’applications." status={f.status}>
      <div className="grid two">
        <Panel title="État sur cet appareil">
          <dl className="kv">
            <dt>Affichage</dt>
            <dd>{standalone ? 'application installée (plein écran)' : 'dans le navigateur'}</dd>
            <dt>Service worker</dt>
            <dd>
              {SW_TEXT[pwaState.sw]}
              {pwaState.swError ? ` (${pwaState.swError})` : ''}
            </dd>
            <dt>Fichiers en cache</dt>
            <dd>{cached == null ? '—' : `${cached} ressource(s)`}</dd>
            <dt>Connexion</dt>
            <dd>{online ? 'en ligne' : 'hors ligne'}</dd>
            <dt>Données saisies</dt>
            <dd>stockées dans ce navigateur (versions, portefeuille, signaux) ; avec un compte et une organisation, les versions et le portefeuille se synchronisent entre appareils (page <a href="#/compte">Compte et organisation</a>, dépend d’un serveur Supabase pas encore branché)</dd>
          </dl>
          <div className="row" style={{ marginTop: 12 }}>
            {pwaState.installPrompt && !standalone ? (
              <button className="btn" onClick={install}>
                Installer EVENT LAB
              </button>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>
                {standalone ? 'Déjà installée.' : 'Le navigateur ne propose pas d’installation directe ici : utilisez son menu (voir ci-contre).'}
              </p>
            )}
          </div>
        </Panel>
        <Panel title="Installer">
          <h3>Android (Chrome, Edge, Samsung Internet)</h3>
          <p>Menu ⋮ → « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p>
          <h3>iPhone et iPad (Safari)</h3>
          <p>Bouton Partager → « Sur l’écran d’accueil ». L’icône et le titre « EVENT LAB » sont fournis ; la barre d’état reste lisible.</p>
          <h3>Ordinateur (Chrome, Edge)</h3>
          <p>Icône d’installation dans la barre d’adresse.</p>
          <p className="notice">Condition : l’application doit être servie en HTTPS (ou sur localhost) depuis le build normal (<code>npx vite build</code>, dossier <code>dist</code>). La démo en fichier unique (<code>dist-demo/index.html</code>) s’ouvre sans serveur mais ne s’installe pas.</p>
        </Panel>
      </div>
      <Panel title="Ce qui est en place, ce qui manque" className="">
        <Table
          head={['Élément', 'État', 'Détail']}
          rows={[
            ['Manifeste web', 'fait', 'Nom « EVENT LAB », couleurs du thème, affichage autonome, orientation libre, démarrage sur le tableau de bord.'],
            ['Icônes', 'fait', '192 et 512 px, icône « maskable » et icône Apple (180 px), dessin original.'],
            ['Hors ligne', 'fait', 'Service worker généré au build (mise en cache de l’application et des données) ; polices Google facultatives mises en cache à la première visite.'],
            ['Navigation mobile', 'fait', 'Menu repliable, zones tactiles d’au moins 44 px, tableaux larges dans leur propre zone de défilement.'],
            ['Fonctionnement en fichier local', 'préparé', 'Chemins relatifs, routage par « # », aucun appel réseau obligatoire, stockage local enveloppé (l’application reste utilisable si le stockage est refusé).'],
            ['Tests sur téléphones réels', 'non fait', 'Vérifié en émulation (Chromium, 360 et 400 px) uniquement.'],
            ['Applications Android / iOS (magasins)', 'non fait', 'Enveloppe Capacitor à créer, comptes développeur, signature, politique de confidentialité, captures pour les fiches magasin.'],
            ['Synchronisation et comptes', 'hors périmètre v0.3', 'Base partagée et authentification nécessaires (SaaS, prévu en v0.4).'],
          ]}
        />
        <p className="muted small">Calendrier décidé : socle SaaS en v0.4, emballage Capacitor Android/iOS en v0.5, publication en magasin après le premier client payant (event-lab/docs/13-saas-et-mobile.md).</p>
      </Panel>
    </Page>
  );
}
