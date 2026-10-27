// Brand system lifted from the JoFunction division sheet (v2.1, Oct 2026):
// palette, type, the J/F monogram geometry and the seven divisions.

export const C = {
  ink: '#0B0B0C', ink2: '#17171A', ink3: '#26262A',
  paper: '#FAF8F6', sand: '#EAE6E0', line: '#DDD8D2',
  mute: '#8B857D', gray: '#6E6961', body: '#514D48',
  orange: '#FF5C00', burnt: '#C43D00', glow: '#FF7A1F'
};

export const FONT = {
  ar: '"Plex Arabic", sans-serif',
  grot: '"Grotesk", sans-serif',
  mono: '"Plex Mono", monospace'
};

// Monogram, in the sheet's 100×100 SVG units (y down). Each bar is a rectangle
// with one rounded end of radius 5.75 — exactly the paths in the brand SVG.
export const LOGO = {
  r: 5.75,
  tileR: 24,
  bars: [
    // id, rect [x0, y0, x1, y1], rounded end: cap centre + direction
    { id: 'A', name: 'STEM', rect: [44.25, 29.25, 55.75, 75.5], cap: [50, 29.25], dir: 'up' },
    { id: 'B', name: 'BASE', rect: [24.75, 64, 55.75, 75.5], cap: [24.75, 69.75], dir: 'left' },
    { id: 'C', name: 'ARM', rect: [44.25, 23.5, 69.75, 35], cap: [69.75, 29.25], dir: 'right' },
    { id: 'D', name: 'CORE', rect: [44.25, 46.5, 61, 58], cap: [61, 52.25], dir: 'right' }
  ]
};
// bounding sizes as printed in the intro call-outs
LOGO.dims = ['11.5 × 52.0', '36.75 × 11.5', '31.25 × 11.5', '22.5 × 11.5'];

export function inBar(b, x, y) {
  const [x0, y0, x1, y1] = b.rect;
  if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return true;
  const dx = x - b.cap[0], dy = y - b.cap[1];
  return dx * dx + dy * dy <= LOGO.r * LOGO.r;
}
export const inGlyph = (x, y) => LOGO.bars.some(b => inBar(b, x, y));
export function inTile(x, y) {
  const r = LOGO.tileR;
  if (x < 0 || x > 100 || y < 0 || y > 100) return false;
  const cx = x < r ? r : x > 100 - r ? 100 - r : x;
  const cy = y < r ? r : y > 100 - r ? 100 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

export const STATIONS = [
  {
    n: '01', bg: C.paper, title: 'خدماتنا', en: 'SERVICES',
    sub: 'نبني لعملائنا، بمواصفاتهم وبعلامتهم.', url: 'jofunction.com/services',
    list: ['تطوير الويب', 'تطبيقات الجوال', 'التجارة الإلكترونية', 'الأنظمة', 'أنظمة الذكاء الاصطناعي', 'الأنظمة الذكية',
      'الروبوتات', 'الهوية البصرية', 'الموشن والفيديو', 'إدارة وسائل التواصل', 'إدارة الإعلانات', 'الأمن السيبراني']
  },
  {
    n: '02', bg: C.ink, title: 'تطبيقاتنا ومواقعنا', title2: 'وبرامجنا', en: 'OUR PRODUCTS',
    sub: 'منتجات نصمّمها ونطلقها ونشغّلها بأنفسنا.', url: '10 PRODUCTS · 10 DOMAINS'
  },
  {
    n: '03', bg: C.orange, title: 'الإعلان', en: 'ADVERTISING',
    sub: 'الشارع والشاشة في حملة واحدة.', url: 'advertising.jofunction.com'
  },
  {
    n: '04', bg: C.sand, title: 'المتجر', en: 'THE STORE',
    sub: 'منتجاتنا الخاصة، مادية أو رقمية.', url: 'store.jofunction.com'
  },
  {
    n: '05', bg: C.paper, title: 'التعليم', en: 'EDUCATION',
    sub: 'تعلّم، ابنِ، أطلِق.', url: 'education.jofunction.com'
  },
  {
    n: '06', bg: C.ink, title: 'JoFunction AI', latinTitle: true, en: 'ARTIFICIAL INTELLIGENCE',
    sub: 'الذكاء الذي ندمجه في كل ما نصنعه.', url: 'ai.jofunction.com'
  },
  {
    n: '07', bg: C.orange, title: 'الأتمتة والروبوتات', en: 'AUTOMATION & ROBOTICS',
    sub: 'منازل ومبانٍ ومتاجر تُدير نفسها.', url: 'automation.jofunction.com'
  }
];

// Division 02 — the product line, set as a periodic table.
export const PRODUCTS = [
  { sym: 'Cp', name: 'CodePath', color: '#3D5AFE' },
  { sym: 'Wq', name: 'Waqte', color: '#00A79D' },
  { sym: 'Fz', name: 'Faz3at E5tebar', color: '#FFB400', dark: true },
  { sym: 'Rp', name: 'Reppio', color: '#FF3D57' },
  { sym: 'Sg', name: 'Stackgrove', color: '#2F7D4E' },
  { sym: 'Fl', name: 'Fluentro', color: '#8A5CF6' },
  { sym: 'Nm', name: "Ni'ma", color: '#7CB518', dark: true },
  { sym: 'Jf', name: 'JoFunction', color: '#FF5C00', dark: true, house: true },
  { sym: 'Gk', name: 'Gridkin', color: '#E91E8C' },
  { sym: 'Hw', name: 'Hangwave', color: '#00B4F0', dark: true }
];
