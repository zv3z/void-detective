import type { OsintType } from "@/lib/dfas-data";

export type { OsintType };

export interface ExternalLink {
  name: string;
  url: string;
  category: string;
  categoryAr: string;
  free: boolean;
  description: string;
}

export interface Finding {
  label: string;
  value: string;
  status: "info" | "success" | "warning" | "danger" | "neutral";
}

export interface PlatformResult {
  name: string;
  url: string;
  icon: string;
  category: string;
  categoryAr: string;
}

export interface ExtractedIOC {
  ips: string[];
  domains: string[];
  emails: string[];
  urls: string[];
  md5: string[];
  sha1: string[];
  sha256: string[];
  btcAddresses: string[];
  ethAddresses: string[];
  cves: string[];
}

export interface InvestigationResult {
  input: string;
  normalized: string;
  entityType: OsintType;
  isValid: boolean;
  validationMsg: string;
  summary: string;
  confidence: "high" | "medium" | "low";
  riskScore: number;
  findings: Finding[];
  platforms?: PlatformResult[];
  externalLinks: ExternalLink[];
  extracted?: ExtractedIOC;
  metadata: { k: string; v: string }[];
  steps: string[];
}

// ─── Validators ─────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidIPv4(ip: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split(".").every((n) => parseInt(n) <= 255);
}

function isValidIPv6(ip: string): boolean {
  return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip);
}

function isValidDomain(domain: string): boolean {
  return /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain);
}

function isPrivateIP(ip: string): boolean {
  const o = ip.split(".").map(Number);
  return (
    o[0] === 10 ||
    (o[0] === 172 && o[1] >= 16 && o[1] <= 31) ||
    (o[0] === 192 && o[1] === 168) ||
    o[0] === 127
  );
}

// ─── Username Engine ─────────────────────────────────────────────────────────

const USERNAME_PLATFORMS: Omit<PlatformResult, "url">[] = [
  { name: "Twitter / X",    icon: "𝕏",  category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "Instagram",      icon: "📷", category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "GitHub",         icon: "⌨",  category: "Developer",    categoryAr: "مطورون" },
  { name: "LinkedIn",       icon: "💼", category: "Professional", categoryAr: "مهني" },
  { name: "TikTok",         icon: "🎵", category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "YouTube",        icon: "▶",  category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "Reddit",         icon: "🔴", category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "Facebook",       icon: "📘", category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "Telegram",       icon: "✈",  category: "Messaging",    categoryAr: "مراسلة" },
  { name: "Discord",        icon: "💬", category: "Messaging",    categoryAr: "مراسلة" },
  { name: "Steam",          icon: "🎮", category: "Gaming",       categoryAr: "ألعاب" },
  { name: "Twitch",         icon: "🟣", category: "Gaming",       categoryAr: "ألعاب" },
  { name: "Pinterest",      icon: "📌", category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "Snapchat",       icon: "👻", category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "Medium",         icon: "✍",  category: "Content",      categoryAr: "محتوى" },
  { name: "Dev.to",         icon: "💻", category: "Developer",    categoryAr: "مطورون" },
  { name: "Keybase",        icon: "🔑", category: "Security",     categoryAr: "أمان" },
  { name: "GitLab",         icon: "🦊", category: "Developer",    categoryAr: "مطورون" },
  { name: "Bitbucket",      icon: "🪣", category: "Developer",    categoryAr: "مطورون" },
  { name: "Quora",          icon: "❓", category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "Stack Overflow", icon: "📚", category: "Developer",    categoryAr: "مطورون" },
  { name: "Last.fm",        icon: "🎵", category: "Music",        categoryAr: "موسيقى" },
  { name: "Spotify",        icon: "🎧", category: "Music",        categoryAr: "موسيقى" },
  { name: "SoundCloud",     icon: "🔊", category: "Music",        categoryAr: "موسيقى" },
  { name: "Flickr",         icon: "📸", category: "Photos",       categoryAr: "صور" },
  { name: "Tumblr",         icon: "📝", category: "Blogging",     categoryAr: "مدونات" },
  { name: "Vimeo",          icon: "🎬", category: "Video",        categoryAr: "فيديو" },
  { name: "Dribbble",       icon: "🏀", category: "Design",       categoryAr: "تصميم" },
  { name: "Behance",        icon: "🎨", category: "Design",       categoryAr: "تصميم" },
  { name: "Product Hunt",   icon: "🚀", category: "Startup",      categoryAr: "ريادة" },
  { name: "Hacker News",    icon: "🔸", category: "Tech",         categoryAr: "تقنية" },
  { name: "Mastodon",       icon: "🐘", category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "Bluesky",        icon: "🦋", category: "Social",       categoryAr: "تواصل اجتماعي" },
  { name: "Gravatar",       icon: "👤", category: "Identity",     categoryAr: "هوية" },
];

const USERNAME_URLS: Record<string, string> = {
  "Twitter / X":    "https://x.com/{}",
  "Instagram":      "https://instagram.com/{}",
  "GitHub":         "https://github.com/{}",
  "LinkedIn":       "https://linkedin.com/in/{}",
  "TikTok":         "https://tiktok.com/@{}",
  "YouTube":        "https://youtube.com/@{}",
  "Reddit":         "https://reddit.com/user/{}",
  "Facebook":       "https://facebook.com/{}",
  "Telegram":       "https://t.me/{}",
  "Discord":        "https://discord.com/users/{}",
  "Steam":          "https://steamcommunity.com/id/{}",
  "Twitch":         "https://twitch.tv/{}",
  "Pinterest":      "https://pinterest.com/{}",
  "Snapchat":       "https://snapchat.com/add/{}",
  "Medium":         "https://medium.com/@{}",
  "Dev.to":         "https://dev.to/{}",
  "Keybase":        "https://keybase.io/{}",
  "GitLab":         "https://gitlab.com/{}",
  "Bitbucket":      "https://bitbucket.org/{}",
  "Quora":          "https://quora.com/profile/{}",
  "Stack Overflow": "https://stackoverflow.com/users/{}",
  "Last.fm":        "https://last.fm/user/{}",
  "Spotify":        "https://open.spotify.com/user/{}",
  "SoundCloud":     "https://soundcloud.com/{}",
  "Flickr":         "https://flickr.com/people/{}",
  "Tumblr":         "https://{}.tumblr.com",
  "Vimeo":          "https://vimeo.com/{}",
  "Dribbble":       "https://dribbble.com/{}",
  "Behance":        "https://behance.net/{}",
  "Product Hunt":   "https://producthunt.com/@{}",
  "Hacker News":    "https://news.ycombinator.com/user?id={}",
  "Mastodon":       "https://mastodon.social/@{}",
  "Bluesky":        "https://bsky.app/profile/{}.bsky.social",
  "Gravatar":       "https://gravatar.com/{}",
};

export function investigateUsername(raw: string): InvestigationResult {
  const username = raw.replace(/^@/, "").trim();
  const isValid = username.length >= 1 && username.length <= 50 && /^[a-zA-Z0-9._-]+$/.test(username);

  if (!isValid) {
    return {
      input: raw, normalized: username, entityType: "username",
      isValid: false,
      validationMsg: "اسم المستخدم غير صالح — يجب أن يحتوي على حروف لاتينية وأرقام فقط (. _ - مسموح).",
      summary: "", confidence: "low", riskScore: 0, findings: [],
      platforms: [], externalLinks: [], metadata: [], steps: [],
    };
  }

  const platforms: PlatformResult[] = USERNAME_PLATFORMS.map((p) => ({
    ...p,
    url: USERNAME_URLS[p.name]?.replace("{}", username) ?? "#",
  }));

  const hasNumbers = /\d/.test(username);
  const hasSpecial = /[._-]/.test(username);
  const findings: Finding[] = [
    { label: "الطول",           value: `${username.length} حرفاً`,                    status: username.length >= 4 ? "success" : "warning" },
    { label: "أحرف",            value: /[a-zA-Z]/.test(username) ? "لاتينية" : "—",   status: "info" },
    { label: "أرقام",           value: hasNumbers ? "نعم" : "لا",                     status: "neutral" },
    { label: "محارف خاصة",      value: hasSpecial ? ". _ -" : "لا",                   status: "neutral" },
    { label: "حالة الأحرف",     value: username === username.toLowerCase() ? "صغيرة" : "مختلطة", status: "info" },
    { label: "المنصات المفحوصة", value: `${platforms.length} منصة`,                    status: "success" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "WhatsMyName",   url: `https://whatsmyname.app/?q=${username}`,                    category: "Username", categoryAr: "بحث أسماء",   free: true,  description: "بحث شامل عبر المنصات" },
    { name: "Namecheckr",    url: `https://namecheckr.com/`,                                   category: "Username", categoryAr: "بحث أسماء",   free: true,  description: "فحص توفر الاسم" },
    { name: "UserSearch.org",url: `https://usersearch.org/results.php?fname=${username}`,      category: "Search",   categoryAr: "بحث",         free: true,  description: "بحث موحد عن الأسماء" },
    { name: "Sherlock (CLI)",url: `https://github.com/sherlock-project/sherlock`,              category: "Tool",     categoryAr: "أداة",        free: true,  description: "أداة Python لفحص 300+ موقع" },
    { name: "Google",        url: `https://www.google.com/search?q="${username}"+site:twitter.com+OR+site:instagram.com`, category: "Search", categoryAr: "بحث", free: true, description: "بحث Google المتقدم" },
  ];

  return {
    input: raw, normalized: username, entityType: "username",
    isValid: true, validationMsg: "اسم مستخدم صالح",
    summary: `تم إنشاء ${platforms.length} رابط للتحقق من حضور "@${username}" عبر المنصات المختلفة.`,
    confidence: "high", riskScore: 45, findings, platforms, externalLinks,
    metadata: [
      { k: "اسم المستخدم",     v: username },
      { k: "بصيغة @",          v: "@" + username },
      { k: "المنصات",          v: platforms.length.toString() },
      { k: "نوع الكيان",       v: "Username" },
    ],
    steps: ["تطبيع الاسم", "التحقق من الصيغة", "توليد روابط المنصات", "تحليل الخصائص", "تجهيز الأدوات"],
  };
}

// ─── Email Engine ────────────────────────────────────────────────────────────

export function investigateEmail(raw: string): InvestigationResult {
  const email = raw.trim().toLowerCase();
  const isValid = isValidEmail(email);

  if (!isValid) {
    return {
      input: raw, normalized: email, entityType: "email",
      isValid: false, validationMsg: "صيغة البريد الإلكتروني غير صحيحة.",
      summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [],
    };
  }

  const [localPart, domain] = email.split("@");
  const tld = domain.split(".").pop()!;
  const freeProviders = ["gmail", "yahoo", "hotmail", "outlook", "protonmail", "icloud", "yandex", "mail", "aol", "live"];
  const isFreeProvider = freeProviders.some((p) => domain.includes(p));

  const findings: Finding[] = [
    { label: "الجزء المحلي",   value: localPart,                                                                   status: "info" },
    { label: "النطاق",         value: domain,                                                                      status: "info" },
    { label: "TLD",            value: `.${tld}`,                                                                   status: "info" },
    { label: "نوع المزود",     value: isFreeProvider ? "مزود مجاني (Gmail/Yahoo...)" : "نطاق خاص / شركة",        status: isFreeProvider ? "warning" : "success" },
    { label: "أرقام في الاسم", value: /\d/.test(localPart) ? "نعم" : "لا",                                       status: /\d/.test(localPart) ? "warning" : "neutral" },
    { label: "طول الجزء المحلي", value: `${localPart.length} حرفاً`,                                              status: "info" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "HaveIBeenPwned", url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`, category: "Breach",    categoryAr: "تسريبات", free: true,  description: "فحص التسريبات" },
    { name: "Epieos",         url: `https://epieos.com/?q=${encodeURIComponent(email)}&t=email`,      category: "OSINT",     categoryAr: "OSINT",   free: true,  description: "بحث OSINT متقدم لـ Google" },
    { name: "Hunter.io",      url: `https://hunter.io/email-verifier/${encodeURIComponent(email)}`,  category: "Verify",    categoryAr: "تحقق",    free: true,  description: "التحقق من صحة البريد" },
    { name: "GHunt (CLI)",    url: `https://github.com/mxrch/GHunt`,                                 category: "Tool",      categoryAr: "أداة",    free: true,  description: "استخراج بيانات حسابات Google" },
    { name: "Gravatar",       url: `https://en.gravatar.com/${localPart}`,                            category: "Identity",  categoryAr: "هوية",    free: true,  description: "فحص ارتباط البريد بصورة" },
    { name: "Snov.io",        url: `https://snov.io/email-verifier`,                                 category: "Verify",    categoryAr: "تحقق",    free: true,  description: "التحقق من صحة البريد" },
    { name: "MailTester",     url: `https://www.mail-tester.com/`,                                   category: "DNS",       categoryAr: "DNS",     free: true,  description: "اختبار سجلات DNS" },
  ];

  return {
    input: raw, normalized: email, entityType: "email",
    isValid: true, validationMsg: "بريد إلكتروني صالح",
    summary: `تحليل "${email}" — نطاق: ${domain}${isFreeProvider ? " (مزود مجاني)" : " (خاص)"}. تجهيز ${externalLinks.length} أداة.`,
    confidence: "high", riskScore: 30, findings, externalLinks,
    metadata: [
      { k: "البريد الإلكتروني", v: email },
      { k: "الجزء المحلي",      v: localPart },
      { k: "النطاق",            v: domain },
      { k: "TLD",               v: `.${tld}` },
      { k: "نوع المزود",        v: isFreeProvider ? "مجاني" : "خاص/شركة" },
      { k: "نوع الكيان",        v: "Email Address" },
    ],
    steps: ["تطبيع البريد", "التحقق من الصيغة", "تحليل النطاق", "تجهيز الأدوات"],
  };
}

// ─── IP Engine ───────────────────────────────────────────────────────────────

export function investigateIP(raw: string): InvestigationResult {
  const ip = raw.trim();
  const isIPv4 = isValidIPv4(ip);
  const isIPv6 = isValidIPv6(ip);
  const isValid = isIPv4 || isIPv6;

  if (!isValid) {
    return {
      input: raw, normalized: ip, entityType: "ip",
      isValid: false, validationMsg: "عنوان IP غير صالح (IPv4 أو IPv6 مطلوب).",
      summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [],
    };
  }

  const isPrivate = isIPv4
    ? isPrivateIP(ip)
    : ip.startsWith("::1") || ip.startsWith("fc") || ip.startsWith("fd");
  const isLoopback = ip === "127.0.0.1" || ip === "::1";

  const findings: Finding[] = [
    { label: "النوع",           value: isIPv4 ? "IPv4" : "IPv6",                                                  status: "info" },
    { label: "النطاق",          value: isLoopback ? "Loopback" : isPrivate ? "شبكة خاصة (Private)" : "عنوان عام (Public)", status: isPrivate ? "warning" : "info" },
    { label: "قابلية الفحص",   value: isPrivate ? "لا (شبكة محلية)" : "نعم (عنوان عام)",                         status: isPrivate ? "warning" : "success" },
  ];

  if (isIPv4 && !isPrivate) {
    const o = ip.split(".").map(Number);
    if (o[0] === 8 && (o[1] === 8 || o[1] === 4)) {
      findings.push({ label: "مزود محتمل", value: "Google DNS / Services", status: "info" });
    }
    if ((o[0] === 1 && o[1] === 1) || (o[0] === 1 && o[1] === 0)) {
      findings.push({ label: "مزود محتمل", value: "Cloudflare DNS", status: "info" });
    }
  }

  const externalLinks: ExternalLink[] = [
    { name: "Shodan",       url: `https://shodan.io/host/${ip}`,                                             category: "Recon",       categoryAr: "استطلاع",   free: false, description: "فحص المنافذ والخدمات" },
    { name: "AbuseIPDB",   url: `https://www.abuseipdb.com/check/${ip}`,                                    category: "Reputation",  categoryAr: "سمعة",      free: true,  description: "تقارير الإساءة والسمعة" },
    { name: "VirusTotal",  url: `https://virustotal.com/gui/ip-address/${ip}`,                              category: "Threat Intel",categoryAr: "استخبارات", free: true,  description: "فحص محركات الأمان" },
    { name: "IPInfo.io",   url: `https://ipinfo.io/${ip}`,                                                  category: "Geo",         categoryAr: "موقع",      free: true,  description: "الموقع الجغرافي والASN" },
    { name: "Censys",      url: `https://search.censys.io/hosts/${ip}`,                                     category: "Recon",       categoryAr: "استطلاع",   free: true,  description: "بيانات البنية التحتية" },
    { name: "Gray Noise",  url: `https://www.greynoise.io/viz/ip/${ip}`,                                    category: "Threat Intel",categoryAr: "استخبارات", free: true,  description: "تحليل سلوك الـ IP" },
    { name: "Talos Intel", url: `https://talosintelligence.com/reputation_center/lookup?search=${ip}`,      category: "Reputation",  categoryAr: "سمعة",      free: true,  description: "بيانات Cisco Talos" },
    { name: "MXToolbox",   url: `https://mxtoolbox.com/SuperTool.aspx?action=blacklist%3a${ip}`,            category: "Reputation",  categoryAr: "سمعة",      free: true,  description: "فحص القائمة السوداء" },
  ];

  return {
    input: raw, normalized: ip, entityType: "ip",
    isValid: true, validationMsg: `عنوان ${isIPv4 ? "IPv4" : "IPv6"} صالح`,
    summary: isPrivate
      ? `"${ip}" — عنوان شبكة خاصة، لا يمكن استطلاعه خارجياً.`
      : `تحليل "${ip}" — عنوان عام. تجهيز ${externalLinks.length} أداة للاستطلاع.`,
    confidence: isPrivate ? "medium" : "high",
    riskScore: isPrivate ? 10 : 50,
    findings, externalLinks,
    metadata: [
      { k: "عنوان IP",    v: ip },
      { k: "الإصدار",     v: isIPv4 ? "IPv4" : "IPv6" },
      { k: "النطاق",      v: isLoopback ? "Loopback" : isPrivate ? "Private" : "Public" },
      { k: "نوع الكيان",  v: "IP Address" },
    ],
    steps: ["التحقق من الصيغة", "تحديد النوع والنطاق", "تجهيز الأدوات"],
  };
}

// ─── Domain Engine ───────────────────────────────────────────────────────────

export function investigateDomain(raw: string): InvestigationResult {
  let domain = raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split("?")[0];
  const isValid = isValidDomain(domain);

  if (!isValid) {
    return {
      input: raw, normalized: domain, entityType: "domain",
      isValid: false, validationMsg: "صيغة النطاق غير صحيحة.",
      summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [],
    };
  }

  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  const isSubdomain = parts.length > 2;
  const suspiciousTLDs = ["xyz", "tk", "ml", "ga", "cf", "gq", "pw", "top", "click", "download"];
  const isSuspicious = suspiciousTLDs.includes(tld);

  const findings: Finding[] = [
    { label: "النطاق",         value: domain,                                                                    status: "info" },
    { label: "TLD",            value: `.${tld}`,                                                                 status: isSuspicious ? "danger" : "success" },
    { label: "SLD",            value: sld,                                                                       status: "info" },
    { label: "نطاق فرعي",      value: isSubdomain ? `نعم (${parts.slice(0, -2).join(".")})` : "لا",            status: "neutral" },
    { label: "TLD المشبوه",    value: isSuspicious ? "⚠ يستخدم غالباً في النصب" : "موثوق",                    status: isSuspicious ? "danger" : "success" },
    { label: "طول الاسم",      value: `${domain.length} حرفاً`,                                                  status: domain.length > 30 ? "warning" : "success" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "WHOIS",           url: `https://who.is/whois/${domain}`,                    category: "Registrar",  categoryAr: "تسجيل",     free: true,  description: "بيانات التسجيل والتاريخ" },
    { name: "DNSDumpster",     url: `https://dnsdumpster.com/`,                          category: "DNS",        categoryAr: "DNS",       free: true,  description: "سجلات DNS والنطاقات الفرعية" },
    { name: "crt.sh",          url: `https://crt.sh/?q=${domain}`,                      category: "SSL",        categoryAr: "SSL",       free: true,  description: "شهادات SSL والنطاقات الفرعية" },
    { name: "VirusTotal",      url: `https://virustotal.com/gui/domain/${domain}`,       category: "Threat Intel",categoryAr: "استخبارات",free: true,  description: "الاستخبارات الأمنية" },
    { name: "Shodan",          url: `https://shodan.io/domain/${domain}`,                category: "Recon",      categoryAr: "استطلاع",   free: false, description: "البنية التحتية والخدمات" },
    { name: "Wayback Machine", url: `https://web.archive.org/web/*/${domain}`,           category: "Archive",    categoryAr: "أرشيف",     free: true,  description: "النسخ الأرشيفية" },
    { name: "BuiltWith",       url: `https://builtwith.com/${domain}`,                  category: "Tech Stack", categoryAr: "تقنيات",    free: true,  description: "تقنيات بناء الموقع" },
    { name: "SecurityTrails",  url: `https://securitytrails.com/domain/${domain}`,      category: "DNS",        categoryAr: "DNS",       free: true,  description: "تاريخ DNS الكامل" },
    { name: "ViewDNS",         url: `https://viewdns.info/reverseip/?host=${domain}&t=1`,category: "DNS",        categoryAr: "DNS",       free: true,  description: "الـ IP والنطاقات المشتركة" },
  ];

  return {
    input: raw, normalized: domain, entityType: "domain",
    isValid: true, validationMsg: "نطاق صالح",
    summary: `تحليل "${domain}" — TLD: .${tld}${isSuspicious ? " ⚠ TLD مشبوه" : ""}. تجهيز ${externalLinks.length} أداة.`,
    confidence: "high", riskScore: isSuspicious ? 65 : 30, findings, externalLinks,
    metadata: [
      { k: "النطاق",      v: domain },
      { k: "TLD",         v: `.${tld}` },
      { k: "SLD",         v: sld },
      { k: "نطاق فرعي",  v: isSubdomain ? "نعم" : "لا" },
      { k: "TLD مشبوه",  v: isSuspicious ? "نعم" : "لا" },
      { k: "نوع الكيان", v: "Domain" },
    ],
    steps: ["تطبيع النطاق", "تحليل الأجزاء", "تقييم المخاطر", "تجهيز الأدوات"],
  };
}

// ─── Phone Engine ────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { code: "+966",  ar: "السعودية",         en: "Saudi Arabia" },
  { code: "+971",  ar: "الإمارات",          en: "UAE" },
  { code: "+973",  ar: "البحرين",           en: "Bahrain" },
  { code: "+974",  ar: "قطر",              en: "Qatar" },
  { code: "+965",  ar: "الكويت",           en: "Kuwait" },
  { code: "+968",  ar: "عُمان",            en: "Oman" },
  { code: "+967",  ar: "اليمن",            en: "Yemen" },
  { code: "+880",  ar: "بنغلاديش",         en: "Bangladesh" },
  { code: "+212",  ar: "المغرب",           en: "Morocco" },
  { code: "+213",  ar: "الجزائر",          en: "Algeria" },
  { code: "+216",  ar: "تونس",             en: "Tunisia" },
  { code: "+20",   ar: "مصر",             en: "Egypt" },
  { code: "+44",   ar: "المملكة المتحدة",   en: "United Kingdom" },
  { code: "+49",   ar: "ألمانيا",           en: "Germany" },
  { code: "+33",   ar: "فرنسا",            en: "France" },
  { code: "+81",   ar: "اليابان",           en: "Japan" },
  { code: "+82",   ar: "كوريا الجنوبية",   en: "South Korea" },
  { code: "+86",   ar: "الصين",            en: "China" },
  { code: "+90",   ar: "تركيا",            en: "Turkey" },
  { code: "+91",   ar: "الهند",            en: "India" },
  { code: "+92",   ar: "باكستان",          en: "Pakistan" },
  { code: "+55",   ar: "البرازيل",         en: "Brazil" },
  { code: "+7",    ar: "روسيا",            en: "Russia" },
  { code: "+1",    ar: "أمريكا/كندا",      en: "USA/Canada" },
];

export function investigatePhone(raw: string): InvestigationResult {
  const cleaned = raw.replace(/[\s\-\(\)\.]/g, "");
  const isValid = /^\+?[\d]{7,15}$/.test(cleaned);

  if (!isValid) {
    return {
      input: raw, normalized: cleaned, entityType: "phone",
      isValid: false, validationMsg: "رقم الهاتف غير صالح — استخدم التنسيق الدولي مثل +966XXXXXXXXX",
      summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [],
    };
  }

  const normalized = cleaned.startsWith("+") ? cleaned : "+" + cleaned;
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  const countryInfo = sorted.find((c) => normalized.startsWith(c.code));

  const findings: Finding[] = [
    { label: "الرقم المطبّع",    value: normalized,                                                   status: "info" },
    { label: "الدولة",           value: countryInfo ? `${countryInfo.ar} (${countryInfo.en})` : "غير محددة", status: countryInfo ? "success" : "warning" },
    { label: "رمز الدولة",      value: countryInfo?.code ?? "غير معروف",                             status: countryInfo ? "info" : "warning" },
    { label: "طول الرقم",       value: `${normalized.length - 1} رقماً (بدون +)`,                   status: "info" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "Truecaller",    url: `https://www.truecaller.com/search/sa/${normalized.replace("+", "")}`, category: "ID",     categoryAr: "هوية",  free: true,  description: "هوية صاحب الرقم" },
    { name: "PhoneInfoga",   url: `https://github.com/sundowndev/phoneinfoga`,                           category: "Tool",   categoryAr: "أداة",  free: true,  description: "أداة OSINT متقدمة" },
    { name: "Sync.me",       url: `https://sync.me/search/?phone=${normalized}`,                        category: "ID",     categoryAr: "هوية",  free: true,  description: "البحث عن الهوية" },
    { name: "NumVerify",     url: `https://numverify.com/`,                                              category: "Verify", categoryAr: "تحقق",  free: true,  description: "التحقق والمشغل" },
    { name: "Google Search", url: `https://www.google.com/search?q="${normalized}"`,                     category: "Search", categoryAr: "بحث",   free: true,  description: "بحث Google عن الرقم" },
  ];

  return {
    input: raw, normalized, entityType: "phone",
    isValid: true, validationMsg: "رقم هاتف صالح",
    summary: `تحليل "${normalized}" — الدولة: ${countryInfo?.ar ?? "غير محددة"}. تجهيز ${externalLinks.length} أداة.`,
    confidence: countryInfo ? "high" : "medium", riskScore: 35, findings, externalLinks,
    metadata: [
      { k: "الرقم الأصلي",    v: raw },
      { k: "الرقم المطبّع",   v: normalized },
      { k: "الدولة",          v: countryInfo?.ar ?? "غير محددة" },
      { k: "رمز الدولة",     v: countryInfo?.code ?? "—" },
      { k: "نوع الكيان",      v: "Phone Number" },
    ],
    steps: ["تطبيع الرقم", "كشف رمز الدولة", "تجهيز الأدوات"],
  };
}

// ─── Crypto Engine ───────────────────────────────────────────────────────────

function detectCrypto(addr: string) {
  if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr))
    return { type: "Bitcoin Legacy", typeAr: "بيتكوين (Classic)", explorer: `https://www.blockchain.com/explorer/addresses/btc/${addr}` };
  if (/^bc1[a-z0-9]{39,59}$/.test(addr))
    return { type: "Bitcoin SegWit", typeAr: "بيتكوين (SegWit)", explorer: `https://www.blockchain.com/explorer/addresses/btc/${addr}` };
  if (/^0x[a-fA-F0-9]{40}$/.test(addr))
    return { type: "Ethereum / ERC-20", typeAr: "إيثريوم / ERC-20", explorer: `https://etherscan.io/address/${addr}` };
  if (/^L[a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(addr))
    return { type: "Litecoin", typeAr: "لايتكوين (LTC)", explorer: `https://blockchair.com/litecoin/address/${addr}` };
  if (/^r[0-9a-zA-Z]{24,34}$/.test(addr))
    return { type: "XRP Ripple", typeAr: "ريبل (XRP)", explorer: `https://xrpscan.com/account/${addr}` };
  if (/^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/.test(addr))
    return { type: "Dogecoin", typeAr: "دوجكوين (DOGE)", explorer: `https://blockchair.com/dogecoin/address/${addr}` };
  if (/^(tz|KT)[0-9a-zA-Z]{34}$/.test(addr))
    return { type: "Tezos", typeAr: "تيزوس (XTZ)", explorer: `https://tzstats.com/${addr}` };
  return null;
}

export function investigateCrypto(raw: string): InvestigationResult {
  const address = raw.trim();
  const info = detectCrypto(address);

  if (!info) {
    return {
      input: raw, normalized: address, entityType: "crypto",
      isValid: false, validationMsg: "تعذّر التعرف على نوع العملة أو صيغة العنوان غير صحيحة.",
      summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [],
    };
  }

  const findings: Finding[] = [
    { label: "نوع العملة",    value: info.typeAr,                         status: "info" },
    { label: "صيغة العنوان",  value: "صحيحة ✓",                          status: "success" },
    { label: "طول العنوان",   value: `${address.length} حرفاً`,           status: "info" },
    { label: "بادئة العنوان", value: address.substring(0, 6) + "...",     status: "info" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "Blockchain Explorer", url: info.explorer,                                        category: "Blockchain", categoryAr: "بلوكشين",  free: true,  description: "المعاملات والرصيد" },
    { name: "Blockchair",          url: `https://blockchair.com/search?q=${address}`,         category: "Blockchain", categoryAr: "بلوكشين",  free: true,  description: "استعلام متقدم" },
    { name: "Breadcrumbs",         url: `https://www.breadcrumbs.app/reports/new?address=${address}`, category: "Analytics", categoryAr: "تحليلات", free: true,  description: "تتبع مسار المعاملات" },
    { name: "CryptoScamDB",        url: `https://cryptoscamdb.org/scams`,                    category: "Fraud",      categoryAr: "احتيال",   free: true,  description: "قائمة الاحتيال" },
    { name: "Chainalysis Reactor",  url: `https://reactor.chainalysis.com/`,                  category: "Analytics", categoryAr: "تحليلات",  free: false, description: "تحليل جنائي متقدم" },
  ];

  return {
    input: raw, normalized: address, entityType: "crypto",
    isValid: true, validationMsg: `عنوان ${info.typeAr} صالح`,
    summary: `تحليل محفظة "${address.substring(0, 10)}..." — ${info.typeAr}. تجهيز ${externalLinks.length} أداة.`,
    confidence: "high", riskScore: 40, findings, externalLinks,
    metadata: [
      { k: "العنوان",      v: address },
      { k: "نوع العملة",   v: info.type },
      { k: "طول العنوان",  v: address.length.toString() },
      { k: "نوع الكيان",   v: "Crypto Wallet" },
    ],
    steps: ["التحقق من الصيغة", "تحديد نوع العملة", "تجهيز روابط البلوكشين"],
  };
}

// ─── Person Engine ───────────────────────────────────────────────────────────

export function investigatePerson(raw: string): InvestigationResult {
  const name = raw.trim();

  if (name.length < 2) {
    return {
      input: raw, normalized: name, entityType: "person",
      isValid: false, validationMsg: "الاسم قصير جداً — أدخل الاسم الكامل للنتائج الأفضل.",
      summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [],
    };
  }

  const parts = name.split(/\s+/);
  const isArabic = /[؀-ۿ]/.test(name);
  const wordCount = parts.length;
  const enc = encodeURIComponent(name);

  const findings: Finding[] = [
    { label: "عدد الكلمات", value: `${wordCount} كلمة`,                                           status: wordCount >= 2 ? "success" : "warning" },
    { label: "لغة الاسم",  value: isArabic ? "عربي" : "لاتيني/أجنبي",                            status: "info" },
    { label: "الاسم الأول", value: parts[0],                                                       status: "info" },
    { label: "جودة البحث", value: wordCount >= 3 ? "ممتازة" : wordCount === 2 ? "جيدة" : "محدودة", status: wordCount >= 2 ? "success" : "warning" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "LinkedIn",     url: `https://www.linkedin.com/search/results/all/?keywords=${enc}`,   category: "Professional", categoryAr: "مهني",         free: true,  description: "الملفات المهنية" },
    { name: "Facebook",     url: `https://www.facebook.com/search/top/?q=${enc}`,                  category: "Social",       categoryAr: "تواصل",        free: true,  description: "الحسابات الاجتماعية" },
    { name: "Twitter / X",  url: `https://x.com/search?q=${enc}&f=user`,                          category: "Social",       categoryAr: "تواصل",        free: true,  description: "حسابات تويتر" },
    { name: "Google",       url: `https://www.google.com/search?q="${enc}"`,                       category: "Search",       categoryAr: "بحث",          free: true,  description: "بحث Google العام" },
    { name: "Google News",  url: `https://news.google.com/search?q="${enc}"`,                      category: "News",         categoryAr: "أخبار",        free: true,  description: "المقالات الإخبارية" },
    { name: "Pipl",         url: `https://pipl.com/search/?q=${enc}`,                             category: "People",       categoryAr: "بحث أشخاص",    free: false, description: "بيانات الأشخاص" },
    { name: "Bing",         url: `https://www.bing.com/search?q="${enc}"`,                         category: "Search",       categoryAr: "بحث",          free: true,  description: "بحث Bing" },
    { name: "IntelX",       url: `https://intelx.io/?s=${enc}`,                                   category: "OSINT",        categoryAr: "OSINT",        free: true,  description: "بحث OSINT في محفوظات الإنترنت" },
  ];

  return {
    input: raw, normalized: name, entityType: "person",
    isValid: true, validationMsg: "اسم صالح",
    summary: `بحث عن "${name}" — ${wordCount} كلمة${isArabic ? " (اسم عربي)" : ""}. تجهيز ${externalLinks.length} قناة بحث.`,
    confidence: wordCount >= 2 ? "medium" : "low", riskScore: 20, findings, externalLinks,
    metadata: [
      { k: "الاسم الكامل",  v: name },
      { k: "الاسم الأول",  v: parts[0] },
      { k: "اللغة",         v: isArabic ? "عربي" : "لاتيني" },
      { k: "عدد الكلمات",   v: wordCount.toString() },
      { k: "نوع الكيان",    v: "Person Name" },
    ],
    steps: ["تحليل الاسم", "تقدير جودة البحث", "تجهيز قنوات البحث"],
  };
}

// ─── IOC Engine ──────────────────────────────────────────────────────────────

export function investigateIOC(raw: string): InvestigationResult {
  const extracted: ExtractedIOC = {
    ips: [], domains: [], emails: [], urls: [],
    md5: [], sha1: [], sha256: [],
    btcAddresses: [], ethAddresses: [], cves: [],
  };

  const ipMatches = raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? [];
  extracted.ips = [...new Set(ipMatches.filter((ip) => ip.split(".").every((n) => +n <= 255)))];

  const emailMatches = raw.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g) ?? [];
  extracted.emails = [...new Set(emailMatches)];

  const urlMatches = raw.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  extracted.urls = [...new Set(urlMatches)];

  const domainMatches = raw.match(/\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g) ?? [];
  extracted.domains = [
    ...new Set(
      domainMatches.filter(
        (d) => isValidDomain(d) && !extracted.ips.includes(d) && !extracted.emails.some((e) => e.includes(d))
      )
    ),
  ].slice(0, 20);

  extracted.md5     = [...new Set(raw.match(/\b[a-fA-F0-9]{32}\b/g) ?? [])];
  extracted.sha1    = [...new Set(raw.match(/\b[a-fA-F0-9]{40}\b/g) ?? [])];
  extracted.sha256  = [...new Set(raw.match(/\b[a-fA-F0-9]{64}\b/g) ?? [])];
  extracted.btcAddresses = [...new Set(raw.match(/\b(?:bc1|[13])[a-km-zA-HJ-NP-Z1-9]{25,59}\b/g) ?? [])];
  extracted.ethAddresses = [...new Set(raw.match(/\b0x[a-fA-F0-9]{40}\b/g) ?? [])];
  extracted.cves    = [...new Set(raw.match(/CVE-\d{4}-\d{4,7}/gi) ?? [])];

  const total =
    extracted.ips.length + extracted.domains.length + extracted.emails.length +
    extracted.urls.length + extracted.md5.length + extracted.sha1.length +
    extracted.sha256.length + extracted.btcAddresses.length + extracted.ethAddresses.length +
    extracted.cves.length;

  const findings: Finding[] = [
    { label: "عناوين IP",     value: extracted.ips.length.toString(),           status: extracted.ips.length     > 0 ? "warning" : "neutral" },
    { label: "نطاقات",        value: extracted.domains.length.toString(),        status: extracted.domains.length > 0 ? "warning" : "neutral" },
    { label: "بريد إلكتروني", value: extracted.emails.length.toString(),         status: extracted.emails.length  > 0 ? "warning" : "neutral" },
    { label: "روابط URL",     value: extracted.urls.length.toString(),           status: extracted.urls.length    > 0 ? "info"    : "neutral" },
    { label: "هاشات MD5",    value: extracted.md5.length.toString(),            status: extracted.md5.length     > 0 ? "danger"  : "neutral" },
    { label: "هاشات SHA-1",  value: extracted.sha1.length.toString(),           status: extracted.sha1.length    > 0 ? "danger"  : "neutral" },
    { label: "هاشات SHA-256",value: extracted.sha256.length.toString(),         status: extracted.sha256.length  > 0 ? "danger"  : "neutral" },
    { label: "محافظ BTC",    value: extracted.btcAddresses.length.toString(),   status: extracted.btcAddresses.length > 0 ? "warning" : "neutral" },
    { label: "محافظ ETH",    value: extracted.ethAddresses.length.toString(),   status: extracted.ethAddresses.length > 0 ? "warning" : "neutral" },
    { label: "ثغرات CVE",    value: extracted.cves.length.toString(),           status: extracted.cves.length    > 0 ? "danger"  : "neutral" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "VirusTotal",     url: `https://virustotal.com`,             category: "Threat Intel", categoryAr: "استخبارات", free: true,  description: "فحص IOCs" },
    { name: "OTX AlienVault", url: `https://otx.alienvault.com`,        category: "Threat Intel", categoryAr: "استخبارات", free: true,  description: "استخبارات التهديدات" },
    { name: "IOC Parser",     url: `https://ioc-parser.com`,            category: "Tool",         categoryAr: "أداة",      free: true,  description: "تحليل المؤشرات" },
    { name: "MISP",           url: `https://misp-project.org`,          category: "Platform",     categoryAr: "منصة",      free: true,  description: "مشاركة بيانات التهديد" },
  ];

  return {
    input: raw.substring(0, 100) + (raw.length > 100 ? "..." : ""),
    normalized: raw, entityType: "ioc",
    isValid: true, validationMsg: `تم استخراج ${total} مؤشر`,
    summary: `تحليل ${raw.length} حرف → ${total} مؤشر: ${extracted.ips.length} IP، ${extracted.domains.length} نطاق، ${extracted.emails.length} بريد، ${extracted.sha256.length + extracted.sha1.length + extracted.md5.length} هاش، ${extracted.cves.length} CVE.`,
    confidence: total > 0 ? "high" : "low", riskScore: Math.min(100, total * 10),
    findings, extracted, externalLinks,
    metadata: [
      { k: "طول النص",        v: `${raw.length} حرفاً` },
      { k: "إجمالي المؤشرات", v: total.toString() },
      { k: "نوع الكيان",      v: "IOC Text" },
    ],
    steps: ["استخراج IPs", "استخراج النطاقات", "استخراج البريد", "استخراج الهاشات", "استخراج العملات", "استخراج CVEs"],
  };
}

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

export function runInvestigation(type: OsintType, input: string): InvestigationResult {
  switch (type) {
    case "username": return investigateUsername(input);
    case "email":    return investigateEmail(input);
    case "ip":       return investigateIP(input);
    case "domain":   return investigateDomain(input);
    case "phone":    return investigatePhone(input);
    case "crypto":   return investigateCrypto(input);
    case "person":   return investigatePerson(input);
    case "ioc":      return investigateIOC(input);
    default:         throw new Error("Unknown OSINT type: " + type);
  }
}

export const SAMPLES: Record<OsintType, string> = {
  username: "elonmusk",
  email:    "test@gmail.com",
  ip:       "8.8.8.8",
  domain:   "google.com",
  phone:    "+966501234567",
  crypto:   "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  person:   "محمد بن سلمان",
  ioc:      "Suspect IPs: 192.168.1.50, 203.0.113.10\nEmail: attacker@evil.xyz\nHash: 5d41402abc4b2a76b9719d911017c592\nSHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\nDomain: malicious-c2.xyz\nCVE-2024-12345\nBTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
};

export const OSINT_TYPES: OsintType[] = ["username", "email", "ip", "domain", "phone", "crypto", "person", "ioc"];
