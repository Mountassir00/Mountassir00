import { useEffect, useState, type ComponentType } from 'react';
import { FEATURES, GROUPS } from './features';
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
};

function currentRoute() {
  const r = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return PAGES[r] ? r : 'accueil';
}

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#F26B1D" />
      <path d="M2 20h36M20 2v36M8 7c6 8 6 18 0 26M32 7c-6 8-6 18 0 26" stroke="#0B1A33" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

export function App() {
  const [route, setRoute] = useState(currentRoute);
  const [theme, setTheme] = useLocal<'auto' | 'light' | 'dark'>('theme', 'auto');
  useEffect(() => {
    const on = () => {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const PageC = PAGES[route];
  return (
    <div className="shell">
      <nav className="nav" aria-label="Modules">
        <div className="brand">
          <Mark />
          <div>
            <div className="brand-name">Bask’Est Lab</div>
            <div className="brand-sub">Innovation événementielle</div>
          </div>
        </div>
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="nav-group">{g}</div>
            {FEATURES.filter((f) => f.group === g).map((f) => (
              <a key={f.route} href={`#/${f.route}`} aria-current={route === f.route ? 'page' : undefined} title={f.note}>
                {f.label}
                <span className={`dot ${f.status}`} aria-label={f.status} />
              </a>
            ))}
          </div>
        ))}
        <div className="nav-legend">
          <span><i className="dot operationnel" /> opérationnel</span>
          <span><i className="dot prototype" /> prototype</span>
          <span><i className="dot integration" /> dépend d’une intégration</span>
          <button className="theme-toggle" onClick={() => setTheme(theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto')}>
            Thème : {theme === 'auto' ? 'système' : theme === 'dark' ? 'sombre' : 'clair'}
          </button>
        </div>
      </nav>
      <div style={{ minWidth: 0 }}>
        <div className="mobile-nav">
          <Mark />
          <span className="brand-name">Bask’Est Lab</span>
          <select aria-label="Module" value={route} onChange={(e) => (window.location.hash = `#/${e.target.value}`)}>
            {FEATURES.map((f) => (
              <option key={f.route} value={f.route}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <main className="content">
          <PageC />
        </main>
      </div>
    </div>
  );
}
