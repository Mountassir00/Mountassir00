// EVENT LAB — validateur JSON Schema minimal (sous-ensemble utilisé par schemas/*.json)
// Gère : type (y compris tableaux de types), required, multipleOf, properties, patternProperties, additionalProperties:false,
// items, enum, const, pattern, minimum, maximum, minItems, maxItems, $ref local (#/$defs/…) et inter-fichiers (nom.schema.json).
// Volontairement sans dépendance : suffisant pour contrôler les fichiers du dépôt et les imports de l'application.

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const matchesType = (v, t) => (t === 'number' ? typeof v === 'number' : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t || (t === 'number' && typeOf(v) === 'integer'));

/**
 * @param {object} schema schéma racine
 * @param {any} data
 * @param {Record<string, object>} [registry] schémas annexes indexés par nom de fichier (ex. 'venue.schema.json')
 * @returns {{ valid: boolean, errors: Array<{path:string, message:string}> }}
 */
export function validate(schema, data, registry = {}) {
  const errors = [];
  const resolve = (ref, root) => {
    if (ref.startsWith('#/')) return { node: ref.slice(2).split('/').reduce((o, k) => o?.[k], root), root };
    const [file, frag] = ref.split('#');
    const ext = registry[file];
    if (!ext) return { node: null, root };
    return frag ? { node: frag.slice(1).split('/').reduce((o, k) => o?.[k], ext), root: ext } : { node: ext, root: ext };
  };
  const walk = (s, v, p, root) => {
    if (!s || typeof s !== 'object') return;
    if (s.$ref) {
      const r = resolve(s.$ref, root);
      if (!r.node) { errors.push({ path: p, message: `Référence introuvable : ${s.$ref}` }); return; }
      walk(r.node, v, p, r.root);
      return;
    }
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      if (!types.some((t) => matchesType(v, t))) { errors.push({ path: p, message: `Type attendu ${types.join('|')}, reçu ${typeOf(v)}` }); return; }
    }
    if (s.enum && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))) errors.push({ path: p, message: `Valeur « ${v} » hors liste : ${s.enum.join(', ')}` });
    if ('const' in s && JSON.stringify(s.const) !== JSON.stringify(v)) errors.push({ path: p, message: `Valeur attendue ${JSON.stringify(s.const)}` });
    if (typeof v === 'string' && s.pattern && !new RegExp(s.pattern).test(v)) errors.push({ path: p, message: `« ${v} » ne respecte pas le motif ${s.pattern}` });
    if (typeof v === 'number') {
      if (typeof s.minimum === 'number' && v < s.minimum) errors.push({ path: p, message: `${v} < minimum ${s.minimum}` });
      if (typeof s.maximum === 'number' && v > s.maximum) errors.push({ path: p, message: `${v} > maximum ${s.maximum}` });
      if (typeof s.multipleOf === 'number' && Math.abs(v / s.multipleOf - Math.round(v / s.multipleOf)) > 1e-9) errors.push({ path: p, message: `${v} n'est pas un multiple de ${s.multipleOf}` });
    }
    if (Array.isArray(v)) {
      if (typeof s.minItems === 'number' && v.length < s.minItems) errors.push({ path: p, message: `Au moins ${s.minItems} élément(s) attendu(s)` });
      if (typeof s.maxItems === 'number' && v.length > s.maxItems) errors.push({ path: p, message: `Au plus ${s.maxItems} élément(s)` });
      if (s.items) v.forEach((x, i) => walk(s.items, x, `${p}/${i}`, root));
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const k of s.required ?? []) if (!(k in v)) errors.push({ path: p, message: `Champ requis manquant : ${k}` });
      for (const [k, sub] of Object.entries(s.properties ?? {})) if (k in v) walk(sub, v[k], `${p}/${k}`, root);
      if (s.patternProperties) {
        for (const [pat, sub] of Object.entries(s.patternProperties)) {
          const re = new RegExp(pat);
          for (const k of Object.keys(v)) if (re.test(k)) walk(sub, v[k], `${p}/${k}`, root);
        }
      }
      if (s.additionalProperties === false) {
        const allowed = new Set(Object.keys(s.properties ?? {}));
        for (const k of Object.keys(v)) if (!allowed.has(k)) errors.push({ path: p, message: `Champ non autorisé : ${k}` });
      }
    }
  };
  walk(schema, data, '', schema);
  return { valid: errors.length === 0, errors };
}
