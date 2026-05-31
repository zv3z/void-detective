export type OsintType =
  | "username" | "email" | "ip" | "domain"
  | "phone" | "crypto" | "person" | "ioc";

export interface ModuleDef {
  id: string;
  type: OsintType;
  slug: string;
  icon: string;
  nameAr: string;
  descAr: string;
  placeholder: string;
  badge: string;
  hue: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: "osint-01",
    type: "username",
    slug: "username",
    icon: "◉",
    nameAr: "ماسح أسماء المستخدمين",
    descAr: "كشف حضور الشخص على 34 منصة تواصل اجتماعي ومنتدى",
    placeholder: "john_doe",
    badge: "OSINT-01",
    hue: "cyan",
  },
  {
    id: "osint-02",
    type: "email",
    slug: "email",
    icon: "⊙",
    nameAr: "محقق البريد الإلكتروني",
    descAr: "كشف التسريبات، التحقق من الهوية، وتحليل النطاق المرتبط",
    placeholder: "target@example.com",
    badge: "OSINT-02",
    hue: "info",
  },
  {
    id: "osint-03",
    type: "ip",
    slug: "ip",
    icon: "⊕",
    nameAr: "استخبارات عناوين IP",
    descAr: "الموقع الجغرافي، ASN، السمعة الأمنية، والمنافذ المفتوحة",
    placeholder: "8.8.8.8 أو 2001:db8::1",
    badge: "OSINT-03",
    hue: "warning",
  },
  {
    id: "osint-04",
    type: "domain",
    slug: "domain",
    icon: "⊗",
    nameAr: "محلل النطاقات",
    descAr: "WHOIS، سجلات DNS، النطاقات الفرعية، وتقنيات الموقع",
    placeholder: "example.com",
    badge: "OSINT-04",
    hue: "safe",
  },
  {
    id: "osint-05",
    type: "phone",
    slug: "phone",
    icon: "◎",
    nameAr: "استعلام أرقام الهاتف",
    descAr: "كشف الدولة والمشغل ونوع الرقم والهوية المرتبطة",
    placeholder: "+966 5x xxx xxxx",
    badge: "OSINT-05",
    hue: "high",
  },
  {
    id: "osint-06",
    type: "crypto",
    slug: "crypto",
    icon: "⬡",
    nameAr: "محلل المحافظ الرقمية",
    descAr: "فحص محافظ BTC / ETH / LTC وسجلات المعاملات",
    placeholder: "bc1q... أو 0x...",
    badge: "OSINT-06",
    hue: "warning",
  },
  {
    id: "osint-07",
    type: "person",
    slug: "person",
    icon: "▣",
    nameAr: "بحث الهوية الشخصية",
    descAr: "تجميع المعلومات المتاحة عن شخص من اسمه أو لقبه",
    placeholder: "محمد العمري",
    badge: "OSINT-07",
    hue: "critical",
  },
  {
    id: "osint-08",
    type: "ioc",
    slug: "ioc",
    icon: "◆",
    nameAr: "مستخرج مؤشرات الاختراق",
    descAr: "استخراج IPs، نطاقات، بريد، هاشات، وعناوين عملات من أي نص",
    placeholder: "الصق أي نص يحتوي على مؤشرات...",
    badge: "OSINT-08",
    hue: "critical",
  },
];

export const NAV = [
  { to: "/",          label: "الرئيسية",      icon: "⌂" },
  { to: "/dashboard", label: "لوحة التحكم",   icon: "▦" },
  { to: "/modules",   label: "التحقيق",       icon: "◈" },
  { to: "/graph",     label: "خريطة الروابط", icon: "⬡" },
  { to: "/cases",     label: "القضايا",       icon: "⛬" },
  { to: "/about",     label: "حول النظام",    icon: "ⓘ" },
] as const;
