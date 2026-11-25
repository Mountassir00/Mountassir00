/**
 * Demo catalog: the 15 initial departments of the governor, the engines that
 * serve them and the technical nodes. Departments are functional views —
 * several share one engine, and only 4 of 13 engines are LLM agents.
 */
import type { AgentDef, Catalog, DepartmentDef, SystemEdge, SystemNode } from '../catalog';

export const DEPARTMENTS: DepartmentDef[] = [
  { id: 'executive', name: 'Executive Office', mission: 'Supervision générale et arbitrages', tone: 'p3', group: 'Direction', engineIds: ['governor', 'you'], equipment: ['meeting', 'board'] },
  { id: 'routing', name: 'Model Routing', mission: 'Sélection des modèles et fournisseurs', tone: 'p2', group: 'Optimisation', engineIds: ['router'], equipment: ['router', 'desk'] },
  { id: 'tokens', name: 'Token Management', mission: 'Optimisation de la consommation', tone: 'p1', group: 'Optimisation', engineIds: ['optimizer'], equipment: ['gauge', 'desk'] },
  { id: 'context', name: 'Context Management', mission: 'Gestion des fenêtres de contexte', tone: 'p8', group: 'Optimisation', engineIds: ['optimizer'], equipment: ['conveyor', 'desk'] },
  { id: 'skills', name: 'Skill Laboratory', mission: 'Développement et maintenance des skills', tone: 'p4', group: 'Savoir-faire', engineIds: ['skillsmith'], equipment: ['lab', 'desk'] },
  { id: 'connectors', name: 'Connector Department', mission: 'Administration des connecteurs et MCP', tone: 'p2', group: 'Opérations', engineIds: ['connector-hub'], equipment: ['server', 'antenna'] },
  { id: 'instructions', name: 'Instruction Audit', mission: 'Audit des consignes', tone: 'p6', group: 'Savoir-faire', engineIds: ['auditor'], equipment: ['desk', 'board'] },
  { id: 'quality', name: 'Quality Control', mission: 'Vérification des résultats', tone: 'p7', group: 'Contrôle', engineIds: ['auditor'], equipment: ['desk', 'gauge'] },
  { id: 'finance', name: 'Financial Control', mission: 'Suivi des coûts et économies', tone: 'p5', group: 'Optimisation', engineIds: ['ledger'], equipment: ['desk', 'gauge'] },
  { id: 'research', name: 'Research Department', mission: 'Veille technologique', tone: 'p3', group: 'Savoir-faire', engineIds: ['scout'], equipment: ['antenna', 'desk'] },
  { id: 'security', name: 'Cybersecurity', mission: 'Supervision des risques', tone: 'p6', group: 'Contrôle', engineIds: ['sentinel'], equipment: ['shield', 'server'] },
  { id: 'automation', name: 'Automation Department', mission: 'Gestion des tâches récurrentes', tone: 'p1', group: 'Opérations', engineIds: ['scheduler'], equipment: ['conveyor', 'server'] },
  { id: 'benchmark', name: 'Benchmark Laboratory', mission: 'Comparaison des performances', tone: 'p4', group: 'Savoir-faire', engineIds: ['bench', 'auditor'], equipment: ['lab', 'gauge'] },
  { id: 'evolution', name: 'Evolution Department', mission: 'Amélioration continue', tone: 'p7', group: 'Direction', engineIds: ['governor'], equipment: ['board', 'desk'] },
  { id: 'archive', name: 'Archive Department', mission: 'Historique et documentation', tone: 'p5', group: 'Opérations', engineIds: ['archivist'], equipment: ['archive', 'database'] },
];

export const AGENTS: AgentDef[] = [
  { id: 'you', name: 'Vous', role: 'Direction — arbitre les propositions', kind: 'human', departmentIds: ['executive'], avatar: { hue: 222, accessory: 'badge', shape: 'tall' } },
  { id: 'governor', name: 'Gouverneur', role: 'Orchestrateur principal', kind: 'llm', departmentIds: ['executive', 'evolution'], provider: 'anthropic', model: 'claude-opus-5-5', avatar: { hue: 250, accessory: 'visor', shape: 'tall' } },
  { id: 'auditor', name: 'Auditrice', role: 'Audit des consignes, contrôle qualité, juge de benchmark', kind: 'llm', departmentIds: ['instructions', 'quality', 'benchmark'], provider: 'anthropic', model: 'claude-sonnet-5-5', avatar: { hue: 330, accessory: 'glasses', shape: 'round' } },
  { id: 'skillsmith', name: 'Forgeron', role: 'Conçoit et améliore les skills', kind: 'llm', departmentIds: ['skills'], provider: 'anthropic', model: 'claude-sonnet-5-5', avatar: { hue: 32, accessory: 'cap', shape: 'square' } },
  { id: 'scout', name: 'Éclaireur', role: 'Veille technologique', kind: 'llm', departmentIds: ['research'], provider: 'anthropic', model: 'claude-haiku-5-5', avatar: { hue: 170, accessory: 'headset', shape: 'round' } },
  { id: 'router', name: 'Routeur', role: 'Règles déterministes de routage', kind: 'script', departmentIds: ['routing'], avatar: { hue: 205, accessory: 'none', shape: 'square' } },
  { id: 'optimizer', name: 'Optimiseur', role: 'Compression, cache et contexte (service partagé)', kind: 'service', departmentIds: ['tokens', 'context'], avatar: { hue: 150, accessory: 'none', shape: 'square' } },
  { id: 'connector-hub', name: 'Hub connecteurs', role: 'Santé et accès des connecteurs MCP', kind: 'service', departmentIds: ['connectors'], avatar: { hue: 200, accessory: 'none', shape: 'square' } },
  { id: 'ledger', name: 'Comptable', role: 'Calcul des coûts et économies', kind: 'script', departmentIds: ['finance'], avatar: { hue: 48, accessory: 'none', shape: 'square' } },
  { id: 'sentinel', name: 'Sentinelle', role: 'Détection de secrets et d’anomalies', kind: 'script', departmentIds: ['security'], avatar: { hue: 355, accessory: 'none', shape: 'square' } },
  { id: 'scheduler', name: 'Planificateur', role: 'Exécute les tâches récurrentes', kind: 'service', departmentIds: ['automation'], avatar: { hue: 140, accessory: 'none', shape: 'square' } },
  { id: 'bench', name: 'Banc d’essai', role: 'Exécute les comparaisons de modèles', kind: 'script', departmentIds: ['benchmark'], avatar: { hue: 280, accessory: 'none', shape: 'square' } },
  { id: 'archivist', name: 'Archiviste', role: 'Indexe et archive l’historique', kind: 'service', departmentIds: ['archive'], avatar: { hue: 30, accessory: 'none', shape: 'square' } },
];

const NODES: SystemNode[] = [
  { id: 'you', kind: 'user', label: 'Vous', layer: 'people', visibility: 'full' },
  ...AGENTS.filter((a) => a.kind !== 'human').map<SystemNode>((a) => ({
    id: a.id,
    kind: a.kind === 'llm' ? 'agent' : 'service',
    label: a.name,
    layer: 'agents',
    visibility: 'full',
  })),
  { id: 'task-queue', kind: 'queue', label: 'File des tâches', layer: 'orchestration', visibility: 'full' },
  { id: 'event-bus', kind: 'queue', label: 'Bus d’événements', layer: 'orchestration', visibility: 'full' },
  { id: 'claude-opus-5-5', kind: 'model', label: 'Opus 5.5', layer: 'models', provider: 'anthropic', visibility: 'full' },
  { id: 'claude-sonnet-5-5', kind: 'model', label: 'Sonnet 5.5', layer: 'models', provider: 'anthropic', visibility: 'full' },
  { id: 'claude-haiku-5-5', kind: 'model', label: 'Haiku 5.5', layer: 'models', provider: 'anthropic', visibility: 'full' },
  { id: 'anthropic', kind: 'provider', label: 'Anthropic API', layer: 'providers', provider: 'anthropic', visibility: 'full' },
  { id: 'claude-ai', kind: 'provider', label: 'claude.ai (apps)', layer: 'providers', provider: 'anthropic', visibility: 'none', note: 'Activité non observable par API' },
  { id: 'other-ai', kind: 'provider', label: 'Autres fournisseurs', layer: 'providers', visibility: 'none', note: 'Non connectés' },
  { id: 'mcp-github', kind: 'mcp', label: 'GitHub (MCP)', layer: 'tools', visibility: 'partial' },
  { id: 'mcp-notion', kind: 'mcp', label: 'Notion (MCP)', layer: 'tools', visibility: 'partial' },
  { id: 'mcp-drive', kind: 'mcp', label: 'Drive (MCP)', layer: 'tools', visibility: 'partial' },
  { id: 'web-search', kind: 'connector', label: 'Recherche web', layer: 'tools', visibility: 'partial' },
  { id: 'skill-writing', kind: 'skill', label: 'Skill rédaction', layer: 'tools', visibility: 'full' },
  { id: 'skill-pdf', kind: 'skill', label: 'Skill PDF', layer: 'tools', visibility: 'full' },
  { id: 'skill-research', kind: 'skill', label: 'Skill veille', layer: 'tools', visibility: 'full' },
  { id: 'event-store', kind: 'database', label: 'Journal d’événements', layer: 'data', visibility: 'full' },
  { id: 'archive-db', kind: 'database', label: 'Archives', layer: 'data', visibility: 'full' },
  { id: 'prefs-db', kind: 'database', label: 'Préférences', layer: 'data', visibility: 'full' },
];

const EDGES: SystemEdge[] = [
  { from: 'you', to: 'governor', kind: 'calls' },
  { from: 'governor', to: 'task-queue', kind: 'writes' },
  { from: 'task-queue', to: 'auditor', kind: 'routes' },
  { from: 'task-queue', to: 'skillsmith', kind: 'routes' },
  { from: 'task-queue', to: 'scout', kind: 'routes' },
  { from: 'task-queue', to: 'scheduler', kind: 'routes' },
  { from: 'router', to: 'claude-opus-5-5', kind: 'routes' },
  { from: 'router', to: 'claude-sonnet-5-5', kind: 'routes' },
  { from: 'router', to: 'claude-haiku-5-5', kind: 'routes' },
  { from: 'governor', to: 'claude-opus-5-5', kind: 'calls' },
  { from: 'auditor', to: 'claude-sonnet-5-5', kind: 'calls' },
  { from: 'skillsmith', to: 'claude-sonnet-5-5', kind: 'calls' },
  { from: 'scout', to: 'claude-haiku-5-5', kind: 'calls' },
  { from: 'bench', to: 'claude-haiku-5-5', kind: 'calls' },
  { from: 'bench', to: 'claude-sonnet-5-5', kind: 'calls' },
  { from: 'claude-opus-5-5', to: 'anthropic', kind: 'depends' },
  { from: 'claude-sonnet-5-5', to: 'anthropic', kind: 'depends' },
  { from: 'claude-haiku-5-5', to: 'anthropic', kind: 'depends' },
  { from: 'optimizer', to: 'governor', kind: 'depends' },
  { from: 'connector-hub', to: 'mcp-github', kind: 'depends' },
  { from: 'connector-hub', to: 'mcp-notion', kind: 'depends' },
  { from: 'connector-hub', to: 'mcp-drive', kind: 'depends' },
  { from: 'scout', to: 'web-search', kind: 'calls' },
  { from: 'skillsmith', to: 'skill-writing', kind: 'writes' },
  { from: 'skillsmith', to: 'skill-pdf', kind: 'writes' },
  { from: 'scout', to: 'skill-research', kind: 'reads' },
  { from: 'event-bus', to: 'event-store', kind: 'writes' },
  { from: 'archivist', to: 'archive-db', kind: 'writes' },
  { from: 'archivist', to: 'event-store', kind: 'reads' },
  { from: 'ledger', to: 'event-store', kind: 'reads' },
  { from: 'sentinel', to: 'event-bus', kind: 'reads' },
  { from: 'governor', to: 'event-bus', kind: 'writes' },
];

export const DEMO_CATALOG: Catalog = {
  departments: DEPARTMENTS,
  agents: AGENTS,
  nodes: NODES,
  edges: EDGES,
  projects: ['Governor', 'Site vitrine', 'Prospection', 'Admin & compta'],
  providers: ['anthropic'],
};
