/**
 * Experience manifest — the declarative identity card of a visual experience.
 * A manifest is data; the only code is the `load()` function of built-in or
 * reviewed-and-installed experiences. Variants and imported configurations
 * are pure data validated by schema and can never carry code.
 */
import { z } from 'zod';
import type { ComponentType } from 'react';
import type { ExperienceProps } from './contract';

export const RENDERERS = ['dom', 'svg', 'canvas2d', 'webgl'] as const;
export type Renderer = (typeof RENDERERS)[number];

/** A configurable graphic parameter exposed to the Experience Studio. */
export const paramSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('boolean'), key: z.string(), label: z.string(), default: z.boolean(), group: z.string().optional() }),
  z.object({ type: z.literal('number'), key: z.string(), label: z.string(), default: z.number(), min: z.number(), max: z.number(), step: z.number(), unit: z.string().optional(), group: z.string().optional() }),
  z.object({ type: z.literal('select'), key: z.string(), label: z.string(), default: z.string(), options: z.array(z.object({ value: z.string(), label: z.string() })), group: z.string().optional() }),
  z.object({ type: z.literal('color'), key: z.string(), label: z.string(), default: z.string(), group: z.string().optional() }),
]);
export type GraphicParam = z.infer<typeof paramSchema>;

export const manifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9.-]{2,63}$/),
  name: z.string().min(2).max(60),
  description: z.string().max(400),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/),
  /** Inline SVG markup for the gallery card (sanitised before display). */
  thumbnail: z.string().max(20_000),
  renderer: z.enum(RENDERERS),
  status: z.enum(['stable', 'prototype', 'pending-validation']),
  graphics: z.array(paramSchema),
  components: z.array(z.string()),
  layout: z.object({
    kind: z.enum(['grid', 'scene', 'list']),
    zoomPan: z.boolean(),
    minimap: z.boolean(),
    minWidth: z.number().int().min(0),
  }),
  accessibility: z.object({
    keyboard: z.boolean(),
    screenReaderSummary: z.boolean(),
    reducedMotion: z.enum(['full', 'partial']),
    contrast: z.enum(['AA', 'AAA']),
    notes: z.string().optional(),
  }),
  dependencies: z.object({
    sdk: z.string(),
    libraries: z.array(z.string()),
  }),
  performance: z.object({
    cost: z.enum(['low', 'medium', 'high']),
    maxNodes: z.number().int(),
    targetFps: z.number().int(),
    animated: z.boolean(),
  }),
  devices: z.object({
    desktop: z.enum(['full', 'adapted', 'fallback', 'unsupported']),
    tablet: z.enum(['full', 'adapted', 'fallback', 'unsupported']),
    mobile: z.enum(['full', 'adapted', 'fallback', 'unsupported']),
    fallbackId: z.string().optional(),
  }),
  createdAt: z.string(),
});

export type ExperienceManifest = z.infer<typeof manifestSchema>;

export interface ExperienceModule {
  default: ComponentType<ExperienceProps>;
}

/** What a code experience provides (built-in, or installed through review). */
export interface ExperienceDefinition {
  manifest: ExperienceManifest;
  load: () => Promise<ExperienceModule>;
}

export const SDK_VERSION = '1.0.0';

export function defaultsOf(manifest: ExperienceManifest): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of manifest.graphics) out[p.key] = p.default;
  return out;
}

/** Keeps only overrides that match the declared params and their constraints. */
export function sanitizeOverrides(manifest: ExperienceManifest, input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of manifest.graphics) {
    const v = input[p.key];
    if (v === undefined) continue;
    if (p.type === 'boolean' && typeof v === 'boolean') out[p.key] = v;
    if (p.type === 'number' && typeof v === 'number' && Number.isFinite(v)) out[p.key] = Math.min(p.max, Math.max(p.min, v));
    if (p.type === 'select' && typeof v === 'string' && p.options.some((o) => o.value === v)) out[p.key] = v;
    if (p.type === 'color' && typeof v === 'string' && isSafeColor(v)) out[p.key] = v;
  }
  return out;
}

export function isSafeColor(v: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(v) || /^(rgb|hsl)a?\(\s*[\d.\s%,/]+\)$/.test(v);
}
