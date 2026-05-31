import { createFileRoute, Link } from "@tanstack/react-router";
import { MODULES } from "@/lib/dfas-data";

export const Route = createFileRoute("/modules/")({
  head: () => ({
    meta: [
      { title: "VoidSINT · التحقيق — اختر محرك OSINT" },
      { name: "description", content: "8 محركات OSINT متكاملة: أسماء مستخدمين، بريد، IP، نطاقات، هاتف، عملات رقمية، أشخاص، ومؤشرات اختراق." },
    ],
  }),
  component: InvestigateHub,
});

const HUE_CLASSES: Record<string, string> = {
  cyan:     "border-cyan/30 bg-cyan/5 text-cyan",
  info:     "border-info/30 bg-info/5 text-info",
  warning:  "border-warning/30 bg-warning/5 text-warning",
  safe:     "border-safe/30 bg-safe/5 text-safe",
  high:     "border-high/30 bg-high/5 text-high",
  critical: "border-critical/30 bg-critical/5 text-critical",
};

function InvestigateHub() {
  return (
    <div className="px-6 lg:px-12 py-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="text-xs font-mono text-cyan tracking-widest">OSINT · INVESTIGATION HUB</div>
        <h1 className="text-2xl lg:text-3xl font-bold mt-1">محركات التحقيق</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          اختر نوع الكيان الذي تريد التحقيق فيه — من نقطة انطلاق واحدة ابنِ خريطة تحقيقية متكاملة.
        </p>
      </div>

      {/* Quick icon nav */}
      <div className="glass rounded-xl p-5 animate-fade-up" style={{ animationDelay: ".05s" }}>
        <div className="text-xs font-mono text-muted-foreground mb-3">اختر محرك التحقيق المناسب لهدفك:</div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {MODULES.map((m) => (
            <Link
              key={m.id}
              to="/modules/$slug"
              params={{ slug: m.slug }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all hover:scale-[1.04] ${HUE_CLASSES[m.hue] ?? "border-border bg-surface-2"}`}
            >
              <span className="text-xl">{m.icon}</span>
              <span className="text-[10px] font-mono font-semibold">{m.badge}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {MODULES.map((m, i) => (
          <Link
            key={m.id}
            to="/modules/$slug"
            params={{ slug: m.slug }}
            className="group glass glass-hover rounded-xl p-6 relative overflow-hidden animate-fade-up flex flex-col"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className={`absolute -top-8 -left-8 w-28 h-28 rounded-full blur-3xl opacity-20 bg-${m.hue}`} />
            <div className="relative flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl ${HUE_CLASSES[m.hue] ?? ""}`}>
                  {m.icon}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 text-cyan border border-cyan/20">{m.badge}</span>
              </div>
              <h3 className="font-bold text-base leading-snug">{m.nameAr}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{m.descAr}</p>
            </div>
            <div className={`mt-5 flex items-center justify-between text-xs font-semibold text-${m.hue}`}>
              <span>بدء التحقيق</span>
              <span className="transition-transform group-hover:-translate-x-1.5 text-lg">←</span>
            </div>
            <div className={`absolute inset-x-0 bottom-0 h-0.5 bg-${m.hue} opacity-0 group-hover:opacity-60 transition`} />
          </Link>
        ))}
      </div>

      {/* Graph CTA */}
      <div className="glass rounded-xl p-6 flex flex-col sm:flex-row items-center gap-5 animate-fade-up" style={{ animationDelay: ".5s" }}>
        <div className="text-5xl text-cyan">⬡</div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">خريطة الروابط التحقيقية</h3>
          <p className="text-sm text-muted-foreground mt-1">
            أضف نتائج تحقيقاتك إلى الخريطة المرئية وارسم شبكة العلاقات بين الكيانات المختلفة.
          </p>
        </div>
        <Link to="/graph" className="shrink-0 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold glow-cyan">
          فتح الخريطة
        </Link>
      </div>
    </div>
  );
}
