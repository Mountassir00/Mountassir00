import { useEffect, useRef, useState, type ComponentType } from 'react';
import { FEATURES, SPACES } from './features';
import { useLocal } from './ui';
import { Home } from './pages/Home';
import { Scoring } from './pages/Scoring';
import { Projects } from './pages/Projects';
import { PostEvent } from './pages/PostEvent';
import { Trends } from './pages/Trends';
import { Watch } from './pages/Watch';
import { Innovations } from './pages/Innovations';
import { Errors } from './pages/Errors';
import { Generator } from './pages/Generator';
import { Lab } from './pages/Lab';
import { Studio } from './pages/Studio';
import { Venues } from './pages/Venues';
import { SportSim } from './pages/SportSim';
import { FinanceSim } from './pages/FinanceSim';
import { Scheduler } from './pages/Scheduler';
import { Library } from './pages/Library';
import { Collaboration, Ecosystem, Notifications } from './pages/Ecosystem';
import { Portfolio } from './pages/Portfolio';
import { ConfigStudio } from './pages/ConfigStudio';
import { MultiGenerator } from './pages/MultiGenerator';
import { Blocks } from './pages/Blocks';
import { MobileApp } from './pages/MobileApp';

const PAGES: Record<string, ComponentType> = {
  accueil: Home,
  notation: Scoring,
  projets: Projects,
  'post-evenement': PostEvent,
  tendances: Trends,
  veille: Watch,
  innovations: Innovations,
  erreurs: Errors,
  generateur: Generator,
  labo: Lab,
  studio: Studio,
  salles: Venues,
  'simulateur-sportif': SportSim,
  'simulateur-financier': FinanceSim,
  programmation: Scheduler,
  dossiers: Library,
  ecosysteme: Ecosystem,
  notifications: Notifications,
  collaboratif: Collaboration,
  portefeuille: Portfolio,
  'studio-config': ConfigStudio,
  'generateur-multi': MultiGenerator,
  briques: Blocks,
  application: MobileApp,
};

function currentRoute() {
  const r = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return PAGES[r] ? r : 'accueil';
}

/** Marque EVENT LAB : anneau (l'événement), « E » en traits arrondis, point or (le moment fort). */
export function Mark({ className = 'brand-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="112" fill="#0b1a33" />
      <circle cx="256" cy="256" r="176" fill="none" stroke="#f26b1d" strokeWidth="30" />
      <rect x="168" y="178" width="34" height="156" rx="17" fill="#fff" />
      <rect x="168" y="178" width="176" height="34" rx="17" fill="#fff" />
      <rect x="168" y="239" width="120" height="34" rx="17" fill="#fff" />
      <rect x="168" y="300" width="176" height="34" rx="17" fill="#fff" />
      <circle cx="330" cy="256" r="21" fill="#c9a227" />
    </svg>
  );
}

const STATUS_TEXT = { operationnel: 'opérationnel', prototype: 'prototype', integration: 'dépend d’une intégration' } as const;

function NavLinks({ route, onNavigate }: { route: string; onNavigate?: () => void }) {
  return (
    <>
      {SPACES.map((sp) => (
        <div key={sp.id}>
          <div className="nav-space">
            {sp.label}
            <small>{sp.sub}</small>
          </div>
          {sp.groups.map((g) => (
            <div key={g}>
              {sp.groups.length > 1 && <div className="nav-group">{g}</div>}
              {FEATURES.filter((f) => f.group === g).map((f) => (
                <a key={f.route} href={`#/${f.route}`} aria-current={route === f.route ? 'page' : undefined} title={f.note} onClick={onNavigate}>
                  <span className="lbl">{f.label}</span>
                  <span className={`dot ${f.status}`} role="img" aria-label={`statut : ${STATUS_TEXT[f.status]}`} />
                </a>
              ))}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function Legend({ theme, setTheme }: { theme: 'auto' | 'light' | 'dark'; setTheme: (t: 'auto' | 'light' | 'dark') => void }) {
  return (
    <div className="nav-legend">
      <span>
        <i className="dot operationnel" /> opérationnel
      </span>
      <span>
        <i className="dot prototype" /> prototype
      </span>
      <span>
        <i className="dot integration" /> dépend d’une intégration
      </span>
      <button className="theme-toggle" onClick={() => setTheme(theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto')}>
        Thème : {theme === 'auto' ? 'système' : theme === 'dark' ? 'sombre' : 'clair'}
      </button>
    </div>
  );
}

export function App() {
  const [route, setRoute] = useState(currentRoute);
  const [theme, setTheme] = useLocal<'auto' | 'light' | 'dark'>('theme', 'auto');
  const [menu, setMenu] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const on = () => {
      setRoute(currentRoute());
      setMenu(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (!menu) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      menuBtn.current?.focus();
    };
  }, [menu]);
  const PageC = PAGES[route];
  const current = FEATURES.find((f) => f.route === route);
  const space = SPACES.find((s) => s.id === current?.space);
  return (
    <div className="shell">
      <nav className="nav" aria-label="Modules">
        <div className="brand">
          <Mark />
          <div>
            <div className="brand-name">EVENT LAB</div>
            <div className="brand-sub">Innovation événementielle</div>
          </div>
        </div>
        <NavLinks route={route} />
        <Legend theme={theme} setTheme={setTheme} />
      </nav>
      <div style={{ minWidth: 0 }}>
        <header className="mobile-nav">
          <Mark />
          <span className="brand-name">EVENT LAB</span>
          <span className="here" aria-live="polite">
            {space && space.id !== 'commun' ? `${space.label} · ` : ''}
            {current?.label}
          </span>
          <button ref={menuBtn} className="icon-btn" aria-expanded={menu} aria-controls="menu-mobile" onClick={() => setMenu(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Menu
          </button>
        </header>
        {menu && (
          <>
            <div className="drawer-backdrop" onClick={() => setMenu(false)} />
            <div className="drawer" id="menu-mobile" role="dialog" aria-modal="true" aria-label="Menu des modules">
              <div className="drawer-head">
                <div className="brand" style={{ border: 'none', margin: 0, padding: 0 }}>
                  <Mark />
                  <div className="brand-name">EVENT LAB</div>
                </div>
                <button ref={closeBtn} className="icon-btn" onClick={() => setMenu(false)}>
                  Fermer
                </button>
              </div>
              <NavLinks route={route} onNavigate={() => setMenu(false)} />
              <Legend theme={theme} setTheme={setTheme} />
            </div>
          </>
        )}
        <main className="content">
          <PageC />
        </main>
      </div>
    </div>
  );
}
