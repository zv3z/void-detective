import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { OsintType } from "@/lib/dfas-data";
import { MODULES } from "@/lib/dfas-data";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "VoidSINT · القضايا" },
      { name: "description", content: "إدارة قضايا التحقيق وتتبع الأهداف المحفوظة." },
    ],
  }),
  component: Cases,
});

interface Case {
  id: string;
  name: string;
  target: string;
  type: OsintType;
  icon: string;
  hue: string;
  status: "نشطة" | "مغلقة" | "معلقة";
  priority: "حرج" | "مرتفع" | "متوسط" | "منخفض";
  notes: string;
  createdAt: string;
}

const SAMPLE_CASES: Case[] = [
  { id: "CASE-0847", name: "تحقيق الحساب المشبوه",    target: "suspicious_user99", type: "username", icon: "◉", hue: "warning", status: "نشطة",  priority: "حرج",   notes: "حساب ينشر محتوى مشبوهاً", createdAt: "2026-05-30" },
  { id: "CASE-0846", name: "فحص النطاق الضار",          target: "malware-c2.xyz",    type: "domain",   icon: "⊗", hue: "critical",status: "نشطة",  priority: "حرج",   notes: "نطاق مرتبط بهجمات C2",    createdAt: "2026-05-29" },
  { id: "CASE-0845", name: "تتبع المحفظة الرقمية",      target: "1A1zP1eP5QGef...", type: "crypto",   icon: "⬡", hue: "warning", status: "معلقة", priority: "مرتفع", notes: "محفظة BTC مشبوهة",         createdAt: "2026-05-28" },
  { id: "CASE-0844", name: "تحقيق IP خارجي",            target: "203.0.113.50",      type: "ip",       icon: "⊕", hue: "info",    status: "مغلقة", priority: "متوسط", notes: "IP من نطاق APNIC",         createdAt: "2026-05-27" },
  { id: "CASE-0843", name: "فحص البريد المشبوه",        target: "phish@evil-corp.tk",type: "email",    icon: "⊙", hue: "critical",status: "مغلقة", priority: "مرتفع", notes: "بريد تصيد مؤكد",           createdAt: "2026-05-26" },
];

const STATUS_STYLES = {
  "نشطة":   "bg-safe/10 text-safe border-safe/30",
  "مغلقة":  "bg-muted text-muted-foreground border-border",
  "معلقة":  "bg-warning/10 text-warning border-warning/30",
};

const PRIORITY_STYLES = {
  "حرج":    "bg-critical/10 text-critical border-critical/30",
  "مرتفع":  "bg-high/10 text-high border-high/30",
  "متوسط":  "bg-warning/10 text-warning border-warning/30",
  "منخفض":  "bg-info/10 text-info border-info/30",
};

function Cases() {
  const [cases] = useState<Case[]>(SAMPLE_CASES);
  const [filter, setFilter] = useState<"الكل" | "نشطة" | "مغلقة" | "معلقة">("الكل");
  const [search, setSearch] = useState("");

  const filtered = cases.filter((c) => {
    if (filter !== "الكل" && c.status !== filter) return false;
    if (search && !c.name.includes(search) && !c.target.includes(search)) return false;
    return true;
  });

  const stats = {
    total: cases.length,
    active: cases.filter((c) => c.status === "نشطة").length,
    closed: cases.filter((c) => c.status === "مغلقة").length,
    pending: cases.filter((c) => c.status === "معلقة").length,
  };

  return (
    <div className="px-6 lg:px-12 py-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <div className="text-xs font-mono text-cyan tracking-widest">OSINT · CASES · MANAGEMENT</div>
          <h1 className="text-2xl lg:text-3xl font-bold mt-1">إدارة القضايا</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع وإدارة تحقيقات OSINT المحفوظة.</p>
        </div>
        <Link to="/modules" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm glow-cyan">
          + تحقيق جديد
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: ".05s" }}>
        {[
          { label: "إجمالي", value: stats.total, color: "cyan" },
          { label: "نشطة", value: stats.active, color: "safe" },
          { label: "معلقة", value: stats.pending, color: "warning" },
          { label: "مغلقة", value: stats.closed, color: "muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
            <div className={`text-3xl font-bold font-mono mt-1 text-${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: ".08s" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في القضايا..."
          className="flex-1 min-w-40 bg-surface-2 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          {(["الكل", "نشطة", "معلقة", "مغلقة"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${filter === f ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cases table */}
      <div className="glass rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: ".1s" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-2/50">
              <tr className="border-b border-border">
                <th className="text-right font-medium px-4 py-3">المعرّف</th>
                <th className="text-right font-medium px-4 py-3">اسم القضية</th>
                <th className="text-right font-medium px-4 py-3">الهدف</th>
                <th className="text-right font-medium px-4 py-3">النوع</th>
                <th className="text-right font-medium px-4 py-3">الحالة</th>
                <th className="text-right font-medium px-4 py-3">الأولوية</th>
                <th className="text-right font-medium px-4 py-3">التاريخ</th>
                <th className="text-right font-medium px-4 py-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-surface-2/40 transition">
                  <td className="px-4 py-3 font-mono text-cyan text-xs">{c.id}</td>
                  <td className="px-4 py-3 font-semibold text-sm">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground" dir="ltr">{c.target}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={`text-${c.hue}`}>{c.icon}</span>
                      <span>{MODULES.find((m) => m.type === c.type)?.nameAr.split(" ")[0] ?? c.type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-mono ${STATUS_STYLES[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-mono ${PRIORITY_STYLES[c.priority]}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.createdAt}</td>
                  <td className="px-4 py-3">
                    <Link
                      to="/modules/$slug"
                      params={{ slug: c.type }}
                      className="text-xs text-cyan hover:underline"
                    >
                      تحقيق →
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    لا توجد قضايا مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
