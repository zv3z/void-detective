import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { MODULES, HUE_MAP, type ModuleDef } from "@/lib/dfas-data";
import { runInvestigation, SAMPLES, type InvestigationResult, type Finding, type PlatformResult, type ExternalLink, type ExtractedIOC } from "@/engines/osint-engines";
import { apiInvestigate, hasBackend } from "@/lib/api";

// ─── Utility helpers ─────────────────────────────────────────────────────────

function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text;
    Object.assign(el.style, { position: "fixed", opacity: "0" });
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  });
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(result: InvestigationResult, mod: ModuleDef): string {
  const ts = new Date().toLocaleString("ar-SA");
  const conf = result.confidence === "high" ? "عالية" : result.confidence === "medium" ? "متوسطة" : "منخفضة";
  return [
    `# VoidSINT · تقرير تحقيق — ${mod.nameAr}`,
    ``,
    `| المعلومة | القيمة |`,
    `|----------|--------|`,
    `| الهدف | \`${result.normalized}\` |`,
    `| نوع الكيان | ${result.entityType} |`,
    `| درجة الخطورة | ${result.riskScore}/100 |`,
    `| الثقة | ${conf} |`,
    `| الحالة | ${result.isValid ? "✓ صالح" : "✗ غير صالح"} |`,
    `| التاريخ | ${ts} |`,
    ``,
    `## الملخص`,
    ``,
    result.summary || result.validationMsg,
    ``,
    ...(result.findings.length > 0 ? [
      `## نتائج التحليل`,
      ``,
      ...result.findings.map((f) => `- **${f.label}:** \`${f.value}\``),
      ``,
    ] : []),
    ...(result.metadata.length > 0 ? [
      `## البيانات التقنية`,
      ``,
      ...result.metadata.map((m) => `- **${m.k}:** \`${m.v}\``),
      ``,
    ] : []),
    ...(result.externalLinks.length > 0 ? [
      `## أدوات OSINT الموصى بها`,
      ``,
      ...result.externalLinks.map((l) => `- [${l.name}](${l.url}) — ${l.description}`),
      ``,
    ] : []),
    `---`,
    `*تم إنشاؤه بواسطة [VoidSINT](https://github.com/reconurge/flowsint) · ${ts}*`,
  ].join("\n");
}

export const Route = createFileRoute("/modules/$slug")({
  loader: ({ params }) => {
    const mod = MODULES.find((m) => m.slug === params.slug);
    if (!mod) throw notFound();
    return { mod };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.mod
      ? [
          { title: `VoidSINT · ${loaderData.mod.nameAr}` },
          { name: "description", content: loaderData.mod.descAr },
        ]
      : [{ title: "VoidSINT · تحقيق" }],
  }),
  notFoundComponent: () => (
    <div className="px-6 py-20 text-center">
      <div className="font-mono text-cyan text-xs">OSINT · ENGINE_NOT_FOUND</div>
      <h1 className="text-3xl font-bold mt-2">المحرك غير موجود</h1>
      <Link to="/modules" className="inline-flex mt-6 px-4 py-2 rounded-lg bg-primary text-primary-foreground">
        عودة لمحركات التحقيق
      </Link>
    </div>
  ),
  component: ModulePage,
});

type Phase = "idle" | "running" | "done";

const STATUS_STYLES: Record<string, string> = {
  info:    "text-info border-info/30 bg-info/8",
  success: "text-safe border-safe/30 bg-safe/8",
  warning: "text-warning border-warning/30 bg-warning/8",
  danger:  "text-critical border-critical/30 bg-critical/8",
  neutral: "text-muted-foreground border-border bg-surface-2/50",
};

const CATEGORY_COLORS = [
  "bg-cyan/10 text-cyan border-cyan/30",
  "bg-info/10 text-info border-info/30",
  "bg-safe/10 text-safe border-safe/30",
  "bg-warning/10 text-warning border-warning/30",
  "bg-high/10 text-high border-high/30",
];

function ModulePage() {
  const { mod } = Route.useLoaderData();
  return <InvestigationView mod={mod} />;
}

function InvestigationView({ mod }: { mod: ModuleDef }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const steps = mod.slug === "ioc"
    ? ["استخراج IPs", "استخراج النطاقات", "استخراج البريد", "استخراج الهاشات", "استخراج العملات", "استخراج CVEs"]
    : ["التحقق من المدخل", "تطبيع البيانات", "تحليل الكيان", "تجهيز الروابط", "توليد التقرير"];

  async function investigate() {
    if (!input.trim()) return;
    setPhase("running");
    setStep(0);
    setResult(null);
    setErrorMsg(null);

    let animTimer: ReturnType<typeof setInterval> | null = null;

    const animationDone = new Promise<void>((resolve) => {
      let i = 0;
      animTimer = setInterval(() => {
        i++;
        setStep(i);
        if (i >= steps.length) { clearInterval(animTimer!); resolve(); }
      }, 360);
    });

    try {
      const investigateFn = hasBackend()
        ? () => apiInvestigate(mod.type, input).then((r) => r.result)
        : () => runInvestigation(mod.type, input);

      const [res] = await Promise.all([investigateFn(), animationDone]);
      setResult(res);
      setPhase("done");
    } catch (err) {
      if (animTimer) clearInterval(animTimer);
      setStep(steps.length);
      setErrorMsg(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      setPhase("idle");
    }
  }

  function reset() {
    setPhase("idle");
    setInput("");
    setResult(null);
    setStep(0);
    setErrorMsg(null);
  }

  function loadSample() {
    setInput(SAMPLES[mod.type] ?? "");
  }

  async function addToGraph() {
    const nodeId = `${mod.type}-${Date.now()}`;
    const nodeData = {
      id: nodeId,
      type: mod.type,
      value: input,
      label: input.substring(0, 18),
      x: 200 + Math.random() * 400,
      y: 150 + Math.random() * 300,
      hue: mod.hue,
      icon: mod.icon,
    };

    if (hasBackend()) {
      try {
        const { apiAddGraphNode } = await import("@/lib/api");
        await apiAddGraphNode(nodeData);
        alert("✓ تم حفظ الكيان في قاعدة البيانات وخريطة الروابط");
      } catch {
        alert("تعذّر الحفظ في قاعدة البيانات");
      }
    } else {
      try {
        const raw = localStorage.getItem("voidsint-graph") ?? "{}";
        const graph = JSON.parse(raw) as { nodes?: unknown[]; edges?: unknown[] };
        if (!graph.nodes) graph.nodes = [];
        graph.nodes.push({ ...nodeData, addedAt: new Date().toISOString() });
        localStorage.setItem("voidsint-graph", JSON.stringify(graph));
        alert("✓ تم الإضافة إلى خريطة الروابط (محلي)");
      } catch {
        alert("تعذّر الإضافة إلى الخريطة");
      }
    }
  }

  return (
    <div className="px-6 lg:px-12 py-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass rounded-xl p-6 flex items-start gap-4 animate-fade-up relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-primary/15 blur-3xl" />
        <div className={`relative w-14 h-14 rounded-xl border flex items-center justify-center text-3xl shrink-0 ${HUE_MAP[mod.hue]?.border40 ?? "border-primary/40"} ${HUE_MAP[mod.hue]?.bg10 ?? "bg-surface-2"} ${HUE_MAP[mod.hue]?.text ?? "text-primary"}`}>
          {mod.icon}
        </div>
        <div className="flex-1 min-w-0 relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">{mod.badge}</span>
            <span className="text-[10px] font-mono text-muted-foreground">OSINT · ENGINE · LIVE</span>
          </div>
          <h1 className="text-2xl font-bold mt-2">{mod.nameAr}</h1>
          <p className="text-sm text-muted-foreground mt-1">{mod.descAr}</p>
        </div>
        <Link to="/modules" className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground shrink-0">
          → المحركات
        </Link>
      </div>

      {/* Input */}
      <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".05s" }}>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded glow-cyan" />
          الهدف
        </h2>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mod.placeholder}
          rows={mod.slug === "ioc" ? 6 : 2}
          dir={mod.slug === "person" ? "auto" : "ltr"}
          className="w-full bg-surface-2 border border-border rounded-lg p-4 text-sm font-mono focus:outline-none focus:border-primary transition resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && mod.slug !== "ioc") {
              e.preventDefault();
              investigate();
            }
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={investigate}
            disabled={phase === "running" || !input.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold glow-cyan hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "running" ? "⏳ جاري التحقيق…" : "▶ بدء التحقيق"}
          </button>
          <button type="button" onClick={loadSample} className="px-4 py-2.5 rounded-lg border border-primary/30 text-primary text-sm hover:bg-primary/10 transition">
            ← تحميل مثال
          </button>
          <button type="button" onClick={reset} className="px-4 py-2.5 rounded-lg border border-border text-sm hover:bg-surface-2 transition">
            إعادة تعيين
          </button>
        </div>

        {/* Error display */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border border-critical/40 bg-critical/8 text-critical text-sm">
            <span>✕</span>
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="mr-auto text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Progress */}
        {phase !== "idle" && (
          <div className="mt-5 space-y-2">
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-primary to-cyan transition-all duration-500"
                style={{ width: `${(step / steps.length) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              {steps.map((s, i) => (
                <div key={s} className={`flex items-center gap-1.5 ${i < step ? "text-safe" : i === step && phase === "running" ? "text-cyan" : "text-muted-foreground"}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {phase === "done" && result && (
        <>
          {/* Export toolbar */}
          <div className="flex flex-wrap items-center gap-2 animate-fade-up">
            <span className="text-[10px] font-mono text-muted-foreground">تصدير التقرير:</span>
            <button
              onClick={() => downloadFile(JSON.stringify(result, null, 2), `voidsint-${result.entityType}-${Date.now()}.json`, "application/json")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-safe/30 text-safe hover:bg-safe/10 transition"
            >
              ↓ JSON
            </button>
            <button
              onClick={() => downloadFile(toMarkdown(result, mod), `voidsint-${result.entityType}-${Date.now()}.md`, "text/markdown")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-info/30 text-info hover:bg-info/10 transition"
            >
              ↓ Markdown
            </button>
            <button
              onClick={() => copyText(JSON.stringify(result, null, 2))}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
            >
              ⊞ نسخ JSON
            </button>
          </div>

          {/* Validity + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-up">
            <SummaryCard result={result} mod={mod} onAddToGraph={addToGraph} />
            <RiskCard result={result} />
          </div>

          {/* Findings */}
          {result.findings.length > 0 && (
            <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".05s" }}>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded glow-cyan" />
                نتائج التحليل
                <span className="text-xs font-mono text-muted-foreground mr-1">{result.findings.length} عنصر</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.findings.map((f, i) => (
                  <FindingCard key={i} finding={f} />
                ))}
              </div>
            </div>
          )}

          {/* Platforms (username) */}
          {result.platforms && result.platforms.length > 0 && (
            <PlatformsSection platforms={result.platforms} />
          )}

          {/* IOC extracted */}
          {result.extracted && (
            <ExtractedSection extracted={result.extracted} />
          )}

          {/* External links */}
          {result.externalLinks.length > 0 && (
            <ExternalLinksSection links={result.externalLinks} />
          )}

          {/* Metadata */}
          {result.metadata.length > 0 && (
            <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".15s" }}>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded glow-cyan" />
                البيانات التقنية
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {result.metadata.map((m) => (
                  <div key={m.k} className="flex items-center justify-between py-2.5 border-b border-border/60 text-sm group">
                    <span className="text-muted-foreground">{m.k}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan text-xs" dir="ltr">{m.v}</span>
                      <button
                        onClick={() => copyText(m.v)}
                        title="نسخ"
                        className="opacity-0 group-hover:opacity-100 transition text-[10px] px-1.5 py-0.5 rounded border border-border hover:border-cyan/40 hover:text-cyan text-muted-foreground"
                      >
                        ⊞
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function SummaryCard({ result, mod, onAddToGraph }: { result: InvestigationResult; mod: ModuleDef; onAddToGraph: () => void }) {
  const borderColor = result.isValid
    ? result.riskScore > 60 ? "border-warning/40" : "border-safe/40"
    : "border-critical/40";
  const gradColor = result.isValid
    ? result.riskScore > 60 ? "from-warning/8" : "from-safe/8"
    : "from-critical/8";

  return (
    <div className={`lg:col-span-2 glass rounded-xl p-6 relative overflow-hidden border ${borderColor}`}>
      <div className={`absolute inset-0 bg-gradient-to-l ${gradColor} to-transparent`} />
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-mono font-semibold tracking-wider ${result.isValid ? "text-safe border-safe/40 bg-safe/10" : "text-critical border-critical/40 bg-critical/10"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {result.isValid ? "صالح · VALID" : "غير صالح · INVALID"}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            ثقة: {result.confidence === "high" ? "عالية" : result.confidence === "medium" ? "متوسطة" : "منخفضة"}
          </span>
        </div>
        <h2 className="text-lg font-bold">{result.isValid ? "تم التحليل بنجاح" : "فشل التحقق من المدخل"}</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{result.summary || result.validationMsg}</p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">نوع الكيان</div>
            <div className={`mt-1 font-mono font-bold ${HUE_MAP[mod.hue]?.text ?? "text-primary"}`}>{mod.nameAr.split(" ")[0]}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">أدوات OSINT</div>
            <div className="mt-1 font-mono font-bold text-cyan">{result.externalLinks.length}</div>
          </div>
        </div>
        {result.isValid && (
          <button
            onClick={onAddToGraph}
            className="mt-4 flex items-center gap-2 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition"
          >
            <span>⬡</span> إضافة إلى خريطة الروابط
          </button>
        )}
      </div>
    </div>
  );
}

function RiskCard({ result }: { result: InvestigationResult }) {
  const score = result.riskScore;
  const color = score > 70 ? "var(--critical)" : score > 40 ? "var(--warning)" : "var(--safe)";
  const label = score > 70 ? "مرتفع" : score > 40 ? "متوسط" : "منخفض";
  const r = 60, c = 2 * Math.PI * r, arc = c * 0.75, offset = arc * (1 - score / 100);

  return (
    <div className="glass rounded-xl p-6 flex flex-col items-center justify-center text-center">
      <div className="text-[10px] font-mono text-muted-foreground tracking-widest mb-2">RISK · SCORE</div>
      <svg width={160} height={130} style={{ transform: "rotate(135deg)" }}>
        <circle cx={80} cy={80} r={r} fill="none" stroke="oklch(0.22 0.025 248)" strokeWidth={16} strokeLinecap="round"
          strokeDasharray={`${arc} ${c - arc}`} />
        <circle cx={80} cy={80} r={r} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round"
          strokeDasharray={`${arc - offset} ${c - (arc - offset)}`}
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "stroke-dasharray 1s" }} />
      </svg>
      <div className="font-mono text-4xl font-bold -mt-6" style={{ color }}>{score}</div>
      <div className="text-sm mt-1" style={{ color }}>{label}</div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${STATUS_STYLES[finding.status] ?? STATUS_STYLES.neutral}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{finding.label}</div>
      <div className="font-mono font-semibold text-xs">{finding.value}</div>
    </div>
  );
}

const CATEGORY_COLOR_MAP: Record<string, string> = {};
let colorIdx = 0;
function getCategoryColor(cat: string) {
  if (!CATEGORY_COLOR_MAP[cat]) {
    CATEGORY_COLOR_MAP[cat] = CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length];
    colorIdx++;
  }
  return CATEGORY_COLOR_MAP[cat];
}

function PlatformsSection({ platforms }: { platforms: PlatformResult[] }) {
  const [filter, setFilter] = useState<string>("الكل");
  const categories = ["الكل", ...Array.from(new Set(platforms.map((p) => p.categoryAr)))];
  const filtered = filter === "الكل" ? platforms : platforms.filter((p) => p.categoryAr === filter);

  return (
    <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".08s" }}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded glow-cyan" />
          منصات التحقق
          <span className="text-xs font-mono text-muted-foreground">{platforms.length} منصة</span>
        </h2>
        <div className="flex flex-wrap gap-1.5 mr-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition ${filter === cat ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {filtered.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-surface-2 transition group text-xs"
          >
            <span className="text-base">{p.icon}</span>
            <div className="min-w-0">
              <div className="font-medium text-[11px] truncate group-hover:text-cyan transition">{p.name}</div>
              <div className={`text-[9px] px-1.5 py-0.5 rounded border mt-0.5 inline-block ${getCategoryColor(p.categoryAr)}`}>
                {p.categoryAr}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function ExtractedSection({ extracted }: { extracted: ExtractedIOC }) {
  const sections: { key: keyof ExtractedIOC; label: string; color: string }[] = [
    { key: "ips",           label: "عناوين IP",    color: "warning" },
    { key: "domains",       label: "نطاقات",       color: "info" },
    { key: "emails",        label: "بريد",         color: "cyan" },
    { key: "urls",          label: "روابط URL",    color: "safe" },
    { key: "md5",           label: "MD5",          color: "high" },
    { key: "sha1",          label: "SHA-1",        color: "high" },
    { key: "sha256",        label: "SHA-256",      color: "critical" },
    { key: "btcAddresses",  label: "BTC",          color: "warning" },
    { key: "ethAddresses",  label: "ETH",          color: "info" },
    { key: "cves",          label: "CVEs",         color: "critical" },
  ];

  const hasData = sections.some((s) => (extracted[s.key] as string[]).length > 0);
  if (!hasData) return null;

  return (
    <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".1s" }}>
      <h2 className="font-semibold mb-5 flex items-center gap-2">
        <span className="w-1 h-4 bg-primary rounded glow-cyan" />
        المؤشرات المستخرجة
      </h2>
      <div className="space-y-4">
        {sections.map(({ key, label, color }) => {
          const items = extracted[key] as string[];
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <div className={`text-[10px] font-mono uppercase tracking-wider text-${color} mb-2`}>
                {label} ({items.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => copyText(v)}
                    title="انقر للنسخ"
                    className={`font-mono text-[11px] px-2.5 py-1 rounded border cursor-pointer hover:opacity-80 transition ${HUE_MAP[color]?.bg8 ?? "bg-surface-2"} ${HUE_MAP[color]?.border30 ?? "border-border"} ${HUE_MAP[color]?.text ?? "text-foreground"}`}
                    dir="ltr"
                  >
                    {v.length > 60 ? v.substring(0, 57) + "..." : v}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExternalLinksSection({ links }: { links: ExternalLink[] }) {
  const [filter, setFilter] = useState<string>("الكل");
  const categories = ["الكل", ...Array.from(new Set(links.map((l) => l.categoryAr)))];
  const filtered = filter === "الكل" ? links : links.filter((l) => l.categoryAr === filter);

  return (
    <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".12s" }}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded glow-cyan" />
          أدوات OSINT الخارجية
          <span className="text-xs font-mono text-muted-foreground">{links.length} أداة</span>
        </h2>
        <div className="flex flex-wrap gap-1.5 mr-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition ${filter === cat ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-surface-2/60 transition"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm group-hover:text-cyan transition">{link.name}</span>
                {link.free && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-safe/10 border border-safe/30 text-safe font-mono">FREE</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
              <div className={`mt-2 text-[10px] inline-block px-2 py-0.5 rounded border ${getCategoryColor(link.categoryAr)}`}>
                {link.categoryAr}
              </div>
            </div>
            <span className="text-muted-foreground group-hover:text-primary transition shrink-0">↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}
