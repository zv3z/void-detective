// Server-side OSINT investigation engine
// Runs all analysis server-side (no CORS issues, full API access)

export type OsintType = "username" | "email" | "ip" | "domain" | "phone" | "crypto" | "person" | "ioc";

export interface Finding {
  label: string;
  value: string;
  status: "info" | "success" | "warning" | "danger" | "neutral";
}

export interface ExternalLink {
  name: string;
  url: string;
  category: string;
  categoryAr: string;
  free: boolean;
  description: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

async function safeFetch(url: string, opts?: RequestInit): Promise<Response | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000), ...opts });
    return resp;
  } catch {
    return null;
  }
}

// ─── IP Engine ────────────────────────────────────────────────────────────────

async function investigateIP(raw: string): Promise<InvestigationResult> {
  const ip = raw.trim();
  const isIPv4 = isValidIPv4(ip);
  const isIPv6 = isValidIPv6(ip);
  if (!isIPv4 && !isIPv6) {
    return { input: raw, normalized: ip, entityType: "ip", isValid: false,
      validationMsg: "عنوان IP غير صالح.", summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [] };
  }

  const isPrivate = isIPv4 ? isPrivateIP(ip) : ip.startsWith("::1") || ip.startsWith("fc") || ip.startsWith("fd");
  const isLoopback = ip === "127.0.0.1" || ip === "::1";

  const findings: Finding[] = [
    { label: "النوع",         value: isIPv4 ? "IPv4" : "IPv6",                                    status: "info" },
    { label: "النطاق",        value: isLoopback ? "Loopback" : isPrivate ? "شبكة خاصة" : "عام",   status: isPrivate ? "warning" : "info" },
    { label: "قابل للاستطلاع", value: isPrivate ? "لا" : "نعم",                                    status: isPrivate ? "warning" : "success" },
  ];

  const metadata: { k: string; v: string }[] = [
    { k: "عنوان IP", v: ip },
    { k: "الإصدار",  v: isIPv4 ? "IPv4" : "IPv6" },
    { k: "النوع",    v: isLoopback ? "Loopback" : isPrivate ? "Private" : "Public" },
  ];

  let geoSummary = "";
  if (isIPv4 && !isPrivate && !isLoopback) {
    const resp = await safeFetch(`https://ipapi.co/${ip}/json/`);
    if (resp?.ok) {
      try {
        const geo = await resp.json() as Record<string, unknown>;
        if (geo.country_name) { findings.push({ label: "الدولة",         value: String(geo.country_name), status: "success" }); geoSummary = String(geo.country_name); }
        if (geo.region)       findings.push({ label: "المنطقة",          value: String(geo.region),       status: "info" });
        if (geo.city)         findings.push({ label: "المدينة",           value: String(geo.city),         status: "info" });
        if (geo.org)          findings.push({ label: "المزود (ASN)",      value: String(geo.org),          status: "info" });
        if (geo.timezone)     findings.push({ label: "المنطقة الزمنية",   value: String(geo.timezone),     status: "neutral" });
        if (geo.latitude && geo.longitude)
          metadata.push({ k: "الإحداثيات", v: `${geo.latitude}, ${geo.longitude}` });
        if (geo.currency)     metadata.push({ k: "العملة", v: String(geo.currency) });
      } catch { /* JSON parse error, skip */ }
    }
  }

  const externalLinks: ExternalLink[] = [
    { name: "Shodan",      url: `https://shodan.io/host/${ip}`,                                                  category: "Recon",        categoryAr: "استطلاع",   free: false, description: "المنافذ والخدمات" },
    { name: "AbuseIPDB",   url: `https://www.abuseipdb.com/check/${ip}`,                                        category: "Reputation",   categoryAr: "سمعة",      free: true,  description: "تقارير الإساءة" },
    { name: "VirusTotal",  url: `https://virustotal.com/gui/ip-address/${ip}`,                                   category: "Threat Intel", categoryAr: "استخبارات", free: true,  description: "محركات الأمان" },
    { name: "IPInfo.io",   url: `https://ipinfo.io/${ip}`,                                                      category: "Geo",          categoryAr: "موقع",      free: true,  description: "الموقع والASN" },
    { name: "Censys",      url: `https://search.censys.io/hosts/${ip}`,                                         category: "Recon",        categoryAr: "استطلاع",   free: true,  description: "بيانات البنية التحتية" },
    { name: "GreyNoise",   url: `https://www.greynoise.io/viz/ip/${ip}`,                                        category: "Threat Intel", categoryAr: "استخبارات", free: true,  description: "سلوك الـ IP" },
    { name: "Talos Intel", url: `https://talosintelligence.com/reputation_center/lookup?search=${ip}`,          category: "Reputation",   categoryAr: "سمعة",      free: true,  description: "بيانات Cisco Talos" },
    { name: "MXToolbox",   url: `https://mxtoolbox.com/SuperTool.aspx?action=blacklist%3a${ip}`,                category: "Reputation",   categoryAr: "سمعة",      free: true,  description: "القائمة السوداء" },
  ];

  return {
    input: raw, normalized: ip, entityType: "ip", isValid: true,
    validationMsg: `عنوان ${isIPv4 ? "IPv4" : "IPv6"} صالح`,
    summary: isPrivate
      ? `"${ip}" — عنوان شبكة خاصة، غير قابل للاستطلاع.`
      : `"${ip}"${geoSummary ? ` · ${geoSummary}` : ""} — عنوان عام. ${externalLinks.length} أداة استطلاع.`,
    confidence: isPrivate ? "medium" : "high",
    riskScore: isPrivate ? 10 : 50,
    findings, externalLinks, metadata,
    steps: ["التحقق من الصيغة", "تحديد النوع", "استطلاع الموقع الجغرافي", "تجهيز الأدوات"],
  };
}

// ─── Domain Engine ────────────────────────────────────────────────────────────

async function investigateDomain(raw: string): Promise<InvestigationResult> {
  let domain = raw.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split("?")[0];
  if (!isValidDomain(domain)) {
    return { input: raw, normalized: domain, entityType: "domain", isValid: false,
      validationMsg: "صيغة النطاق غير صحيحة.", summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [] };
  }

  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  const isSubdomain = parts.length > 2;
  const suspiciousTLDs = ["xyz", "tk", "ml", "ga", "cf", "gq", "pw", "top", "click", "download"];
  const isSuspicious = suspiciousTLDs.includes(tld);

  const findings: Finding[] = [
    { label: "النطاق",     value: domain,                                                          status: "info"                            },
    { label: "TLD",        value: `.${tld}`,                                                       status: isSuspicious ? "danger" : "success" },
    { label: "SLD",        value: sld,                                                             status: "info"                            },
    { label: "نطاق فرعي", value: isSubdomain ? `نعم (${parts.slice(0, -2).join(".")})` : "لا",   status: "neutral"                         },
    { label: "TLD المشبوه",value: isSuspicious ? "⚠ يستخدم في النصب" : "موثوق",                  status: isSuspicious ? "danger" : "success" },
  ];

  const metadata: { k: string; v: string }[] = [
    { k: "النطاق",     v: domain },
    { k: "TLD",        v: `.${tld}` },
    { k: "SLD",        v: sld },
    { k: "نطاق فرعي", v: isSubdomain ? "نعم" : "لا" },
    { k: "TLD مشبوه",  v: isSuspicious ? "نعم" : "لا" },
  ];

  const [aRes, mxRes, nsRes] = await Promise.all([
    safeFetch(`https://dns.google/resolve?name=${domain}&type=A`),
    safeFetch(`https://dns.google/resolve?name=${domain}&type=MX`),
    safeFetch(`https://dns.google/resolve?name=${domain}&type=NS`),
  ]);

  if (aRes?.ok) {
    try {
      const data = await aRes.json() as { Status: number; Answer?: { type: number; data: string }[] };
      const ips = data.Answer?.filter((r) => r.type === 1).map((r) => r.data) ?? [];
      if (ips.length > 0) {
        findings.push({ label: "سجلات A (IP)", value: ips.slice(0, 3).join(", "), status: "success" });
        metadata.push({ k: "IP الأساسي", v: ips[0] });
      }
    } catch { /* skip */ }
  }

  if (mxRes?.ok) {
    try {
      const data = await mxRes.json() as { Answer?: { data: string }[] };
      const mx = data.Answer?.map((r) => r.data.split(" ").pop() ?? r.data).slice(0, 2) ?? [];
      if (mx.length > 0) findings.push({ label: "خوادم البريد (MX)", value: mx.join(", "), status: "info" });
    } catch { /* skip */ }
  }

  if (nsRes?.ok) {
    try {
      const data = await nsRes.json() as { Answer?: { data: string }[] };
      const ns = data.Answer?.map((r) => r.data.replace(/\.$/, "")).slice(0, 2) ?? [];
      if (ns.length > 0) {
        findings.push({ label: "خوادم الأسماء (NS)", value: ns.join(", "), status: "info" });
        metadata.push({ k: "NS الأساسي", v: ns[0] });
      }
    } catch { /* skip */ }
  }

  const externalLinks: ExternalLink[] = [
    { name: "WHOIS",           url: `https://who.is/whois/${domain}`,                     category: "Registrar",    categoryAr: "تسجيل",     free: true,  description: "بيانات التسجيل" },
    { name: "DNSDumpster",     url: `https://dnsdumpster.com/`,                           category: "DNS",          categoryAr: "DNS",       free: true,  description: "سجلات DNS والنطاقات الفرعية" },
    { name: "crt.sh",          url: `https://crt.sh/?q=${domain}`,                       category: "SSL",          categoryAr: "SSL",       free: true,  description: "شهادات SSL" },
    { name: "VirusTotal",      url: `https://virustotal.com/gui/domain/${domain}`,        category: "Threat Intel", categoryAr: "استخبارات", free: true,  description: "الاستخبارات الأمنية" },
    { name: "Shodan",          url: `https://shodan.io/domain/${domain}`,                 category: "Recon",        categoryAr: "استطلاع",   free: false, description: "الخدمات والبنية التحتية" },
    { name: "Wayback Machine", url: `https://web.archive.org/web/*/${domain}`,            category: "Archive",      categoryAr: "أرشيف",     free: true,  description: "النسخ الأرشيفية" },
    { name: "SecurityTrails",  url: `https://securitytrails.com/domain/${domain}`,        category: "DNS",          categoryAr: "DNS",       free: true,  description: "تاريخ DNS" },
    { name: "BuiltWith",       url: `https://builtwith.com/${domain}`,                   category: "Tech",         categoryAr: "تقنيات",    free: true,  description: "تقنيات الموقع" },
    { name: "ViewDNS",         url: `https://viewdns.info/reverseip/?host=${domain}`,     category: "DNS",          categoryAr: "DNS",       free: true,  description: "الـ IP المشترك" },
  ];

  return {
    input: raw, normalized: domain, entityType: "domain", isValid: true,
    validationMsg: "نطاق صالح",
    summary: `"${domain}" — TLD: .${tld}${isSuspicious ? " (مشبوه)" : ""}. ${externalLinks.length} أداة OSINT.`,
    confidence: "high", riskScore: isSuspicious ? 65 : 30,
    findings, externalLinks, metadata,
    steps: ["التحقق من الصيغة", "تحليل TLD/SLD", "استعلام DNS Live", "تجهيز الأدوات"],
  };
}

// ─── Username Engine ──────────────────────────────────────────────────────────

const USERNAME_PLATFORMS = [
  { name: "Twitter / X",  icon: "𝕏",  category: "Social",       categoryAr: "تواصل اجتماعي", url: (u: string) => `https://x.com/${u}` },
  { name: "Instagram",    icon: "📷", category: "Social",       categoryAr: "تواصل اجتماعي", url: (u: string) => `https://instagram.com/${u}` },
  { name: "GitHub",       icon: "⌨",  category: "Developer",    categoryAr: "مطورون",          url: (u: string) => `https://github.com/${u}` },
  { name: "LinkedIn",     icon: "💼", category: "Professional", categoryAr: "مهني",            url: (u: string) => `https://linkedin.com/in/${u}` },
  { name: "TikTok",       icon: "🎵", category: "Social",       categoryAr: "تواصل اجتماعي", url: (u: string) => `https://tiktok.com/@${u}` },
  { name: "YouTube",      icon: "▶",  category: "Social",       categoryAr: "تواصل اجتماعي", url: (u: string) => `https://youtube.com/@${u}` },
  { name: "Reddit",       icon: "🔴", category: "Social",       categoryAr: "تواصل اجتماعي", url: (u: string) => `https://reddit.com/u/${u}` },
  { name: "Facebook",     icon: "📘", category: "Social",       categoryAr: "تواصل اجتماعي", url: (u: string) => `https://facebook.com/${u}` },
  { name: "Telegram",     icon: "✈",  category: "Messaging",    categoryAr: "مراسلة",         url: (u: string) => `https://t.me/${u}` },
  { name: "Discord",      icon: "💬", category: "Messaging",    categoryAr: "مراسلة",         url: (_: string) => `https://discord.com` },
  { name: "Steam",        icon: "🎮", category: "Gaming",       categoryAr: "ألعاب",           url: (u: string) => `https://steamcommunity.com/id/${u}` },
  { name: "Twitch",       icon: "🟣", category: "Gaming",       categoryAr: "ألعاب",           url: (u: string) => `https://twitch.tv/${u}` },
  { name: "Pinterest",    icon: "📌", category: "Social",       categoryAr: "تواصل اجتماعي", url: (u: string) => `https://pinterest.com/${u}` },
  { name: "Medium",       icon: "✍",  category: "Blog",         categoryAr: "مدونة",           url: (u: string) => `https://medium.com/@${u}` },
  { name: "HackerNews",   icon: "🔶", category: "Tech",         categoryAr: "تقنية",           url: (u: string) => `https://news.ycombinator.com/user?id=${u}` },
  { name: "GitLab",       icon: "🦊", category: "Developer",    categoryAr: "مطورون",          url: (u: string) => `https://gitlab.com/${u}` },
  { name: "Gravatar",     icon: "🖼",  category: "Identity",     categoryAr: "هوية",            url: (u: string) => `https://gravatar.com/${u}` },
  { name: "Keybase",      icon: "🔑", category: "Crypto/ID",    categoryAr: "هوية تشفيرية",   url: (u: string) => `https://keybase.io/${u}` },
];

async function investigateUsername(raw: string): Promise<InvestigationResult> {
  const username = raw.trim().replace(/^@/, "");
  if (!username || username.length < 2) {
    return { input: raw, normalized: username, entityType: "username", isValid: false,
      validationMsg: "اسم المستخدم قصير جداً.", summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [] };
  }

  const findings: Finding[] = [
    { label: "اسم المستخدم", value: username,                                               status: "info"    },
    { label: "الطول",        value: `${username.length} أحرف`,                              status: "neutral" },
    { label: "أرقام",        value: /\d/.test(username) ? "يحتوي أرقام" : "بدون أرقام",    status: "neutral" },
    { label: "رموز خاصة",   value: /[._-]/.test(username) ? "يحتوي رموز" : "بدون رموز",   status: "neutral" },
  ];

  const metadata: { k: string; v: string }[] = [
    { k: "اسم المستخدم",   v: username },
    { k: "الطول",          v: `${username.length}` },
    { k: "أحرف صغيرة فقط", v: username === username.toLowerCase() ? "نعم" : "لا" },
  ];

  // Real GitHub check (server-side, no CORS or rate limit issues)
  const ghResp = await safeFetch(`https://api.github.com/users/${username}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "VoidSINT-OSINT/1.0",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });

  let ghName = "";
  if (ghResp?.ok) {
    try {
      const gh = await ghResp.json() as Record<string, unknown>;
      findings.push({ label: "GitHub موجود", value: "✓ حساب موجود", status: "success" });
      if (gh.name)       { findings.push({ label: "الاسم الكامل",  value: String(gh.name),       status: "info" }); ghName = String(gh.name); }
      if (gh.followers)  findings.push({ label: "المتابعون",       value: String(gh.followers),   status: "info" });
      if (gh.public_repos) findings.push({ label: "المستودعات",    value: String(gh.public_repos), status: "info" });
      if (gh.location)   findings.push({ label: "الموقع",          value: String(gh.location),    status: "info" });
      if (gh.company)    findings.push({ label: "الشركة",          value: String(gh.company),     status: "info" });
      if (gh.created_at) metadata.push({ k: "تاريخ إنشاء GitHub", v: String(gh.created_at).split("T")[0] });
    } catch { /* skip */ }
  } else if (ghResp?.status === 404) {
    findings.push({ label: "GitHub", value: "✗ لا يوجد حساب", status: "neutral" });
  }

  const platforms: PlatformResult[] = USERNAME_PLATFORMS.map((p) => ({
    name: p.name, icon: p.icon, category: p.category, categoryAr: p.categoryAr,
    url: p.url(username),
  }));

  const externalLinks: ExternalLink[] = [
    { name: "Sherlock",        url: `https://github.com/sherlock-project/sherlock`,       category: "OSINT",    categoryAr: "OSINT",  free: true, description: "فحص 300+ منصة" },
    { name: "WhatsMyName",     url: `https://whatsmyname.app/?q=${username}`,             category: "OSINT",    categoryAr: "OSINT",  free: true, description: "تحقق من الوجود الرقمي" },
    { name: "Namechk",         url: `https://namechk.com/${username}`,                   category: "OSINT",    categoryAr: "OSINT",  free: true, description: "توفر الاسم عبر المنصات" },
    { name: "Social Search",   url: `https://socialsearcher.com/?q=${username}`,          category: "Social",   categoryAr: "اجتماعي", free: true, description: "بحث اجتماعي شامل" },
  ];

  return {
    input: raw, normalized: username, entityType: "username", isValid: true,
    validationMsg: "اسم مستخدم صالح",
    summary: `"${username}"${ghName ? ` (${ghName})` : ""} — ${platforms.length} منصة للتحقق.`,
    confidence: "high", riskScore: 20,
    findings, platforms, externalLinks, metadata,
    steps: ["تطبيع الاسم", "فحص GitHub Live", "تجهيز المنصات", "توليد الروابط"],
  };
}

// ─── Email Engine ─────────────────────────────────────────────────────────────

async function investigateEmail(raw: string): Promise<InvestigationResult> {
  const email = raw.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { input: raw, normalized: email, entityType: "email", isValid: false,
      validationMsg: "صيغة البريد الإلكتروني غير صحيحة.", summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [] };
  }

  const [localPart, domain] = email.split("@");
  const tld = domain.split(".").pop() ?? "";
  const freeProviders = ["gmail.com","yahoo.com","hotmail.com","outlook.com","protonmail.com","tutanota.com","icloud.com","yandex.com","mail.ru","aol.com","zoho.com","guerrillamail.com","temp-mail.org","10minutemail.com","mailinator.com","dispostable.com","throwam.com","fakeinbox.com","sharklasers.com","guerrillamailblock.com"];
  const disposableProviders = ["guerrillamail.com","temp-mail.org","10minutemail.com","mailinator.com","dispostable.com","throwam.com","fakeinbox.com","sharklasers.com","guerrillamailblock.com","yopmail.com","trashmail.com","mailnull.com"];
  const isFreeProvider = freeProviders.includes(domain);
  const isDisposable = disposableProviders.includes(domain);

  const findings: Finding[] = [
    { label: "البريد",         value: email,                                                         status: "info"                           },
    { label: "النطاق",         value: domain,                                                        status: "info"                           },
    { label: "نوع المزود",     value: isDisposable ? "مؤقت / مزيف" : isFreeProvider ? "مجاني" : "خاص/شركة", status: isDisposable ? "danger" : isFreeProvider ? "warning" : "success" },
    { label: "قابل للاختبار", value: "يحتاج SMTP للتحقق",                                           status: "neutral"                        },
  ];

  const metadata: { k: string; v: string }[] = [
    { k: "البريد",           v: email },
    { k: "الجزء المحلي",     v: localPart },
    { k: "النطاق",           v: domain },
    { k: "TLD",              v: `.${tld}` },
    { k: "مزود مجاني",       v: isFreeProvider ? "نعم" : "لا" },
    { k: "مزود مؤقت",        v: isDisposable ? "نعم" : "لا" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "Hunter.io",       url: `https://hunter.io/email-verifier/${email}`,             category: "Verify",       categoryAr: "تحقق",      free: true,  description: "التحقق من صحة البريد" },
    { name: "HaveIBeenPwned",  url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`, category: "Breach", categoryAr: "اختراق",  free: true,  description: "فحص الاختراقات" },
    { name: "EmailRep",        url: `https://emailrep.io/${email}`,                          category: "Reputation",   categoryAr: "سمعة",      free: true,  description: "تقييم البريد" },
    { name: "Holehe",          url: `https://github.com/megadose/holehe`,                    category: "OSINT",        categoryAr: "OSINT",     free: true,  description: "فحص 100+ موقع" },
  ];

  return {
    input: raw, normalized: email, entityType: "email", isValid: true,
    validationMsg: "صيغة البريد صحيحة",
    summary: `"${email}" — ${isDisposable ? "بريد مؤقت/مزيف ⚠" : isFreeProvider ? "مزود مجاني" : "مزود مؤسسي"}.`,
    confidence: "high", riskScore: isDisposable ? 75 : isFreeProvider ? 30 : 15,
    findings, externalLinks, metadata,
    steps: ["تطبيع البريد", "فحص المزود", "تحليل النطاق", "تجهيز الأدوات"],
  };
}

// ─── Phone Engine ─────────────────────────────────────────────────────────────

async function investigatePhone(raw: string): Promise<InvestigationResult> {
  const phone = raw.trim().replace(/\s/g, "");
  const e164 = /^\+?\d{7,15}$/.test(phone);

  if (!e164) {
    return { input: raw, normalized: phone, entityType: "phone", isValid: false,
      validationMsg: "رقم هاتف غير صالح.", summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [] };
  }

  const cleaned = phone.replace(/^\+/, "");
  const COUNTRY_CODES: Record<string, string> = {
    "966": "المملكة العربية السعودية 🇸🇦", "971": "الإمارات 🇦🇪", "974": "قطر 🇶🇦",
    "973": "البحرين 🇧🇭", "965": "الكويت 🇰🇼", "968": "عُمان 🇴🇲", "967": "اليمن 🇾🇪",
    "963": "سوريا 🇸🇾", "962": "الأردن 🇯🇴", "964": "العراق 🇮🇶",
    "20":  "مصر 🇪🇬", "212": "المغرب 🇲🇦", "213": "الجزائر 🇩🇿",
    "1":   "الولايات المتحدة / كندا 🇺🇸", "44": "المملكة المتحدة 🇬🇧",
    "49":  "ألمانيا 🇩🇪", "33": "فرنسا 🇫🇷", "7": "روسيا 🇷🇺",
    "91":  "الهند 🇮🇳", "86": "الصين 🇨🇳", "55": "البرازيل 🇧🇷",
  };

  let country = "غير معروف";
  let countryCode = "";
  for (const [code, name] of Object.entries(COUNTRY_CODES)) {
    if (cleaned.startsWith(code)) { country = name; countryCode = code; break; }
  }

  const findings: Finding[] = [
    { label: "الرقم",          value: phone,                                 status: "info"    },
    { label: "الدولة المحتملة", value: country,                               status: countryCode ? "success" : "warning" },
    { label: "النوع",           value: cleaned.length > 11 ? "دولي" : "محلي", status: "neutral" },
    { label: "الطول",           value: `${cleaned.length} رقم`,               status: "neutral" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "Truecaller",    url: `https://truecaller.com/search/sa/${phone}`, category: "Lookup", categoryAr: "بحث",  free: true, description: "البحث باسم صاحب الرقم" },
    { name: "NumVerify",     url: `https://numverify.com/`,                   category: "Verify", categoryAr: "تحقق", free: true, description: "التحقق من الرقم" },
    { name: "PhoneInfoga",   url: `https://github.com/sundowndev/phoneinfoga`, category: "OSINT",  categoryAr: "OSINT", free: true, description: "OSINT للهواتف" },
    { name: "TelegramSearch",url: `https://t.me/${phone.replace("+","")}`,    category: "Social", categoryAr: "اجتماعي", free: true, description: "البحث في تيليغرام" },
  ];

  return {
    input: raw, normalized: phone, entityType: "phone", isValid: true,
    validationMsg: "رقم هاتف صالح",
    summary: `"${phone}" — ${country}. ${findings.length} نتيجة تحليل.`,
    confidence: "medium", riskScore: 25,
    findings, externalLinks,
    metadata: [
      { k: "الرقم",    v: phone },
      { k: "الدولة",   v: country },
      { k: "رمز الدولة", v: countryCode ? `+${countryCode}` : "غير معروف" },
    ],
    steps: ["تطبيع الرقم", "كشف الدولة", "تحليل الصيغة", "تجهيز الأدوات"],
  };
}

// ─── Crypto Engine ────────────────────────────────────────────────────────────

async function investigateCrypto(raw: string): Promise<InvestigationResult> {
  const addr = raw.trim();
  const isBTC = /^(bc1|[13])[a-km-zA-HJ-NP-Z1-9]{25,59}$/.test(addr);
  const isETH = /^0x[a-fA-F0-9]{40}$/.test(addr);
  const isBTCLegacy = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr);
  const isBech32 = addr.startsWith("bc1");

  const isValid = isBTC || isETH;

  if (!isValid) {
    return { input: raw, normalized: addr, entityType: "crypto", isValid: false,
      validationMsg: "عنوان محفظة غير صالح (BTC أو ETH).", summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [] };
  }

  const currency = isETH ? "Ethereum (ETH)" : isBech32 ? "Bitcoin (BTC — Bech32/SegWit)" : "Bitcoin (BTC — Legacy)";

  const findings: Finding[] = [
    { label: "العملة",        value: currency,                                   status: "info"    },
    { label: "النوع",         value: isETH ? "ERC-20 متوافق" : isBech32 ? "SegWit (Bech32)" : "Legacy (P2PKH/P2SH)", status: "info" },
    { label: "طول العنوان",  value: `${addr.length} حرفاً`,                      status: "neutral" },
    { label: "قابلية الفحص", value: "يمكن فحصه عبر مستكشف البلوكشين",            status: "success" },
  ];

  const externalLinks: ExternalLink[] = isETH ? [
    { name: "Etherscan",       url: `https://etherscan.io/address/${addr}`,       category: "Explorer", categoryAr: "مستكشف", free: true, description: "مستكشف Ethereum" },
    { name: "Blockchain.com",  url: `https://www.blockchain.com/search/${addr}`,  category: "Explorer", categoryAr: "مستكشف", free: true, description: "بيانات البلوكشين" },
    { name: "Peckshield",      url: `https://peckshield.com/`,                   category: "Security", categoryAr: "أمان",   free: false, description: "تحليل أمني للعملات" },
  ] : [
    { name: "Blockchain.com",  url: `https://www.blockchain.com/btc/address/${addr}`,   category: "Explorer", categoryAr: "مستكشف", free: true, description: "مستكشف BTC" },
    { name: "Blockchair",      url: `https://blockchair.com/bitcoin/address/${addr}`,   category: "Explorer", categoryAr: "مستكشف", free: true, description: "إحصاءات شاملة" },
    { name: "OXT.me",          url: `https://oxt.me/address/${addr}`,                  category: "Privacy",  categoryAr: "خصوصية", free: true, description: "تحليل الخصوصية" },
    { name: "BitcoinWhosWho",  url: `https://bitcoinwhoswho.com/blog/address/${addr}`,  category: "OSINT",    categoryAr: "OSINT",  free: true, description: "معلومات المالك" },
  ];

  return {
    input: raw, normalized: addr, entityType: "crypto", isValid: true,
    validationMsg: `عنوان ${isETH ? "Ethereum" : "Bitcoin"} صالح`,
    summary: `"${addr.substring(0, 12)}…" — ${currency}. ${externalLinks.length} مستكشف للتحقق.`,
    confidence: "high", riskScore: 40,
    findings, externalLinks,
    metadata: [
      { k: "العنوان",    v: addr },
      { k: "العملة",     v: isETH ? "ETH" : "BTC" },
      { k: "نوع العنوان", v: isETH ? "Ethereum" : isBech32 ? "Bech32/SegWit" : "Legacy" },
    ],
    steps: ["التحقق من البادئة", "تحديد العملة", "تحليل الصيغة", "تجهيز المستكشفين"],
  };
}

// ─── Person Engine ────────────────────────────────────────────────────────────

async function investigatePerson(raw: string): Promise<InvestigationResult> {
  const name = raw.trim();
  if (name.length < 2) {
    return { input: raw, normalized: name, entityType: "person", isValid: false,
      validationMsg: "الاسم قصير جداً.", summary: "", confidence: "low", riskScore: 0,
      findings: [], externalLinks: [], metadata: [], steps: [] };
  }

  const words = name.split(/\s+/);
  const isArabic = /[؀-ۿ]/.test(name);
  const encoded = encodeURIComponent(name);

  const findings: Finding[] = [
    { label: "الاسم",           value: name,                                                      status: "info"    },
    { label: "عدد الكلمات",     value: `${words.length} كلمات`,                                   status: "neutral" },
    { label: "اللغة",           value: isArabic ? "عربي" : "إنجليزي / أخرى",                     status: "neutral" },
    { label: "البحث المتاح",    value: "مشتريات عامة، شبكات اجتماعية، سجلات رسمية",              status: "info"    },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "Google",           url: `https://google.com/search?q="${encoded}"`,                  category: "Search",  categoryAr: "بحث",    free: true, description: "بحث Google الشامل" },
    { name: "LinkedIn",         url: `https://linkedin.com/search/results/people/?keywords=${encoded}`, category: "Professional", categoryAr: "مهني", free: true, description: "البحث المهني" },
    { name: "Twitter / X",      url: `https://x.com/search?q="${encoded}"&src=typed_query`,       category: "Social",  categoryAr: "اجتماعي", free: true, description: "بحث تويتر" },
    { name: "Facebook",         url: `https://facebook.com/search/top?q=${encoded}`,              category: "Social",  categoryAr: "اجتماعي", free: true, description: "بحث فيسبوك" },
    { name: "Pipl",             url: `https://pipl.com/search/?q=${encoded}`,                    category: "People",  categoryAr: "أشخاص",  free: false, description: "بحث متخصص بالأشخاص" },
    { name: "Spokeo",           url: `https://spokeo.com/search?q=${encoded}`,                   category: "People",  categoryAr: "أشخاص",  free: false, description: "بيانات الأشخاص" },
    { name: "Intelius",         url: `https://intelius.com/search/name/${encoded}`,               category: "People",  categoryAr: "أشخاص",  free: false, description: "السجلات العامة" },
    { name: "GitHub",           url: `https://github.com/search?q=${encoded}&type=users`,         category: "Dev",     categoryAr: "مطورون", free: true, description: "البحث عبر GitHub" },
  ];

  return {
    input: raw, normalized: name, entityType: "person", isValid: true,
    validationMsg: "اسم صالح للبحث",
    summary: `"${name}" — ${words.length} كلمات. ${externalLinks.length} مصدر للبحث.`,
    confidence: "medium", riskScore: 15,
    findings, externalLinks,
    metadata: [
      { k: "الاسم",         v: name },
      { k: "عدد الكلمات",  v: `${words.length}` },
      { k: "اللغة",        v: isArabic ? "عربية" : "أخرى" },
    ],
    steps: ["تطبيع الاسم", "تحليل اللغة", "تجهيز مصادر البحث", "توليد الروابط"],
  };
}

// ─── IOC Engine ───────────────────────────────────────────────────────────────

async function investigateIOC(raw: string): Promise<InvestigationResult> {
  const extracted = {
    ips: [] as string[], domains: [] as string[], emails: [] as string[],
    urls: [] as string[], md5: [] as string[], sha1: [] as string[],
    sha256: [] as string[], btcAddresses: [] as string[], ethAddresses: [] as string[], cves: [] as string[],
  };

  const ipMatches = raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? [];
  extracted.ips = [...new Set(ipMatches.filter((ip) => ip.split(".").every((n) => +n <= 255)))];
  extracted.emails = [...new Set(raw.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g) ?? [])];
  extracted.urls = [...new Set(raw.match(/https?:\/\/[^\s"'<>]+/g) ?? [])];
  const domainMatches = raw.match(/\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g) ?? [];
  extracted.domains = [...new Set(domainMatches.filter((d) => isValidDomain(d) && !extracted.emails.some((e) => e.includes(d))))].slice(0, 20);
  extracted.md5 = [...new Set(raw.match(/\b[a-fA-F0-9]{32}\b/g) ?? [])];
  extracted.sha1 = [...new Set(raw.match(/\b[a-fA-F0-9]{40}\b/g) ?? [])];
  extracted.sha256 = [...new Set(raw.match(/\b[a-fA-F0-9]{64}\b/g) ?? [])];
  extracted.btcAddresses = [...new Set(raw.match(/\b(?:bc1|[13])[a-km-zA-HJ-NP-Z1-9]{25,59}\b/g) ?? [])];
  extracted.ethAddresses = [...new Set(raw.match(/\b0x[a-fA-F0-9]{40}\b/g) ?? [])];
  extracted.cves = [...new Set(raw.match(/CVE-\d{4}-\d{4,7}/gi) ?? [])];

  const total = extracted.ips.length + extracted.domains.length + extracted.emails.length +
    extracted.urls.length + extracted.md5.length + extracted.sha1.length +
    extracted.sha256.length + extracted.btcAddresses.length + extracted.ethAddresses.length + extracted.cves.length;

  const findings: Finding[] = [
    { label: "عناوين IP",      value: extracted.ips.length.toString(),           status: extracted.ips.length     > 0 ? "warning" : "neutral" },
    { label: "نطاقات",         value: extracted.domains.length.toString(),       status: extracted.domains.length > 0 ? "warning" : "neutral" },
    { label: "بريد",           value: extracted.emails.length.toString(),        status: extracted.emails.length  > 0 ? "warning" : "neutral" },
    { label: "روابط URL",      value: extracted.urls.length.toString(),          status: extracted.urls.length    > 0 ? "info"    : "neutral" },
    { label: "هاشات MD5",      value: extracted.md5.length.toString(),           status: extracted.md5.length     > 0 ? "danger"  : "neutral" },
    { label: "هاشات SHA-1",    value: extracted.sha1.length.toString(),          status: extracted.sha1.length    > 0 ? "danger"  : "neutral" },
    { label: "هاشات SHA-256",  value: extracted.sha256.length.toString(),        status: extracted.sha256.length  > 0 ? "danger"  : "neutral" },
    { label: "محافظ BTC",      value: extracted.btcAddresses.length.toString(),  status: extracted.btcAddresses.length > 0 ? "warning" : "neutral" },
    { label: "محافظ ETH",      value: extracted.ethAddresses.length.toString(),  status: extracted.ethAddresses.length > 0 ? "warning" : "neutral" },
    { label: "ثغرات CVE",      value: extracted.cves.length.toString(),          status: extracted.cves.length    > 0 ? "danger"  : "neutral" },
  ];

  const externalLinks: ExternalLink[] = [
    { name: "VirusTotal",     url: `https://virustotal.com`,             category: "Threat Intel", categoryAr: "استخبارات", free: true, description: "فحص IOCs" },
    { name: "OTX AlienVault", url: `https://otx.alienvault.com`,        category: "Threat Intel", categoryAr: "استخبارات", free: true, description: "استخبارات التهديدات" },
    { name: "MISP",           url: `https://misp-project.org`,          category: "Platform",     categoryAr: "منصة",      free: true, description: "مشاركة بيانات التهديد" },
  ];

  return {
    input: raw.substring(0, 100) + (raw.length > 100 ? "..." : ""),
    normalized: raw, entityType: "ioc", isValid: true,
    validationMsg: `تم استخراج ${total} مؤشر`,
    summary: `${raw.length} حرف → ${total} مؤشر: ${extracted.ips.length} IP، ${extracted.domains.length} نطاق، ${extracted.emails.length} بريد، ${extracted.sha256.length + extracted.sha1.length + extracted.md5.length} هاش، ${extracted.cves.length} CVE.`,
    confidence: total > 0 ? "high" : "low", riskScore: Math.min(100, total * 10),
    findings, extracted, externalLinks,
    metadata: [
      { k: "طول النص",        v: `${raw.length} حرفاً` },
      { k: "إجمالي المؤشرات", v: total.toString() },
    ],
    steps: ["استخراج IPs", "استخراج النطاقات", "استخراج البريد", "استخراج الهاشات", "استخراج العملات", "استخراج CVEs"],
  };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function runInvestigation(type: OsintType, input: string): Promise<InvestigationResult> {
  switch (type) {
    case "username": return investigateUsername(input);
    case "email":    return investigateEmail(input);
    case "ip":       return investigateIP(input);
    case "domain":   return investigateDomain(input);
    case "phone":    return investigatePhone(input);
    case "crypto":   return investigateCrypto(input);
    case "person":   return investigatePerson(input);
    case "ioc":      return investigateIOC(input);
    default:         throw new Error(`نوع غير معروف: ${type}`);
  }
}
