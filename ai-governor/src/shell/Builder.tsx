/**
 * Custom Experience Builder.
 * Local, deterministic analysis of references (palette, luminance, keywords)
 * → art-direction proposal → Category A (theme on an existing engine, created
 * as a draft variant to validate) or Category B (needs new components or a new
 * renderer → an implementation brief, never an automatic "image to app").
 * No model is called; a deeper AI analysis would be a spend → GO/NO GO.
 */
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import type { RegistryEntry } from '@engine/registry';
import { ops } from '@engine/registry';
import { BUILTIN_THEMES, themeToCssVars, validateTheme, type Theme } from '@engine/themes';
import type { QualitySettings } from '@engine/quality';
import { IconInfo, IconUpload, Notice, IconDownload, IconCopy, IconLock } from '@ds';
import { ExperienceHost } from './ExperienceHost';
import { clock } from './App';
import { contrast, extractPalette, hexToRgb, luminance, mix, saturation } from './color';
import { setPrefs, toast, ui } from './uiStore';

interface Ref {
  id: string;
  kind: 'image' | 'svg' | 'video' | 'url' | 'file';
  name: string;
  preview?: string;
  palette?: Array<{ hex: string; share: number }>;
  note?: string;
  urlType?: string;
}

const TRAITS: Array<{ id: string; label: string; words: RegExp; engine?: string; needsB?: string }> = [
  { id: 'iso', label: 'Perspective isométrique', words: /isom[ée]tri|isometric|2\.5d/i, engine: 'ai-office' },
  { id: 'office', label: 'Bureau, personnages, pièces', words: /bureau|office|personnage|avatar|pi[eè]ce|salle|open.?space/i, engine: 'ai-office' },
  { id: 'map', label: 'Carte technique, blocs et flux', words: /carte|map|sch[ée]ma|architecture|r[ée]seau|network|flux|flow|diagram/i, engine: 'system-map' },
  { id: 'platform', label: 'Plateformes modulaires', words: /plateforme|platform|modulaire|modular|[îi]lot|island/i, engine: 'modular-office' },
  { id: 'dashboard', label: 'Tableau de bord, graphiques', words: /dashboard|tableau de bord|graphique|chart|kpi|analytique/i, engine: 'control-center' },
  { id: 'list', label: 'Fil textuel, journal', words: /journal|liste|feed|fil|log|texte/i, engine: 'ledger' },
  { id: 'pastel', label: 'Couleurs pastel', words: /pastel|doux|soft/i },
  { id: 'dark', label: 'Ambiance sombre', words: /sombre|dark|nuit|night|noir/i },
  { id: 'neon', label: 'Néon, lueurs', words: /n[ée]on|glow|lueur|cyber/i },
  { id: 'minimal', label: 'Minimaliste', words: /minimal|[ée]pur[ée]|sobre|clean/i },
  { id: '3d', label: 'Vraie 3D (caméra libre, volumes)', words: /\b3d\b|three\.?js|webgl|volum|cam[ée]ra/i, needsB: 'Rendu 3D temps réel (Three.js/WebGL) : nouveau moteur de rendu, coût graphique élevé' },
  { id: 'pixel', label: 'Pixel art, sprites', words: /pixel|sprite|8.?bit|16.?bit|r[ée]tro/i, needsB: 'Jeu de sprites animés et rendu Canvas/PixiJS' },
  { id: 'globe', label: 'Globe, géographie', words: /globe|monde|world|g[ée]o|terre/i, needsB: 'Projection géographique : composants cartographiques dédiés' },
  { id: 'kanban', label: 'Kanban, colonnes de tâches', words: /kanban|colonne|trello|board/i, needsB: 'Disposition en colonnes avec glisser-déposer de tâches' },
  { id: 'org', label: 'Organigramme', words: /organigramme|org.?chart|hi[ée]rarchie/i, needsB: 'Mise en page arborescente automatique' },
  { id: 'game', label: 'Mécaniques de jeu', words: /jeu|game|ludique|gamif/i, needsB: 'Boucle de jeu et état propre à l’expérience (hors données métier)' },
];

const urlType = (u: string) => {
  try {
    const h = new URL(u).hostname.replace(/^www\./, '');
    if (/pinterest\./.test(h) || h === 'pin.it') return 'Pinterest';
    if (/figma\.com$/.test(h)) return 'Figma';
    if (/youtube\.com$|youtu\.be$|vimeo\.com$|loom\.com$/.test(h)) return 'Vidéo en ligne';
    if (/dribbble\.com$|behance\.net$/.test(h)) return 'Portfolio design';
    return 'Site internet';
  } catch {
    return null;
  }
};

async function analyzeImage(src: string): Promise<{ palette: Array<{ hex: string; share: number }> }> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  const s = Math.min(1, 220 / Math.max(img.naturalWidth || 220, img.naturalHeight || 220));
  c.width = Math.max(1, Math.round((img.naturalWidth || 220) * s));
  c.height = Math.max(1, Math.round((img.naturalHeight || 220) * s));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { palette: extractPalette(ctx.getImageData(0, 0, c.width, c.height).data, 7) };
}

async function videoFrame(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.src = url;
  await new Promise<void>((res, rej) => {
    v.onloadeddata = () => res();
    v.onerror = () => rej(new Error('vidéo illisible'));
  });
  v.currentTime = Math.min(1, (v.duration || 2) / 2);
  await new Promise<void>((res) => (v.onseeked = () => res()));
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = Math.round((320 * v.videoHeight) / Math.max(1, v.videoWidth));
  c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg', 0.8);
}

/** Builds a theme from a palette, enforcing readable contrast. */
function themeFromPalette(colors: string[], dark: boolean, base: Theme): Theme {
  const t = structuredClone(base);
  const rgb = colors.map((c) => ({ c, rgb: hexToRgb(c)! })).filter((x) => x.rgb);
  const byLum = [...rgb].sort((a, b) => luminance(a.rgb) - luminance(b.rgb));
  const vivid = [...rgb].sort((a, b) => saturation(b.rgb) - saturation(a.rgb));
  const paper = dark ? byLum[0]?.c ?? t.colors.paper : byLum[byLum.length - 1]?.c ?? t.colors.paper;
  t.scheme = dark ? 'dark' : 'light';
  t.colors.paper = dark ? mix(paper, '#0b1220', 0.35) : mix(paper, '#ffffff', 0.55);
  t.colors.raised = dark ? mix(t.colors.paper, '#ffffff', 0.06) : mix(t.colors.paper, '#ffffff', 0.7);
  t.colors.sunken = dark ? mix(t.colors.paper, '#000000', 0.2) : mix(t.colors.paper, '#16203a', 0.05);
  const candidateInk = dark ? byLum[byLum.length - 1]?.c ?? '#e7edf6' : byLum[0]?.c ?? '#16203a';
  t.colors.ink = (contrast(candidateInk, t.colors.paper) ?? 0) >= 7 ? candidateInk : dark ? '#E7EDF6' : '#16203A';
  t.colors.inkSoft = mix(t.colors.ink, t.colors.paper, 0.22);
  t.colors.inkMuted = mix(t.colors.ink, t.colors.paper, 0.4);
  if ((contrast(t.colors.inkMuted, t.colors.raised) ?? 0) < 4.5) t.colors.inkMuted = mix(t.colors.ink, t.colors.paper, 0.3);
  t.colors.line = mix(t.colors.ink, t.colors.paper, dark ? 0.7 : 0.75);
  t.colors.grid = mix(t.colors.ink, t.colors.paper, 0.9);
  t.colors.gridMajor = mix(t.colors.ink, t.colors.paper, 0.84);
  const accent = vivid.find((x) => (contrast(x.c, t.colors.paper) ?? 0) >= 3)?.c ?? t.colors.accent;
  t.colors.accent = accent;
  t.colors.focus = accent;
  t.colors.accentInk = (contrast('#ffffff', accent) ?? 0) >= 4.5 ? '#FFFFFF' : '#0B1220';
  const slots = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'] as const;
  const src = vivid.length ? vivid : rgb;
  slots.forEach((s, i) => {
    const c = src[i % Math.max(1, src.length)]?.c;
    if (c) t.pastel[s] = mix(c, t.colors.paper, dark ? 0.55 : 0.68);
  });
  return t;
}

export function Builder({ entries, quality }: { entries: RegistryEntry[]; quality: QualitySettings }) {
  const [refs, setRefs] = useState<Ref[]>([]);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [charter, setCharter] = useState('');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | File[]) => {
    setBusy(true);
    for (const f of [...files].slice(0, 12)) {
      const id = `${f.name}-${f.size}-${Date.now()}`;
      try {
        if (f.size > 25_000_000) throw new Error('fichier trop volumineux (25 Mo max)');
        if (f.type.startsWith('image/')) {
          const preview = URL.createObjectURL(f);
          const { palette } = await analyzeImage(preview);
          setRefs((r) => [...r, { id, kind: f.type === 'image/svg+xml' ? 'svg' : 'image', name: f.name, preview, palette }]);
        } else if (f.type.startsWith('video/')) {
          const preview = await videoFrame(f);
          const { palette } = await analyzeImage(preview);
          setRefs((r) => [...r, { id, kind: 'video', name: f.name, preview, palette, note: 'Analyse d’une image extraite à mi-parcours ; les animations ne sont pas analysées automatiquement.' }]);
        } else {
          setRefs((r) => [...r, { id, kind: 'file', name: f.name, note: /\.(fig|pdf|glb|gltf|obj)$/i.test(f.name) ? 'Format conservé comme référence : lecture automatique non prise en charge ici (export PNG ou lien Figma recommandé).' : 'Format non analysé.' }]);
        }
      } catch (e) {
        toast(`${f.name} : ${(e as Error).message}`, 'denied');
      }
    }
    setBusy(false);
  };

  const addUrl = () => {
    const t = urlType(url.trim());
    if (!t) return toast('Lien invalide.', 'denied');
    setRefs((r) => [...r, { id: `u-${Date.now()}`, kind: 'url', name: url.trim(), urlType: t, note: t === 'Figma' ? 'Lisible via le connecteur Figma côté moteur opérationnel (non appelé ici).' : 'Non récupéré : la page n’est pas téléchargée sans votre accord.' }]);
    setUrl('');
  };

  const analysis = useMemo(() => {
    const colors = refs.flatMap((r) => r.palette ?? []);
    const merged = new Map<string, number>();
    for (const c of colors) merged.set(c.hex, (merged.get(c.hex) ?? 0) + c.share);
    const palette = [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([hex]) => hex);
    const lum = colors.length ? colors.reduce((s, c) => s + luminance(hexToRgb(c.hex)!) * c.share, 0) / colors.reduce((s, c) => s + c.share, 0) : null;
    const sat = colors.length ? colors.reduce((s, c) => s + saturation(hexToRgb(c.hex)!) * c.share, 0) / colors.reduce((s, c) => s + c.share, 0) : null;
    const corpus = `${text} ${charter} ${refs.map((r) => r.name).join(' ')}`;
    const traits = TRAITS.filter((t) => t.words.test(corpus));
    if (lum != null && lum < 0.25 && !traits.some((t) => t.id === 'dark')) traits.push(TRAITS.find((t) => t.id === 'dark')!);
    if (sat != null && sat < 0.35 && lum != null && lum > 0.6 && !traits.some((t) => t.id === 'pastel')) traits.push(TRAITS.find((t) => t.id === 'pastel')!);
    const needsB = traits.filter((t) => t.needsB);
    const engines = traits.map((t) => t.engine).filter(Boolean) as string[];
    const engine = engines.sort((a, b) => engines.filter((x) => x === b).length - engines.filter((x) => x === a).length)[0] ?? (traits.some((t) => t.id === 'iso') ? 'ai-office' : 'control-center');
    const dark = traits.some((t) => t.id === 'dark');
    const theme = palette.length ? themeFromPalette(palette, dark, dark ? BUILTIN_THEMES[1] : BUILTIN_THEMES[0]) : null;
    const interpret: string[] = [];
    if (!traits.some((t) => ['iso', '3d', 'pixel'].includes(t.id))) interpret.push('Perspective non déterminée : précisez-la (isométrique, plate, 3D).');
    if (refs.some((r) => r.kind === 'url')) interpret.push('Liens non téléchargés : leurs éléments ne sont pas pris en compte dans la palette.');
    if (refs.some((r) => r.kind === 'video')) interpret.push('Animations des vidéos : à décrire en texte (rythme, déclencheurs).');
    if (!text.trim()) interpret.push('Aucune description textuelle : interactions et navigation non déduites.');
    return { palette, lum, sat, traits, needsB, engine, theme, interpret, category: needsB.length ? ('B' as const) : ('A' as const) };
  }, [refs, text, charter]);

  const baseEntry = entries.find((e) => e.id === analysis.engine) ?? entries[0];
  const previewVars = useMemo(() => (analysis.theme ? (themeToCssVars(analysis.theme) as CSSProperties) : undefined), [analysis.theme]);
  const ready = refs.length > 0 || text.trim().length > 10;

  const createVariant = () => {
    if (!analysis.theme) return toast('Ajoutez au moins une image pour proposer une palette.', 'denied');
    const label = name.trim() || `Direction ${new Date().toLocaleDateString('fr-FR')}`;
    const id = `ref-${Date.now().toString(36)}`;
    const v = validateTheme({ ...analysis.theme, id, name: label.slice(0, 40) });
    if (!v.ok) return toast(`Thème refusé : ${v.error}`, 'denied');
    setPrefs((p) => {
      const r = ops.duplicate({ ...p, customThemes: [...p.customThemes, v.theme] }, baseEntry, label);
      return { ...r.prefs, variants: r.prefs.variants.map((x) => (x.id === r.id ? { ...x, themeId: v.theme.id, description: `Direction artistique issue de ${refs.length} référence(s), moteur ${baseEntry.manifest.name}.` } : x)) };
    });
    toast('Variante créée en brouillon. Elle sera visible après validation dans la galerie.');
    ui.set({ route: 'gallery' });
  };

  const brief = useMemo(() => buildBrief({ ...analysis, refs, text, charter, baseName: baseEntry.manifest.name }), [analysis, refs, text, charter, baseEntry]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <p className="t-muted" style={{ margin: '4px 0 0', maxWidth: '70ch' }}>
            Déposez des références : l’analyse locale propose une direction artistique. Une image ne devient pas automatiquement une interface fonctionnelle :
            si un nouveau moteur est nécessaire, vous obtenez un brief d’implémentation.
          </p>
        </div>
      </div>
      <div className="page__body split">
        <div style={{ display: 'grid', gap: 14 }}>
          <section className="panel" style={{ padding: 14 }} aria-label="Références">
            <h2 className="t-h3" style={{ marginBottom: 8 }}>
              1. Références
            </h2>
            <div
              className="dropzone"
              data-over={over}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                void addFiles(e.dataTransfer.files);
              }}
            >
              <IconUpload size={22} />
              <p style={{ margin: '6px auto' }}>Images, captures, SVG, vidéos, maquettes exportées</p>
              <button type="button" className="btn btn--sm" onClick={() => fileInput.current?.click()} disabled={busy}>
                {busy ? 'Analyse…' : 'Choisir des fichiers'}
              </button>
              <input ref={fileInput} type="file" multiple hidden accept="image/*,video/*,.svg,.fig,.pdf,.glb,.gltf" onChange={(e) => e.target.files && void addFiles(e.target.files)} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <label className="sr-only" htmlFor="b-url">Lien de référence</label>
              <input id="b-url" className="input" style={{ flex: 1 }} placeholder="Lien Pinterest, Figma, site, vidéo…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addUrl()} />
              <button type="button" className="btn" onClick={addUrl}>
                Ajouter
              </button>
            </div>
            <label className="field" style={{ marginTop: 10 }}>
              <span>Description (style, perspective, ambiance, interactions)</span>
              <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex. bureau isométrique pastel, contours fins, flux animés entre les pièces…" />
            </label>
            <label className="field" style={{ marginTop: 10 }}>
              <span>Charte graphique (facultatif)</span>
              <textarea className="input" rows={2} value={charter} onChange={(e) => setCharter(e.target.value)} placeholder="Couleurs, typographies, règles d’usage…" />
            </label>
            {refs.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 8 }}>
                {refs.map((r) => (
                  <li key={r.id} style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 56, height: 40, borderRadius: 4, border: 'var(--stroke) solid var(--c-line)', background: r.preview ? `center / cover no-repeat url("${r.preview}")` : 'var(--c-sunken)' }} aria-hidden />
                    <div style={{ minWidth: 0 }}>
                      <div className="t-small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.urlType ? `${r.urlType} · ` : ''}
                        {r.name}
                      </div>
                      {r.palette && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
                          {r.palette.map((c) => (
                            <i key={c.hex} title={c.hex} style={{ width: 14, height: 10, borderRadius: 2, background: c.hex, border: '1px solid var(--c-line)' }} />
                          ))}
                        </div>
                      )}
                      {r.note && <div className="t-micro t-muted">{r.note}</div>}
                    </div>
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => setRefs((x) => x.filter((y) => y.id !== r.id))} aria-label={`Retirer ${r.name}`}>
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel" style={{ padding: 14 }} aria-label="Analyse">
            <h2 className="t-h3" style={{ marginBottom: 8 }}>
              2. Analyse locale
            </h2>
            {!ready ? (
              <p className="t-muted">Ajoutez une référence ou une description pour lancer l’analyse.</p>
            ) : (
              <>
                {analysis.palette.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {analysis.palette.map((c) => (
                      <div key={c} style={{ flex: 1, height: 28, borderRadius: 4, background: c, border: '1px solid var(--c-line)' }} title={c} />
                    ))}
                  </div>
                )}
                <dl className="kv">
                  <dt>Luminosité</dt>
                  <dd>{analysis.lum == null ? 'Non mesurée (aucune image)' : analysis.lum > 0.55 ? 'Claire' : analysis.lum < 0.25 ? 'Sombre' : 'Intermédiaire'}</dd>
                  <dt>Saturation</dt>
                  <dd>{analysis.sat == null ? '—' : analysis.sat < 0.35 ? 'Douce (pastel)' : analysis.sat > 0.6 ? 'Vive' : 'Modérée'}</dd>
                  <dt>Caractéristiques</dt>
                  <dd>{analysis.traits.length ? analysis.traits.map((t) => t.label).join(', ') : 'Aucune détectée'}</dd>
                  <dt>Moteur le plus proche</dt>
                  <dd>{baseEntry.manifest.name}</dd>
                </dl>
                {analysis.interpret.length > 0 && (
                  <>
                    <h3 className="section-title">À interpréter ou préciser</h3>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.86rem' }}>
                      {analysis.interpret.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  </>
                )}
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="btn btn--sm" disabled title="Analyse par un modèle vision : dépense à arbitrer">
                    <IconLock size={14} /> Analyse approfondie par IA
                  </button>
                  <p className="t-micro t-muted" style={{ marginTop: 4 }}>
                    Engagerait des tokens (modèle vision) : elle passera par une proposition GO / NO GO / TEST lorsque le moteur opérationnel sera connecté.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>

        <section className="panel" style={{ padding: 14, display: 'grid', gap: 12 }} aria-label="Proposition">
          <h2 className="t-h3">3. Proposition</h2>
          {!ready ? (
            <p className="t-muted">La proposition apparaîtra ici.</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`pill ${analysis.category === 'A' ? 'pill--risk-low' : 'pill--risk-medium'}`}>
                  Catégorie {analysis.category} — {analysis.category === 'A' ? 'nouveau thème sur un moteur existant' : 'nouvelle expérience à développer'}
                </span>
              </div>
              {analysis.category === 'B' && (
                <Notice tone="warn" icon={<IconInfo size={16} />}>
                  Développements nécessaires :
                  <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                    {analysis.needsB.map((n) => (
                      <li key={n.id}>{n.needsB}</li>
                    ))}
                  </ul>
                  En attendant, un thème proche peut être appliqué au moteur « {baseEntry.manifest.name} ».
                </Notice>
              )}
              {previewVars ? (
                <div className="studio-preview surface-plan" style={{ ...previewVars, height: 360, fontFamily: 'var(--font-ui)', color: 'var(--c-ink)' }}>
                  <ExperienceHost entry={baseEntry} quality={quality} clock={clock} previewKey="builder-preview" />
                </div>
              ) : (
                <p className="t-small t-muted">Ajoutez au moins une image pour générer la palette et l’aperçu.</p>
              )}
              <label className="field">
                <span>Nom de la direction artistique</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ex. Bureau pastel" />
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn--primary" onClick={createVariant} disabled={!analysis.theme}>
                  Créer la variante (à valider)
                </button>
                <button type="button" className="btn" onClick={() => void navigator.clipboard?.writeText(brief).then(() => toast('Brief copié.'))}>
                  <IconCopy size={15} /> Copier le brief
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([brief], { type: 'text/markdown' }));
                    a.download = 'brief-experience.md';
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  <IconDownload size={15} /> Télécharger le brief
                </button>
              </div>
              <details>
                <summary className="t-small" style={{ cursor: 'pointer' }}>
                  Voir le brief d’implémentation
                </summary>
                <pre className="mono" style={{ whiteSpace: 'pre-wrap', fontSize: '0.78rem', background: 'var(--c-sunken)', padding: 10, borderRadius: 6, maxHeight: 320, overflow: 'auto' }}>
                  {brief}
                </pre>
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function buildBrief(a: {
  category: 'A' | 'B';
  palette: string[];
  traits: Array<{ label: string; needsB?: string }>;
  needsB: Array<{ needsB?: string }>;
  interpret: string[];
  refs: Ref[];
  text: string;
  charter: string;
  baseName: string;
}) {
  const renderer = a.traits.some((t) => /3D/.test(t.label)) ? 'WebGL (Three.js), chargé uniquement pour cette expérience' : a.traits.some((t) => /Pixel/.test(t.label)) ? 'Canvas 2D (ou PixiJS si > 500 sprites animés)' : 'SVG (comme les scènes isométriques existantes)';
  return `# Brief — nouvelle expérience visuelle

## Catégorie
${a.category === 'A' ? `A — thème appliqué au moteur existant « ${a.baseName} ». Aucun code nécessaire.` : 'B — nouveaux composants ou nouveau moteur de rendu nécessaires.'}

## Références (${a.refs.length})
${a.refs.map((r) => `- ${r.kind}${r.urlType ? ` (${r.urlType})` : ''} : ${r.name}`).join('\n') || '- aucune'}
${a.text ? `\nDescription : ${a.text}` : ''}${a.charter ? `\nCharte : ${a.charter}` : ''}

## Direction artistique
- Palette : ${a.palette.join(', ') || 'à définir'}
- Caractéristiques : ${a.traits.map((t) => t.label).join(', ') || 'à préciser'}

## À interpréter / préciser
${a.interpret.map((i) => `- ${i}`).join('\n') || '- rien'}

${a.category === 'B' ? `## Développements nécessaires
${a.needsB.map((n) => `- ${n.needsB}`).join('\n')}

## Implémentation proposée
- Dossier : src/experiences/<id>/ ; entrée unique dans src/experiences/index.ts (manifeste + chargement différé).
- Moteur de rendu : ${renderer}.
- Données : uniquement via le SDK (useGovernor, useCatalogIndex, recentFlows, host.select, host.request). Aucun accès direct au store ni aux sources.
- États animés : dérivés exclusivement de AgentRuntime.status ; aucune activité simulée.
- Paramètres graphiques déclarés dans le manifeste (exposés au Studio).
- Accessibilité : éléments focusables, résumé pour lecteur d’écran, mode sans animation.
- Performance : budget de bascule < 150 ms après chargement, aucune boucle d’animation propre (horloge partagée), mise en veille respectée.
- Effort estimé : ${a.needsB.length > 1 ? 'L (1 à 2 semaines)' : 'M (3 à 5 jours)'} — hypothèse à confirmer après maquette.

## Critères d’acceptation
- Le test de frontières d’import passe (imports limités à @sdk, @ds, react).
- Les tests e2e de bascule, d’accessibilité (axe) et de performance passent.
- Validation par le propriétaire (GO / NO GO / TEST) avant publication.
` : ''}`;
}
