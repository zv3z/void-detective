import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { OsintType } from "@/lib/dfas-data";
import { MODULES } from "@/lib/dfas-data";
import {
  apiGetCases, apiCreateCase, apiUpdateCase, apiDeleteCase,
  hasBackend, type ApiCase,
} from "@/lib/api";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "VoidSINT · القضايا" },
      { name: "description", content: "إدارة قضايا التحقيق وتتبع الأهداف المحفوظة." },
    ],
  }),
  component: Cases,
});

const LS_CASES_KEY = "voidsint-cases";

const SAMPLE_CASES: ApiCase[] = [
  { id: "CASE-0847", name: "تحقيق الحساب المشبوه",    target: "suspicious_user99", type: "username", icon: "◉", hue: "warning",  status: "نشطة",  priority: "حرج",   notes: "حساب ينشر محتوى مشبوهاً", created_at: "2026-05-30T00:00:00Z", updated_at: "2026-05-30T00:00:00Z" },
  { id: "CASE-0846", name: "فحص النطاق الضار",          target: "malware-c2.xyz",   type: "domain",   icon: "⊗", hue: "critical", status: "نشطة",  priority: "حرج",   notes: "نطاق مرتبط بهجمات C2",    created_at: "2026-05-29T00:00:00Z", updated_at: "2026-05-29T00:00:00Z" },
  { id: "CASE-0845", name: "تتبع المحفظة الرقمية",      target: "1A1zP1eP5QGef...", type: "crypto",   icon: "⬡", hue: "warning",  status: "معلقة", priority: "مرتفع", notes: "محفظة BTC مشبوهة",         created_at: "2026-05-28T00:00:00Z", updated_at: "2026-05-28T00:00:00Z" },
  { id: "CASE-0844", name: "تحقيق IP خارجي",            target: "203.0.113.50",     type: "ip",       icon: "⊕", hue: "info",     status: "مغلقة", priority: "متوسط", notes: "IP من نطاق APNIC",         created_at: "2026-05-27T00:00:00Z", updated_at: "2026-05-27T00:00:00Z" },
  { id: "CASE-0843", name: "فحص البريد المشبوه",        target: "phish@evil-corp.tk",type: "email",   icon: "⊙", hue: "critical", status: "مغلقة", priority: "مرتفع", notes: "بريد تصيد مؤكد",           created_at: "2026-05-26T00:00:00Z", updated_at: "2026-05-26T00:00:00Z" },
];

function loadLocalCases(): ApiCase[] {
  try {
    const raw = localStorage.getItem(LS_CASES_KEY);
    if (raw) return JSON.parse(raw) as ApiCase[];
  } catch { /* ignore */ }
  return SAMPLE_CASES;
}

function saveLocalCases(cases: ApiCase[]) {
  try { localStorage.setItem(LS_CASES_KEY, JSON.stringify(cases)); } catch { /* ignore */ }
}

const STATUS_STYLES: Record<string, string> = {
  "نشطة":  "bg-safe/10 text-safe border-safe/30",
  "مغلقة": "bg-muted text-muted-foreground border-border",
  "معلقة": "bg-warning/10 text-warning border-warning/30",
};
const PRIORITY_STYLES: Record<string, string> = {
  "حرج":   "bg-critical/10 text-critical border-critical/30",
  "مرتفع": "bg-high/10 text-high border-high/30",
  "متوسط": "bg-warning/10 text-warning border-warning/30",
  "منخفض": "bg-info/10 text-info border-info/30",
};

function Cases() {
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"الكل" | "نشطة" | "مغلقة" | "معلقة">("الكل");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiCase | null>(null);
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formType, setFormType] = useState<OsintType>("username");
  const [formStatus, setFormStatus] = useState("نشطة");
  const [formPriority, setFormPriority] = useState("متوسط");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (hasBackend()) {
        try {
          setCases(await apiGetCases());
        } catch {
          setCases(loadLocalCases());
        }
      } else {
        setCases(loadLocalCases());
      }
      setLoading(false);
    }
    void load();
  }, []);

  async function submitForm() {
    if (!formName.trim() || !formTarget.trim()) return;
    const mod = MODULES.find((m) => m.type === formType);

    if (editing) {
      const updates = { name: formName, target: formTarget, status: formStatus, priority: formPriority, notes: formNotes };
      if (hasBackend()) {
        try {
          const updated = await apiUpdateCase(editing.id, updates);
          setCases((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
        } catch { /* silent */ }
      } else {
        const updated: ApiCase = { ...editing, ...updates, updated_at: new Date().toISOString() };
        setCases((cs) => { const n = cs.map((c) => c.id === editing.id ? updated : c); saveLocalCases(n); return n; });
      }
    } else {
      const draft: ApiCase = {
        id: `CASE-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        name: formName, target: formTarget, type: formType,
        icon: mod?.icon ?? "◉", hue: mod?.hue ?? "cyan",
        status: formStatus, priority: formPriority, notes: formNotes,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      if (hasBackend()) {
        try {
          const saved = await apiCreateCase({ name: draft.name, target: draft.target, type: draft.type, icon: draft.icon, hue: draft.hue, status: draft.status, priority: draft.priority, notes: draft.notes });
          setCases((cs) => [saved, ...cs]);
        } catch { setCases((cs) => { const n = [draft, ...cs]; saveLocalCases(n); return n; }); }
      } else {
        setCases((cs) => { const n = [draft, ...cs]; saveLocalCases(n); return n; });
      }
    }
    closeForm();
  }

  async function deleteCaseById(id: string) {
    if (!confirm("حذف هذه القضية؟")) return;
    if (hasBackend()) { try { await apiDeleteCase(id); } catch { /* ignore */ } }
    setCases((cs) => { const n = cs.filter((c) => c.id !== id); saveLocalCases(n); return n; });
  }

  function openEdit(c: ApiCase) {
    setEditing(c);
    setFormName(c.name); setFormTarget(c.target); setFormType(c.type as OsintType);
    setFormStatus(c.status); setFormPriority(c.priority); setFormNotes(c.notes);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false); setEditing(null);
    setFormName(""); setFormTarget(""); setFormType("username");
    setFormStatus("نشطة"); setFormPriority("متوسط"); setFormNotes("");
  }

  const filtered = cases.filter((c) => {
    if (filter !== "الكل" && c.status !== filter) return false;
    if (search && !c.name.includes(search) && !c.target.includes(search)) return false;
    return true;
  });

  const stats = { total: cases.length, active: cases.filter((c) => c.status === "نشطة").length, closed: cases.filter((c) => c.status === "مغلقة").length, pending: cases.filter((c) => c.status === "معلقة").length };

  return (
    <div className="px-6 lg:px-12 py-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <div className="text-xs font-mono text-cyan tracking-widest">OSINT · CASES · MANAGEMENT</div>
          <h1 className="text-2xl lg:text-3xl font-bold mt-1">إدارة القضايا</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تتبع وإدارة تحقيقات OSINT المحفوظة.{" "}
            {hasBackend()
              ? <span className="text-xs text-safe font-mono">● قاعدة بيانات متصلة</span>
              : <span className="text-xs text-warning font-mono">● وضع محلي</span>}
          </p>
        </div>
        <button type="button" onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm glow-cyan hover:scale-[1.02] transition">
          + قضية جديدة
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="glass rounded-xl p-6 border border-primary/30 animate-fade-up space-y-4">
          <h3 className="font-semibold">{editing ? "تعديل القضية" : "قضية جديدة"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">اسم القضية *</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="تحقيق في الحساب..."
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الهدف *</label>
              <input type="text" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} placeholder="username / IP / domain..." dir="ltr"
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نوع التحقيق</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value as OsintType)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
                {MODULES.map((m) => <option key={m.type} value={m.type}>{m.icon} {m.nameAr}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الأولوية</label>
              <select value={formPriority} onChange={(e) => setFormPriority(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
                {["حرج","مرتفع","متوسط","منخفض"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
                {["نشطة","معلقة","مغلقة"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ملاحظات</label>
              <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="ملاحظات..."
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={submitForm} disabled={!formName.trim() || !formTarget.trim()}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition">
              {editing ? "حفظ التعديلات" : "إنشاء القضية"}
            </button>
            <button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-lg border border-border text-sm hover:bg-surface-2 transition">إلغاء</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: ".05s" }}>
        {[
          { label: "إجمالي", value: stats.total,   color: "cyan" },
          { label: "نشطة",   value: stats.active,  color: "safe" },
          { label: "معلقة",  value: stats.pending, color: "warning" },
          { label: "مغلقة",  value: stats.closed,  color: "muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
            <div className={`text-3xl font-bold font-mono mt-1 text-${s.color}`}>{loading ? "…" : s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: ".08s" }}>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في القضايا..."
          className="flex-1 min-w-40 bg-surface-2 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary" />
        <div className="flex gap-2">
          {(["الكل","نشطة","معلقة","مغلقة"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${filter === f ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: ".1s" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-2/50">
              <tr className="border-b border-border">
                {["المعرّف","اسم القضية","الهدف","النوع","الحالة","الأولوية","التاريخ","إجراءات"].map((h) => (
                  <th key={h} className="text-right font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">جاري التحميل…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">لا توجد قضايا مطابقة</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-surface-2/40 transition group">
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
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-mono ${STATUS_STYLES[c.status] ?? ""}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-mono ${PRIORITY_STYLES[c.priority] ?? ""}`}>{c.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.created_at.split("T")[0]}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
                      <Link to="/modules/$slug" params={{ slug: c.type }} className="text-xs text-cyan hover:underline">تحقيق</Link>
                      <button type="button" onClick={() => openEdit(c)} className="text-xs text-info hover:underline">تعديل</button>
                      <button type="button" onClick={() => deleteCaseById(c.id)} className="text-xs text-critical hover:underline">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
