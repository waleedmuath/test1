// Frame, tempo and brand tokens — every colour and family below comes from jofunction.com's own stylesheet.

export const W = 1920, H = 1080, FPS = 60, DUR = 30;
export const BPM = 96, B = 60 / BPM, BAR = 4 * B; // 30 s = 48 beats = 12 bars

export const LANG = (() => {
  try { return (new URLSearchParams(location.search).get('lang') || '').toLowerCase() === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; }
})();
export const AR = LANG === 'ar';

export const C = {
  fn: '#FF5C00',      // --color-function
  fn400: '#FF7A2B',   // --color-orange-400
  fn700: '#C43D00',   // --color-orange-700
  ink: '#0B0B0C',     // --color-ink / dark paper
  surface: '#141417', // --color-surface (dark)
  raised: '#1C1C21',  // --color-raised (dark)
  line: '#2A2A31',    // --color-line (dark)
  cream: '#F3EDE3',   // --color-ink (dark theme text)
  paper: '#FAF8F6',   // --color-paper (light)
  sand: '#EBE3D6',    // --color-surface (light)
  sandLine: '#D9CFBF',
  muted: '#8B857D',   // --color-muted
  mutedL: '#625B51',
  tint: '#1A1008',    // --color-orange-tint (dark)
  ok: '#0FB37A'       // --color-success
};

// --font-display / --font-sans / --font-mono stacks from the site
export const F = {
  display: '"Space Grotesk", "IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif',
  sans: '"IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif',
  ar: '"IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif',
  mono: '"IBM Plex Mono", "IBM Plex Sans Arabic", monospace'
};
// Arabic copy uses Plex Sans Arabic for display weight; Latin uses Space Grotesk.
export const DISPLAY = AR ? F.ar : F.display;
