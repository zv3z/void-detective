import { useRouterState } from "@tanstack/react-router";
import { NAV } from "@/lib/dfas-data";

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const crumb = NAV.find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to)))?.label ?? "صفحة";

  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="flex items-center gap-3 px-4 lg:px-8 h-14">
        <button
          onClick={onMenu}
          className="lg:hidden w-9 h-9 rounded-lg bg-surface-2 grid place-items-center text-lg"
          aria-label="القائمة"
        >☰</button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span>VoidSINT</span>
          <span className="opacity-50">/</span>
          <span className="text-foreground">{crumb}</span>
        </div>

        <div className="mr-auto flex items-center gap-2">
          <StatusPill color="safe"    label="SOC"      value="مباشر" />
          <StatusPill color="warning" label="TLP"      value="AMBER" />
          <StatusPill color="info"    label="LATENCY"  value="42ms" />
        </div>
      </div>
    </header>
  );
}

function StatusPill({ color, label, value }: { color: "safe"|"warning"|"info"; label: string; value: string }) {
  const map = { safe: "bg-safe/15 text-safe border-safe/30", warning: "bg-warning/15 text-warning border-warning/30", info: "bg-info/15 text-info border-info/30" } as const;
  return (
    <div className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md border text-[10px] font-mono ${map[color]}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
