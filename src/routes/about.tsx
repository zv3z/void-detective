import { createFileRoute, Link } from "@tanstack/react-router";
import { MODULES } from "@/lib/dfas-data";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "VoidSINT · حول المنصة" },
      { name: "description", content: "VoidSINT — منصة OSINT عربية مفتوحة المصدر، مستوحاة من Flowsint." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="px-6 lg:px-12 py-8 max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="glass rounded-2xl p-8 text-center relative overflow-hidden animate-fade-up">
        <div className="absolute inset-0 bg-gradient-to-l from-primary/5 via-transparent to-cyan/5" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[11px] font-mono mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
            OSINT PLATFORM · v1.0 · TLP:AMBER
          </div>
          <h1 className="text-4xl font-bold glow-text-cyan">VoidSINT</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            منصة استخبارات مفتوحة المصدر (OSINT) احترافية، مستوحاة من مشروع <strong className="text-cyan">Flowsint</strong> العالمي.
          </p>
        </div>
      </div>

      {/* About Flowsint */}
      <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".05s" }}>
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
          <span className="text-cyan">⬡</span> مستوحاة من Flowsint
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Flowsint</strong> هو مشروع OSINT مفتوح المصدر حقيقي ومعتمد على GitHub
          بأكثر من <strong className="text-cyan">3,700 نجمة</strong>، طوّره <strong className="text-foreground">reconurge</strong>.
          يقدم نظاماً للتحقيق البصري القائم على الرسوم البيانية مع محركات تحليل (transformers) متقدمة للنطاقات وعناوين IP والمنظمات والمزيد.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          {[
            { label: "TypeScript",  value: "اللغة الأساسية", icon: "⌨" },
            { label: "+3,700",      value: "نجمة على GitHub", icon: "⭐" },
            { label: "Neo4j",       value: "قاعدة بيانات الرسم البياني", icon: "⬡" },
            { label: "Docker",      value: "بنية التشغيل",   icon: "🐳" },
          ].map((s) => (
            <div key={s.label} className="bg-surface-2/60 rounded-lg p-3">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="font-mono font-bold text-cyan">{s.label}</div>
              <div className="text-muted-foreground mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform features */}
      <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".1s" }}>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="text-cyan">◈</span> قدرات VoidSINT
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map((m) => (
            <Link
              key={m.id}
              to="/modules/$slug"
              params={{ slug: m.slug }}
              className="flex items-start gap-3 p-4 rounded-lg bg-surface-2/50 hover:bg-surface-2 transition border border-border hover:border-primary/30 group"
            >
              <div className={`text-2xl text-${m.hue} mt-0.5`}>{m.icon}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{m.nameAr}</span>
                  <span className="text-[9px] font-mono text-muted-foreground">{m.badge}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.descAr}</p>
              </div>
              <span className="mr-auto text-muted-foreground group-hover:text-cyan transition text-sm shrink-0">←</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".15s" }}>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="text-cyan">⊕</span> المكدس التقني
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { name: "React 19",         desc: "واجهة المستخدم",       icon: "⚛" },
            { name: "TypeScript",       desc: "لغة البرمجة",          icon: "⌨" },
            { name: "TanStack Router",  desc: "التوجيه",              icon: "⇒" },
            { name: "Tailwind v4",      desc: "التصميم",              icon: "🎨" },
            { name: "shadcn/ui",        desc: "مكونات الواجهة",       icon: "◧" },
            { name: "Vite 7",           desc: "أداة البناء",          icon: "⚡" },
            { name: "IBM Plex Arabic",  desc: "الخط العربي",          icon: "أ" },
            { name: "LocalStorage",     desc: "حفظ الخرائط",          icon: "💾" },
          ].map((t) => (
            <div key={t.name} className="bg-surface-2/60 rounded-lg p-3 text-center">
              <div className="text-xl mb-1">{t.icon}</div>
              <div className="font-mono font-bold text-xs text-cyan">{t.name}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ethics */}
      <div className="glass rounded-xl p-6 border border-warning/30 animate-fade-up" style={{ animationDelay: ".2s" }}>
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2 text-warning">
          <span>⚠</span> تنبيه أخلاقي وقانوني
        </h2>
        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>• هذه المنصة مخصصة <strong className="text-foreground">للأغراض التعليمية والبحثية والدفاعية فقط</strong>.</p>
          <p>• لا يجوز استخدامها لانتهاك خصوصية الأفراد أو ملاحقتهم أو مضايقتهم.</p>
          <p>• المسؤولية الكاملة على المستخدم في التأكد من مشروعية أي تحقيق.</p>
          <p>• جميع الروابط الخارجية تؤدي إلى خدمات مستقلة — استخدمها وفق شروط خدمة كل منصة.</p>
          <p className="font-mono text-[11px] text-cyan border-t border-border/60 pt-3 mt-3">
            TLP:AMBER · للاستخدام الداخلي المحدود · ISO 27001 · OSINT Ethics Framework
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground font-mono animate-fade-up" style={{ animationDelay: ".25s" }}>
        VoidSINT v1.0 · مستوحاة من <span className="text-cyan">reconurge/flowsint</span> · بُني بـ React 19 + TypeScript
      </div>
    </div>
  );
}
