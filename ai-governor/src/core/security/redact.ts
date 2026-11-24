/**
 * Secret redaction applied at ingestion time, before any event reaches the
 * store, so no visual layer can ever render an API key or token — even by
 * accident in a flow label or an imported transcript.
 */
const PATTERNS: Array<[RegExp, string]> = [
  [/sk-ant-[A-Za-z0-9_-]{8,}/g, '[clé Anthropic masquée]'],
  [/sk-(?:proj-)?[A-Za-z0-9_-]{16,}/g, '[clé API masquée]'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/g, '[jeton GitHub masqué]'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '[jeton GitHub masqué]'],
  [/AKIA[0-9A-Z]{16}/g, '[clé AWS masquée]'],
  [/AIza[0-9A-Za-z_-]{30,}/g, '[clé Google masquée]'],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/g, '[jeton Slack masqué]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[JWT masqué]'],
  [/(bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[jeton masqué]'],
  [/((?:password|passwd|secret|api[_-]?key|token)\s*[=:]\s*)["']?[^\s"',;]{4,}/gi, '$1[secret masqué]'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[clé privée masquée]'],
];

export function redactString(value: string): string {
  let out = value;
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep);
  return out;
}

export function containsSecret(value: string): boolean {
  return redactString(value) !== value;
}

/** Deep-redacts every string in a JSON-like value (returns a new value). */
export function redactDeep<T>(value: T): T {
  if (typeof value === 'string') return redactString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactDeep(v);
    return out as T;
  }
  return value;
}
