// All on-screen copy, verbatim from jofunction.com (English) and jofunction.com/ar (Arabic).
import { AR } from './config.js';

const GREET = [
  { w: 'مرحباً', n: 'العربية', s: 'ar' },
  { w: 'Bonjour', n: 'Français' },
  { w: 'Hola', n: 'Español' },
  { w: 'Hallo', n: 'Deutsch' },
  { w: 'Ciao', n: 'Italiano' },
  { w: 'Merhaba', n: 'Türkçe' },
  { w: 'Привет', n: 'Русский', s: 'ru' },
  { w: 'Hello', n: 'English' }
];
// the site's intro ends on the visitor's own language
const greet = AR ? [GREET[7], ...GREET.slice(1, 7), GREET[0]] : GREET;

const SERVICES = [
  { g: 0, icon: 'web', en: 'Web development', ar: 'تطوير الويب', le: 'Sites that carry weight.', la: 'مواقع تتحمّل الثقل.' },
  { g: 0, icon: 'mobile', en: 'Mobile apps', ar: 'تطبيقات الجوال', le: 'An app people open twice.', la: 'تطبيق يفتحه الناس مرتين.' },
  { g: 0, icon: 'cart', en: 'Ecommerce', ar: 'التجارة الإلكترونية', le: 'A store that survives a good day.', la: 'متجر يصمد في يوم مزدحم.' },
  { g: 0, icon: 'dash', en: 'Business systems', ar: 'الأنظمة', le: 'The system your business runs on.', la: 'النظام الذي يُدار به عملك.' },
  { g: 1, icon: 'spark', en: 'AI systems', ar: 'أنظمة الذكاء الاصطناعي', le: 'AI that does a job.', la: 'ذكاء اصطناعي يؤدي مهمة.' },
  { g: 1, icon: 'tree', en: 'Intelligent systems', ar: 'الأنظمة الذكية', le: 'Systems that decide.', la: 'أنظمة تتخذ القرار.' },
  { g: 1, icon: 'arm', en: 'Robotics', ar: 'الروبوتات', le: 'Software with moving parts.', la: 'برمجيات بأجزاء متحركة.' },
  { g: 2, icon: 'mark', en: 'Brand identity', ar: 'الهوية البصرية', le: 'An identity that survives contact with production.', la: 'هوية تصمد أمام التنفيذ الفعلي.' },
  { g: 2, icon: 'curve', en: 'Motion & video', ar: 'الموشن والفيديو', le: 'Make it move.', la: 'اجعلها تتحرّك.' },
  { g: 2, icon: 'chat', en: 'Social management', ar: 'إدارة وسائل التواصل', le: 'Accounts that sound like the company.', la: 'حسابات تتحدث بلسان الشركة.' },
  { g: 2, icon: 'mega', en: 'Advertising management', ar: 'إدارة الإعلانات', le: 'Take it outside.', la: 'خذها إلى الخارج.' },
  { g: 3, icon: 'shield', en: 'Cybersecurity', ar: 'الأمن السيبراني', le: 'Build fast. Break it first.', la: 'ابنِ بسرعة. اكسره أولاً.' }
];
const GROUPS = [
  { en: 'Product engineering', ar: 'الهندسة والتطوير' },
  { en: 'AI and intelligent systems', ar: 'الذكاء الاصطناعي والأنظمة الذكية' },
  { en: 'Brand and growth', ar: 'العلامة والنمو' },
  { en: 'Security', ar: 'الأمن السيبراني' }
];
const PRODUCTS = [
  { n: 'CodePath', te: 'The route from curious to competent.', ta: 'الطريق من الفضول إلى الإتقان.' },
  { n: 'Waqte', te: 'Your time, on your side.', ta: 'وقتك، في صفّك.' },
  { n: 'Faz3at E5tebar', te: 'For the night before.', ta: 'لليلة ما قبل الامتحان.' },
  { n: 'JoFunction', te: 'Where founders and investors meet.', ta: 'حيث يلتقي رواد الأعمال والمستثمرون.' },
  { n: 'JoFunction AI', te: 'Intelligence, built in.', ta: 'ذكاء مدمج في الأساس.' },
  { n: 'Reppio', te: 'Training that fits the week you actually have.', ta: 'تدريب يناسب الأسبوع الذي تعيشه فعلاً.' },
  { n: 'Stackgrove', te: 'A technical library that is actually navigable.', ta: 'مكتبة تقنية يمكن التنقل فيها فعلاً.' },
  { n: 'Fluentro', te: 'Language you can use on the same day.', ta: 'لغة يمكنك استخدامها في اليوم نفسه.' },
  { n: "Ni'ma", te: "Good food, before it's gone.", ta: 'طعام جيد، قبل أن ينفد.' },
  { n: 'Gridkin', te: "The AI and tech community, in a feed you'd actually scroll.", ta: 'مجتمع الذكاء الاصطناعي والتقنية، في خلاصة تستحق التصفّح فعلاً.' },
  { n: 'Hangwave', te: 'A snap, a plan, out the door.', ta: 'لقطة، ثم خطة، ثم أنتم في الخارج.' }
];
const PLATFORMS = [
  { icon: 'spark', en: 'JoFunction AI', ar: 'JoFunction AI', te: 'AI products built to work every day', ta: 'منتجات ذكاء اصطناعي تعمل كل يوم' },
  { icon: 'house', en: 'Automation & Robotics', ar: 'الأتمتة والروبوتات', te: 'Smart buildings, stores and robots that run themselves', ta: 'منازل ومبانٍ ومتاجر وروبوتات تُدير نفسها' },
  { icon: 'bag', en: 'Store', ar: 'المتجر', te: 'Things we make, sold direct', ta: 'منتجاتنا، تُباع مباشرة' },
  { icon: 'mega', en: 'Advertising', ar: 'الإعلان', te: 'Street and screen, one campaign', ta: 'الشارع والشاشة في حملة واحدة' },
  { icon: 'cap', en: 'Education', ar: 'التعليم', te: 'Courses and programs: learn, build, launch', ta: 'دورات وبرامج: تعلّم، ابنِ، أطلِق' }
];

const L = (en, ar) => (AR ? ar : en);
export const T = {
  greet,
  hook: L(['The future', 'doesn’t build', 'itself.'], ['المستقبل', 'لا يبني', 'نفسه.']),
  weDo: L('We do', 'نحن نبنيه'),
  tagline: L('Engineered with intent. Built to last.', 'هندسة بقصد. ومنتجات تدوم.'),
  studio: L('A DIGITAL STUDIO IN AMMAN', 'استوديو رقمي في عمّان'),
  stats: [
    { n: '12', l: L('Services', 'خدمة') },
    { n: '11', l: L('Own products', 'منتجاً خاصاً') },
    { n: '5', l: L('Platforms', 'منصات') }
  ],
  statsKicker: L('WHAT WE DO', 'ماذا نفعل'),
  statsHead: L(['Everything it takes,', 'under one roof.'], ['كل ما يلزم،', 'تحت سقف واحد.']),
  servicesKicker: L('OUR SERVICES', 'خدماتنا'),
  groups: GROUPS.map(g => L(g.en, g.ar)),
  services: SERVICES.map(s => ({ ...s, name: L(s.en, s.ar), line: L(s.le, s.la) })),
  productsKicker: L('BUILT BY US', 'من صنعنا'),
  productsHead: L('Our products', 'منتجاتنا'),
  productsSub: L('Products we designed, launched and operate — each with a brand of its own.', 'منتجات صمّمناها وأطلقناها وندير تشغيلها — لكلٍّ منها هويته الخاصة.'),
  products: PRODUCTS.map(p => ({ n: p.n, t: L(p.te, p.ta) })),
  platformsKicker: L('RUN BY US', 'من إدارتنا'),
  platformsHead: L('Our platforms', 'منصاتنا'),
  platformsSub: L('Standalone JoFunction businesses that reach beyond the screen.', 'أعمال مستقلة تحت مظلة JoFunction، تمتد إلى ما هو أبعد من الشاشة.'),
  platforms: PLATFORMS.map(p => ({ icon: p.icon, name: L(p.en, p.ar), t: L(p.te, p.ta) })),
  processKicker: L('HOW WE WORK', 'كيف نعمل'),
  process: L(['Think.', 'Design.', 'Build.', 'Launch.', 'Keep alive.'], ['نفكّر.', 'نصمّم.', 'نبني.', 'نُطلق.', 'ونُبقيه حيّاً.']),
  processSub: L('Most studios deliver and disappear — we stay.', 'معظم الاستوديوهات تسلّم وتختفي — نحن نبقى.'),
  statement: L(['We don’t just build digital products.', 'We keep them alive.'], ['لا نكتفي ببناء المنتجات الرقمية.', 'نُبقيها حيّة.']),
  endQ: L('Have something worth building?', 'عندك فكرة تستحق البناء؟'),
  endA: L('Let’s build it.', 'لنبنِها.'),
  cta: L('Start a project', 'ابدأ مشروعك'),
  url: 'jofunction.com',
  address: L('KING HUSSEIN BUSINESS PARK · AMMAN · JORDAN', 'مجمّع الملك حسين للأعمال · عمّان · الأردن'),
  credit: L('MOTION REEL — DESIGNED, ANIMATED & SCORED BY CLAUDE', 'موشن ريل — تصميم وتحريك وموسيقى: Claude')
};
