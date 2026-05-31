import { createFileRoute, Link } from "@tanstack/react-router";
import { Counter, Sparkline } from "@/components/dfas/ui";
import { MODULES } from "@/lib/dfas-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "VoidSINT · لوحة التحكم" },
      { name: "description", content: "نظرة شاملة على نشاط التحقيق OSINT والإحصاءات." },
    ],
  }),
  component: Dashboard,
});

const METRICS = [
  { label: "إجمالي التحقيقات",  value: 3847,  hue: "cyan",    trend: [12, 18, 14, 22, 28, 24, 32], delta: "+12.4%" },
  { label: "كيانات محللة",       value: 9241,  hue: "info",    trend: [40, 42, 48, 55, 52, 60, 68], delta: "+18%" },
  { label: "محافظ مكتشفة",       value: 287,   hue: "warning", trend: [4, 6, 3, 8, 12, 9, 14],     delta: "+5.1%" },
  { label: "نطاقات مشبوهة",      value: 47,    hue: "critical",trend: [3, 3, 5, 4, 6, 5, 7],       delta: "+2" },
];

const RECENT_INVESTIGATIONS: { id: string; target: string; type: string; icon: string; risk: number; hue: string; time: string }[] = [
  { id: "INV-0847", target: "johndoe",           type: "Username",  icon: "◉", risk: 65, hue: "warning", time: "منذ دقيقتين" },
  { id: "INV-0846", target: "8.8.8.8",            type: "IP",        icon: "⊕", risk: 30, hue: "info",    time: "منذ 12 دقيقة" },
  { id: "INV-0845", target: "malware-c2.xyz",     type: "Domain",    icon: "⊗", risk: 85, hue: "critical",time: "منذ 25 دقيقة" },
  { id: "INV-0844", target: "test@protonmail.com",type: "Email",     icon: "⊙", risk: 20, hue: "safe",    time: "منذ ساعة" },
  { id: "INV-0843", target: "+966501234567",       type: "Phone",     icon: "◎", risk: 35, hue: "info",    time: "منذ ساعتين" },
  { id: "INV-0842", target: "1A1zP1eP5QGef...",   type: "Crypto",    icon: "⬡", risk: 55, hue: "warning", time: "منذ 3 ساعات" },
];

function RiskBar({ value, hue }: { value: number; hue: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div className={`h-full bg-${hue} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      <span className={`font-mono text-xs text-${hue} w-7`}>{value}</span>
    </div>
  );
}

function TypeDonut() {
  const segs = [
    { label: "Username", value: 28, color: "var(--cyan)" },
    { label: "Domain",   value: 22, color: "var(--safe)" },
    { label: "Email",    value: 18, color: "var(--info)" },
    { label: "IP",       value: 15, color: "var(--warning)" },
    { label: "أخرى",    value: 17, color: "var(--high)" },
  ];
  const total = segs.reduce((a, b) => a + b.value, 0);
  const r = 60, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={152} height={152} className="-rotate-90">
        <circle cx={76} cy={76} r={r} fill="none" stroke="oklch(0.22 0.025 248)" strokeWidth={16} />
        {segs.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={s.label} cx={76} cy={76} r={r} fill="none" stroke={s.color}
              strokeWidth={16} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc}
              style={{ filter: `drop-shadow(0 0 4px ${s.color})` }} />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="space-y-2">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-mono mr-auto pl-2">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityBars() {
  const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const data = [14, 22, 18, 30, 26, 38, 32];
  const max = Math.max(...data);
  return (
    <div>
      <div className="flex items-end gap-2 h-40">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[10px] font-mono text-muted-foreground">{d}</div>
            <div className="w-full rounded-t-sm bg-gradient-to-t from-primary/40 to-cyan/70 transition-all duration-700"
              style={{ height: `${(d / max) * 100}%`, boxShadow: "0 0 8px oklch(0.75 0.16 220 / 0.3)" }} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {days.map((d) => <div key={d} className="flex-1 text-center text-[9px] text-muted-foreground">{d.slice(0, 3)}</div>)}
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="px-6 lg:px-12 py-8 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="text-xs font-mono text-cyan tracking-widest">OSINT · OPERATIONS · CENTER</div>
        <h1 className="text-2xl lg:text-3xl font-bold mt-1">لوحة التحكم</h1>
        <p className="text-sm text-muted-foreground mt-1">نظرة حيّة على نشاط التحقيق وإحصاءات المنصة.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((m, i) => (
          <div key={m.label} className="glass glass-hover rounded-xl p-5 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex items-start justify-between">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
              <Sparkline data={m.trend} color={`var(--${m.hue})`} />
            </div>
            <div className={`mt-3 text-3xl font-bold text-${m.hue}`}><Counter value={m.value} /></div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">{m.delta} عن الأسبوع الماضي</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">توزيع أنواع التحقيق</h3>
            <span className="text-[10px] font-mono text-muted-foreground">آخر 30 يوماً</span>
          </div>
          <TypeDonut />
        </div>
        <div className="glass rounded-xl p-6 lg:col-span-2 animate-fade-up" style={{ animationDelay: ".1s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">نشاط التحقيق اليومي</h3>
            <span className="text-[10px] font-mono text-muted-foreground">آخر 7 أيام</span>
          </div>
          <ActivityBars />
        </div>
      </div>

      {/* Modules quick access */}
      <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".12s" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">محركات التحقيق</h3>
          <Link to="/modules" className="text-xs text-cyan hover:underline">عرض الكل ←</Link>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {MODULES.map((m) => (
            <Link
              key={m.id}
              to="/modules/$slug"
              params={{ slug: m.slug }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition hover:scale-[1.05] border-${m.hue}/30 bg-${m.hue}/5 text-${m.hue}`}
            >
              <span className="text-xl">{m.icon}</span>
              <span className="text-[9px] font-mono">{m.badge}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent investigations */}
      <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: ".15s" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">آخر التحقيقات</h3>
          <Link to="/cases" className="text-xs text-cyan hover:underline">القضايا ←</Link>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-right font-medium px-2 py-3">معرّف</th>
                <th className="text-right font-medium px-2 py-3">الهدف</th>
                <th className="text-right font-medium px-2 py-3">النوع</th>
                <th className="text-right font-medium px-2 py-3">درجة الخطر</th>
                <th className="text-right font-medium px-2 py-3">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_INVESTIGATIONS.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-surface-2/40 transition">
                  <td className="px-2 py-3 font-mono text-cyan text-xs">{r.id}</td>
                  <td className="px-2 py-3 font-mono text-xs" dir="ltr">{r.target}</td>
                  <td className="px-2 py-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>{r.icon}</span>
                      <span>{r.type}</span>
                    </span>
                  </td>
                  <td className="px-2 py-3"><RiskBar value={r.risk} hue={r.hue} /></td>
                  <td className="px-2 py-3 text-xs text-muted-foreground">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
