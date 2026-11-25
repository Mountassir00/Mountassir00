/** Gallery thumbnails — static SVG rendered through <img>, so no script can ever run from them. */
/** Helpers available to every manifest for drawing its gallery thumbnail. */
export const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><pattern id="g" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#dde4eb" stroke-width="1"/></pattern></defs><rect width="320" height="180" fill="#eef2f5"/><rect width="320" height="180" fill="url(#g)"/>${body}</svg>`;

export const box = (x: number, y: number, w: number, h: number, top: string, l: string, r: string) => {
  const hw = w / 2, hh = w / 4;
  return `<path d="M${x},${y} l${hw},${hh} l${-hw},${hh} l${-hw},${-hh} Z" fill="${top}" stroke="#16203a" stroke-opacity=".6"/>` +
    `<path d="M${x - hw},${y + hh} l${hw},${hh} v${h} l${-hw},${-hh} Z" fill="${l}" stroke="#16203a" stroke-opacity=".6"/>` +
    `<path d="M${x + hw},${y + hh} l${-hw},${hh} v${h} l${hw},${-hh} Z" fill="${r}" stroke="#16203a" stroke-opacity=".6"/>`;
};

export const THUMB_CONTROL_CENTER = wrap(
  `<rect x="16" y="16" width="288" height="34" rx="6" fill="#fbfcfd" stroke="#bfc9d6"/>` +
  [0, 1, 2, 3].map((i) => `<rect x="${24 + i * 70}" y="24" width="40" height="6" rx="3" fill="#5a6580"/><rect x="${24 + i * 70}" y="35" width="26" height="8" rx="2" fill="#16203a"/>`).join('') +
  `<rect x="16" y="60" width="186" height="104" rx="6" fill="#fbfcfd" stroke="#bfc9d6"/>` +
  Array.from({ length: 12 }, (_, i) => { const h = 18 + ((i * 37) % 50); return `<rect x="${28 + i * 14}" y="${150 - h}" width="9" height="${h * 0.55}" fill="#2a78d6"/><rect x="${28 + i * 14}" y="${150 - h * 0.45 + 2}" width="9" height="${h * 0.45 - 2}" fill="#1baf7a"/>`; }).join('') +
  `<rect x="212" y="60" width="92" height="104" rx="6" fill="#fbfcfd" stroke="#bfc9d6"/>` +
  [0, 1, 2, 3].map((i) => `<rect x="222" y="${74 + i * 22}" width="${66 - i * 13}" height="8" rx="3" fill="#2a78d6"/>`).join(''),
);

export const THUMB_AI_OFFICE = wrap(
  box(160, 30, 200, 6, '#d2e3f7', '#c3d2e6', '#b3c2d6') +
  box(110, 60, 60, 14, '#fbfcfd', '#e6eaee', '#d7dde3') + box(200, 60, 60, 14, '#fbfcfd', '#e6eaee', '#d7dde3') + box(160, 95, 60, 14, '#fbfcfd', '#e6eaee', '#d7dde3') +
  `<rect x="100" y="56" width="12" height="16" rx="5" fill="#8f8ae0" stroke="#16203a" stroke-opacity=".6"/><circle cx="106" cy="50" r="5" fill="#e9e6f8" stroke="#16203a" stroke-opacity=".6"/>` +
  `<rect x="190" y="56" width="12" height="16" rx="5" fill="#e08a8a" stroke="#16203a" stroke-opacity=".6"/><circle cx="196" cy="50" r="5" fill="#f6e1e1" stroke="#16203a" stroke-opacity=".6"/>` +
  `<circle cx="116" cy="40" r="5" fill="#fff" stroke="#1f74d6" stroke-width="1.5"/><circle cx="206" cy="40" r="5" fill="#fff" stroke="#2b8048" stroke-width="1.5"/>`,
);

export const THUMB_SYSTEM_MAP = wrap(
  box(70, 40, 56, 22, '#e1daf7', '#d0c9e6', '#bfb8d5') + box(160, 70, 56, 22, '#d2e3f7', '#c1d2e6', '#b0c1d5') + box(250, 40, 56, 22, '#cdebdc', '#bcdacb', '#abc9ba') +
  box(160, 120, 56, 14, '#f3e8b6', '#e2d7a5', '#d1c694') +
  `<path d="M98 70 L132 88 M188 88 L222 70 M160 122 L160 112" stroke="#1f74d6" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/>`,
);

/** Neutral placeholder used until a view draws its own thumbnail. */
export const placeholder = (label: string) =>
  wrap(`<rect x="60" y="50" width="200" height="80" rx="16" fill="#ffffff" stroke="#d6d6dd"/><text x="160" y="96" text-anchor="middle" font-family="system-ui" font-size="15" font-weight="600" fill="#3f3f46">${label}</text>`);
