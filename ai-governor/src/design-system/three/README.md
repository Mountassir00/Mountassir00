# Kit 3D (`@ds/three`)

Kit Three.js 0.187 partagé par les vues 3D (espace spatial, bureau 3D, éditeur spatial, tour de nuit, QG, constellation).
Il n'est **pas** exporté par `@ds` : `import { … } from '@ds/three'` ne charge Three.js (~600 ko) qu'avec les vues qui l'utilisent.
Une expérience ne peut pas importer `three` directement (test de frontières) : tout passe par ce module, qui réexporte l'espace
de noms `THREE` (`import { THREE } from '@ds/three'`).

Esthétique visée : « jouet de designer » brillant sur sol très clair (sombre en Onyx/Nexus), robots à visière sombre et yeux cyan
sur anneaux lumineux, coffre en métal brossé, panneaux de verre à bord lumineux, bureau en bois, portique, tubes de flux translucides.

## Démarrage rapide

```tsx
import { ThreeStage, buildSpatialScene, createRobot, setRobotStatus, useSpatialLayout, hueColor, type Stage3D } from '@ds/three';

function MaVue({ host, quality }: ExperienceProps) {
  const { layout } = useSpatialLayout(host);              // document partagé, modifiable par l'éditeur spatial
  const { catalog, state } = useGovernor();
  const [stage, setStage] = useState<Stage3D | null>(null);

  useEffect(() => {                                         // construction (dépend du layout / catalogue)
    if (!stage) return;
    stage.clearContent();
    const scene = buildSpatialScene(stage, layout, { catalog });   // pièce + primitives + picking + ombres, géométrie statique fusionnée
    const robot = createRobot(stage.kit, { color: hueColor(250), accessory: 'visor' });
    robot.position.copy(scene.byDepartment.get('executive')!.spots[0].p);
    stage.root.add(robot);
    stage.picker.add(robot, { kind: 'agent', id: 'governor' });
    return stage.addAnimator((t) =>                         // appelé à chaque image rendue ; true = « encore une image »
      setRobotStatus(robot, state.agents.governor?.status ?? 'idle', t, {
        figure: stage.amplitude('figure'), indicator: stage.amplitude('indicator'),
      }));
  }, [stage, layout, catalog]);

  return (
    <ThreeStage quality={quality} label="Bureau 3D" onStage={setStage}
      onClick={(hit) => hit && host.select(hit.selection)}>
      {(st) => <SceneLabels stage={st} labels={…} onSelect={(sel) => host.select(sel)} />}
    </ThreeStage>
  );
}
```

## Scène et rendu — `stage.ts`, `ThreeStage.tsx`

| API | Rôle |
|---|---|
| `<ThreeStage quality label help? camera? environment? onStage onHover onClick onPalette fallback children>` | Crée/détruit le `Stage3D`, suit qualité et thème, message de repli si WebGL indisponible ou contexte perdu. `children` peut être une fonction `(stage) => overlays`. |
| `new Stage3D(container, { quality, palette?, camera?, label?, describedBy?, environment? })` | Cœur impératif (utilisable sans React). |
| `stage.renderer / scene / camera / rig / picker / kit / root / contact` | `root` = votre contenu (vidé par `clearContent()`), `contact` = ombres de contact instanciées (1 appel de rendu). |
| `stage.invalidate()` | Demande UNE image (coalescée). Rendu à la demande : aucune boucle permanente. |
| `stage.addAnimator((t, dt, stage) => boolean)` | Appelé à chaque image ; retourner `true` demande l'image suivante. |
| `stage.amplitude('figure' \| 'indicator' \| 'flow')` | 0…1 selon `quality.motion` et la suspension : `none` → 0 ; `state` (éco) → seulement pendant `burst()` ; `subtle` (standard) → indicateurs et flux, corps immobiles ; `ambient` (haute) → tout. 0 si `quality.suspended`, `html[data-anim=paused]` ou onglet masqué. |
| `stage.burst(ms)` | Courte fenêtre d'animation après un VRAI changement d'état (seul mouvement autorisé en éco). |
| `stage.onFrame(fn)` | Après chaque image (étiquettes HTML, mini-carte). |
| `stage.project(vec3)` | → `{ x, y, visible, depth }` en px CSS du canvas. |
| `stage.setHalo('hover' \| 'select', object \| null)` | Halo lumineux au sol (survol / sélection). |
| `stage.setShadowBounds(box)` / `updateShadows()` | Ombres portées calculées une fois par construction (`shadowMap.autoUpdate = false`). |
| `stage.stats()` | `calls`, `triangles`, `geometries`, `textures`, `msPerFrame`, `kitTextureBytes`, `pixelRatio`, `shadows`, `environment`, `looping`. |
| `stage.dispose()` | Libère géométries, matériaux, textures, PMREM, ombres, renderer, écouteurs, observateurs. |

Qualité : ratio de pixels plafonné (minimal/éco 1, standard 1,5, haute 2) ; ombres et environnement PMREM (`RoomEnvironment`)
seulement en standard/haute ; textures procédurales (grain du bois, écrans) désactivées en minimal/éco ; fps plafonné par
`quality.fpsCap` avec minuterie (le processeur dort vraiment entre deux images). En **minimal** : une image fixe, rendue à
nouveau seulement sur interaction ou changement de données. En **éco** : mouvement seulement pendant `burst()`.

## Caméra — `camera.ts`

`stage.rig` (`CameraRig`) : orbite / déplacement / zoom amortis.
Souris : glisser = tourner, clic droit / Maj + glisser = déplacer, molette = zoom vers le curseur. Pavé tactile : pincer = zoom,
balayage horizontal = déplacer. Tactile : 1 doigt = tourner, 2 doigts = pincer + déplacer. Clavier (canvas focalisé) : flèches,
Maj + flèches, `+` `−` `0`. Un geste qui a bougé n'est **jamais** un clic (`onTap` seulement si immobile).
`rig.focusOn(vec3 | object | box, { distance? })`, `rig.fit(box)`, `rig.reset()`, `rig.setView({ target, distance, azimuth, polar })`,
`rig.setHome(view)`, `rig.opts.{ minDistance, maxDistance, minPolar, maxPolar, bounds, damping, tweenMs }`.
Préréglages : `CAMERA_PRESETS.iso | top | low | front`. Perspective à faible focale (iso-like) par défaut ;
`camera: { projection: 'orthographic' }` pour une vraie vue orthographique 3/4.

## Sélection — `picking.ts`

`stage.picker.add(object, { kind: 'agent' | 'node' | 'department', id }, pad?)` crée une boîte invisible (jamais rendue) attachée à
l'objet : elle le suit et reste valable après fusion de la géométrie statique (**appeler `add` avant `bakeStatic`**).
`ThreeStage.onHover(hit)` (curseur main + halo automatiques) et `onClick(hit, event)` avec `hit.selection` → `host.select(...)`.
`picker.find(selection)` retrouve l'objet (halo de sélection).

## Matériaux — `materials.ts` (`stage.kit`)

Tout est mis en cache par clé et partagé : `kit.plastic(color, { roughness?, clearcoat? })`, `kit.matte(color)`,
`kit.metal('brushed' | 'dark' | 'chrome')` (anisotropie brossée), `kit.glass(tint, opacity)`, `kit.wood('walnut' | 'oak')`,
`kit.emissive(color)`, `kit.glowDisc(color, strength)` / `kit.glowRing(color, strength)` (halo additif en sombre, normal en clair),
`kit.vertexPlastic()` (couleurs par sommet), `kit.screen()` (écran de code), `kit.line(color)`.
Géométries partagées : `kit.roundedBox / box / cylinder / sphere / capsule / torus / plane / disc`.
`kit.themedMaterial(key, make, apply)` : matériau re-teinté en place au changement de thème. `kit.textureBytes` = budget textures.

## Fabriques — `figures.ts`, `props.ts`, `flows.ts`

Toutes prennent `kit` en premier argument, sont centrées au sol et regardent +Z (mètres).

- Figures (le statut est la SEULE source d'animation) :
  `createRobot(kit, { color, accessory?, scale? })` (agent LLM : visière + yeux cyan, anneau) ;
  `setRobotStatus(robot, status, t, { figure?, indicator?, partner? })` — working : frappe au clavier ; waiting : balancement ;
  collaborating : salue vers `partner` ; researching : tête qui balaie ; validating : hoche la tête ; error : yeux rouges qui
  clignotent 3 fois puis fixes ; paused/idle/offline : immobile, anneau atténué. Amplitude 0 = pose fixe qui reste lisible.
  `createConsole(kit, { color })` (script déterministe, sans visage), `createDrone(kit, { color })` (service, sans visage),
  `setDeviceStatus(device, status, t, motion)`, `createPerson(kit, { color, pose: 'stand' | 'sit' })`,
  `createGlowRing(kit, color)` / `setGlowRing(ring, color, strength)`.
- Mobilier : `createDesk(kit, { laptop?, monitors?, chair?, plant?, mug? })` (`userData.seat`), `createChair`, `createVault`,
  `createGate` (`userData.light`), `createGlassBoard(kit, { width, height, drawTexture(ctx, w, h, palette), textureWidth?, edgeGlow?, opacity?, stand? })`
  → `board.userData.redraw(draw?)` redessine la `CanvasTexture` à partir de données réelles, `createPlant(kit, { size })`,
  `createArmchair`, `createSofa`, `createSideTable`, `createPlatform(kit, { radius, color })`, `createEquipment(kit, kind, tone)`
  (`server | database | antenna | gauge | lab | conveyor | router | shield | archive | meeting | board | desk`), `createModelHub`.
- Pièce : `createRoom(kit, { width, depth, height?, walls: 'none' | 'back' | 'all', gridSize, outline?, ground? })` — dalle, grille
  antialiasée (shader `fwidth`), contour lumineux et bornes d'angle, sol infini estompé.
- Flux : `new FlowNetwork(palette)` → `net.set([{ id, points, color, active, level? }])` fusionne tous les tubes en **2 maillages**
  (actifs / inactifs) ; `net.update(t, stage.amplitude('flow'))` fait avancer les impulsions seulement si le flux est actif et que la
  qualité l'autorise. `routeBetween(a, b, { bend? })` trace une courbe douce au ras du sol. `createFlowTube(kit, points, color)` pour un tube isolé.

## Étiquettes HTML — `labels.tsx`

`<SceneLabels stage labels={[{ id, position | () => position, title, subtitle?, status?, count?, priority?, selection?, selected? }]} onSelect farDistance avoid?>` :
pastilles nettes (HTML), cliquables et focalisables, point de statut (`--st-*`), compteur en direct. Positions écrites dans le DOM
après chaque image (aucun rendu React par image). Masquées derrière la caméra / hors champ, élaguées au zoom lointain
(priorité < 2) et en cas de chevauchement (la plus prioritaire gagne), gardées hors des surcouches passées dans `avoid`.
`<Anchored stage position>` positionne n'importe quel contenu (carte de survol) sur un point 3D.

## Document d'implantation partagé — `layout.ts`

`SpatialLayout = { version: 1, name, room: { width, depth, height, walls }, gridSize, snap, primitives: SpatialPrimitive[] }`.
`SpatialPrimitive = { id, kind, name, subtitle?, position, rotation, scale, material, color?, opacity, edgeGlow, binding: { kind: 'department' | 'node', id } | null, represents?, equipment?, label?, tags? }`.
Coordonnées **plan** : `x` largeur, `y` profondeur (0 = fond), `z` altitude ; `rotation.z` = degrés autour de la verticale ;
pour les panneaux (`kanban`, `whiteboard`, `board`) `scale.x/scale.y` = largeur/hauteur en mètres.
`DEFAULT_SPATIAL_LAYOUT` (18 × 14 m, grille 0,5 m) est lié au catalogue de démo : coffre ↔ archives / journal d'événements,
portique ↔ cybersécurité, mur kanban ↔ file des tâches, tableau blanc ↔ audit des consignes, Bureau 01 ↔ direction (Gouverneur,
« Vous »), salle des modèles ↔ fournisseur et modèles, un poste par autre département.
`useSpatialLayout(host)` → `{ layout, setLayout, resetLayout, isCustom }` lit/écrit `host.getShared('spatial-layout')` ;
`normalizeLayout(raw)` valide et borne un document ; `reconcileLayout(layout, catalog)` ajoute un poste pour tout département
non lié (catalogue importé) ; `planToWorld` / `worldToPlan` / `snapTo`.

## Construction d'une scène — `build.ts`

`buildSpatialScene(stage, layout, { catalog, bake?, pickable?, drawBoard?, boardTextureWidth?, simplified? })` → `SpatialScene` :
`prims` (objet, centre, ancre d'étiquette, `spots` pour agents avec orientation, `deviceSpot`, `seat`, `board`, `footprint`, `tone`),
`byDepartment`, `byNode`, `resolve(id)` (département, nœud, agent → poste ; modèles → salle des modèles ; MCP → connecteurs ;
skills → labo ; bases → coffre ; files → kanban), `bounds`, `bake` (rapport de fusion). L'éditeur spatial construit avec
`bake: false` pour déplacer les primitives une à une.

## Performance — `optimize.ts`

`bakeStatic(root)` fusionne les maillages `userData.static` par matériau, et **par famille** (`material.userData.family` :
plastiques, mats et émissifs qui ne diffèrent que par la couleur → un seul maillage à couleurs par sommet).
`mergeParts(parts)` / `mergeColoredParts(groups)` pour composer une pièce en un appel de rendu. `markStatic(obj)`.
Mesures de la scène par défaut (« Espace spatial », démo, 1440 × 900, SwiftShader) : ≈ 90–97 appels de rendu, ≈ 140 k triangles,
textures de contenu ≈ 0,7 Mo. Hors budget « textures » : PMREM de l'environnement (cube 256², ≈ 4 Mo, minimum imposé par
Three 0.187, standard/haute seulement) et carte d'ombres 1024² / 2048².

## Thème — `theme.ts`

`readScenePalette()` lit les jetons CSS (`--c-*`, `--st-*`, `--p1…p8`) ; `observeTheme(cb)` ; `useScenePalette()` ;
`hueColor(hue)` / `hueCss(hue, scheme)` pour les couleurs d'avatar. Le sol, la dalle, la grille, les halos et le verre suivent
Lumière / Onyx / Nexus ; une vue qui teinte à la construction (plateformes, équipements) reconstruit au changement de palette.
