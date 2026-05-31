import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/dfas-data";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return now;
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const now = useClock();
  const time = now ? now.toLocaleTimeString("en-GB", { hour12: false }) : "──:──:──";
  const date = now ? now.toLocaleDateString("ar-EG", { day: "2-digit", month: "short", year: "numeric" }) : "── ─── ────";

  return (
    <>
      {open && (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />
      )}
      <aside
        className={[
          "fixed lg:sticky top-0 right-0 h-screen w-[260px] z-50",
          "glass border-l border-border flex flex-col",
          "transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-cyan flex items-center justify-center font-mono font-bold text-sm glow-cyan">
              VS
            </div>
            <div>
              <div className="font-bold tracking-wider glow-text-cyan">VoidSINT</div>
              <div className="text-[10px] text-muted-foreground font-mono">v1.0 · OSINT · TLP:AMBER</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={onClose}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  active
                    ? "bg-primary/10 text-primary glow-border"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                ].join(" ")}
              >
                <span className="text-lg w-6 text-center">{n.icon}</span>
                <span className="font-medium">{n.label}</span>
                {active && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-primary glow-cyan" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="glass rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">الوقت</span>
              <span className="font-mono text-sm text-cyan">{time}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">التاريخ</span>
              <span className="font-mono text-[11px]">{date}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-safe opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-safe" />
            </span>
            <span className="text-safe">متصل · النظام يعمل</span>
          </div>
        </div>
      </aside>
    </>
  );
}
