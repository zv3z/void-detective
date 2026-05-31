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

export const HUE_MAP: Record<string, {
  text: string;
  bg: string;
  bg8: string;
  bg10: string;
  bg15: string;
  bg20: string;
  border30: string;
  border40: string;
}> = {
  cyan:     { text: "text-cyan",     bg: "bg-cyan",     bg8: "bg-cyan/8",     bg10: "bg-cyan/10",     bg15: "bg-cyan/15",     bg20: "bg-cyan/20",     border30: "border-cyan/30",     border40: "border-cyan/40"     },
  info:     { text: "text-info",     bg: "bg-info",     bg8: "bg-info/8",     bg10: "bg-info/10",     bg15: "bg-info/15",     bg20: "bg-info/20",     border30: "border-info/30",     border40: "border-info/40"     },
  warning:  { text: "text-warning",  bg: "bg-warning",  bg8: "bg-warning/8",  bg10: "bg-warning/10",  bg15: "bg-warning/15",  bg20: "bg-warning/20",  border30: "border-warning/30",  border40: "border-warning/40"  },
  safe:     { text: "text-safe",     bg: "bg-safe",     bg8: "bg-safe/8",     bg10: "bg-safe/10",     bg15: "bg-safe/15",     bg20: "bg-safe/20",     border30: "border-safe/30",     border40: "border-safe/40"     },
  high:     { text: "text-high",     bg: "bg-high",     bg8: "bg-high/8",     bg10: "bg-high/10",     bg15: "bg-high/15",     bg20: "bg-high/20",     border30: "border-high/30",     border40: "border-high/40"     },
  critical: { text: "text-critical", bg: "bg-critical", bg8: "bg-critical/8", bg10: "bg-critical/10", bg15: "bg-critical/15", bg20: "bg-critical/20", border30: "border-critical/30", border40: "border-critical/40" },
};

export const NAV = [
  { to: "/",          label: "الرئيسية",      icon: "⌂" },
  { to: "/dashboard", label: "لوحة التحكم",   icon: "▦" },
  { to: "/modules",   label: "التحقيق",       icon: "◈" },
  { to: "/graph",     label: "خريطة الروابط", icon: "⬡" },
  { to: "/cases",     label: "القضايا",       icon: "⛬" },
  { to: "/about",     label: "حول النظام",    icon: "ⓘ" },
] as const;
