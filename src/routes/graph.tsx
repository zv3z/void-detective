import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { MODULES } from "@/lib/dfas-data";
import type { OsintType } from "@/lib/dfas-data";
import {
  hasBackend,
  apiGetGraph,
  apiAddGraphNode,
  apiRemoveGraphNode,
  apiAddGraphEdge,
  apiRemoveGraphEdge,
  apiResetGraph,
} from "@/lib/api";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "VoidSINT · خريطة الروابط التحقيقية" },
      { name: "description", content: "رسم بياني تفاعلي لشبكة العلاقات بين كيانات التحقيق OSINT." },
    ],
  }),
  component: GraphPage,
});

const LOCAL_KEY = "voidsint-graph";

interface GraphNode {
  id: string;
  type: OsintType;
  value: string;
  label: string;
  x: number;
  y: number;
  hue: string;
  icon: string;
  addedAt: string;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const HUE_COLORS: Record<string, string> = {
  cyan:     "oklch(0.75 0.16 220)",
  info:     "oklch(0.7 0.14 240)",
  warning:  "oklch(0.78 0.16 75)",
  safe:     "oklch(0.72 0.18 155)",
  high:     "oklch(0.72 0.19 45)",
  critical: "oklch(0.65 0.24 22)",
};

function loadLocalGraph(): GraphState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw) as GraphState;
  } catch {}
  return { nodes: [], edges: [] };
}

function saveLocalGraph(g: GraphState) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(g));
  } catch {}
}

function GraphPage() {
  const [graph, setGraph] = useState<GraphState>({ nodes: [], edges: [] });
  const [usingBackend, setUsingBackend] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<OsintType>("username");
  const [newValue, setNewValue] = useState("");
  const [showEdgeForm, setShowEdgeForm] = useState(false);
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  // Load graph on mount
  useEffect(() => {
    if (hasBackend()) {
      setUsingBackend(true);
      apiGetGraph()
        .then((data) => {
          setGraph({
            nodes: data.nodes.map((n) => ({
              id: n.id,
              type: n.type as OsintType,
              value: n.value,
              label: n.label,
              x: n.x,
              y: n.y,
              hue: n.hue,
              icon: n.icon,
              addedAt: n.added_at,
            })),
            edges: data.edges.map((e) => ({
              id: e.id,
              from: e.from_node,
              to: e.to_node,
              label: e.label,
            })),
          });
        })
        .catch(() => {
          // API failed — fall back to local
          setUsingBackend(false);
          setGraph(loadLocalGraph());
        });
    } else {
      setGraph(loadLocalGraph());
    }
  }, []);

  // Persist to localStorage when not using backend
  useEffect(() => {
    if (!usingBackend) saveLocalGraph(graph);
  }, [graph, usingBackend]);

  const addNode = async () => {
    if (!newValue.trim()) return;
    const mod = MODULES.find((m) => m.type === newType);
    const id = `${newType}-${Date.now()}`;
    const node: GraphNode = {
      id,
      type: newType,
      value: newValue.trim(),
      label: newValue.trim().substring(0, 18),
      x: 120 + Math.random() * 560,
      y: 100 + Math.random() * 360,
      hue: mod?.hue ?? "cyan",
      icon: mod?.icon ?? "◉",
      addedAt: new Date().toISOString(),
    };

    if (usingBackend) {
      try {
        const saved = await apiAddGraphNode({
          id: node.id,
          type: node.type,
          value: node.value,
          label: node.label,
          x: node.x,
          y: node.y,
          hue: node.hue,
          icon: node.icon,
        });
        node.addedAt = saved.added_at;
        node.id = saved.id;
      } catch {
        // continue with local node
      }
    }

    setGraph((g) => ({ ...g, nodes: [...g.nodes, node] }));
    setNewValue("");
    setShowAddForm(false);
  };

  const addEdge = async () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    const id = `edge-${Date.now()}`;
    const edgeLabel2 = edgeLabel || "مرتبط";

    if (usingBackend) {
      try {
        const saved = await apiAddGraphEdge({
          id,
          from_node: edgeFrom,
          to_node: edgeTo,
          label: edgeLabel2,
        });
        setGraph((g) => ({
          ...g,
          edges: [...g.edges, { id: saved.id, from: saved.from_node, to: saved.to_node, label: saved.label }],
        }));
      } catch {
        setGraph((g) => ({ ...g, edges: [...g.edges, { id, from: edgeFrom, to: edgeTo, label: edgeLabel2 }] }));
      }
    } else {
      setGraph((g) => ({ ...g, edges: [...g.edges, { id, from: edgeFrom, to: edgeTo, label: edgeLabel2 }] }));
    }

    setEdgeFrom("");
    setEdgeTo("");
    setEdgeLabel("");
    setShowEdgeForm(false);
  };

  const removeNode = async (id: string) => {
    if (usingBackend) {
      try { await apiRemoveGraphNode(id); } catch {}
    }
    // Also remove connected edges
    if (usingBackend) {
      const edgeIds = graph.edges.filter((e) => e.from === id || e.to === id).map((e) => e.id);
      for (const eid of edgeIds) {
        try { await apiRemoveGraphEdge(eid); } catch {}
      }
    }
    setGraph((g) => ({
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.from !== id && e.to !== id),
    }));
    if (selected === id) setSelected(null);
  };

  const clearGraph = async () => {
    if (!confirm("هل تريد مسح الخريطة بالكامل؟")) return;
    if (usingBackend) {
      try { await apiResetGraph(); } catch {}
    }
    setGraph({ nodes: [], edges: [] });
    setSelected(null);
  };

  const getNodeById = useCallback((id: string) => graph.nodes.find((n) => n.id === id), [graph.nodes]);

  const getSVGPoint = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const pt = getSVGPoint(e);
    const node = getNodeById(id)!;
    setDragging(id);
    setDragOffset({ x: pt.x - node.x, y: pt.y - node.y });
    setSelected(id);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const pt = getSVGPoint(e);
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === dragging
          ? { ...n, x: Math.max(40, Math.min(760, pt.x - dragOffset.x)), y: Math.max(40, Math.min(460, pt.y - dragOffset.y)) }
          : n
      ),
    }));
  };

  const selectedNode = selected ? getNodeById(selected) : null;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-full mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-up">
        <div>
          <div className="text-xs font-mono text-cyan tracking-widest">OSINT · INVESTIGATION · GRAPH</div>
          <h1 className="text-xl lg:text-2xl font-bold mt-0.5">خريطة الروابط التحقيقية</h1>
          <div className="text-[10px] font-mono mt-1">
            {usingBackend
              ? <span className="text-safe">● قاعدة بيانات متصلة</span>
              : <span className="text-muted-foreground">● وضع محلي</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm glow-cyan hover:scale-[1.02] transition">
            + إضافة كيان
          </button>
          {graph.nodes.length > 1 && (
            <button type="button" onClick={() => setShowEdgeForm(!showEdgeForm)} className="px-4 py-2 rounded-lg border border-info/40 text-info text-sm hover:bg-info/10 transition">
              ⟶ ربط كيانين
            </button>
          )}
          {graph.nodes.length > 0 && (
            <button type="button" onClick={clearGraph} className="px-4 py-2 rounded-lg border border-critical/40 text-critical text-sm hover:bg-critical/10 transition">
              ✕ مسح الخريطة
            </button>
          )}
        </div>
      </div>

      {/* Add node form */}
      {showAddForm && (
        <div className="glass rounded-xl p-5 animate-fade-up border border-primary/30">
          <h3 className="font-semibold mb-3 text-sm">إضافة كيان جديد</h3>
          <div className="flex flex-wrap gap-3">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as OsintType)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            >
              {MODULES.map((m) => (
                <option key={m.type} value={m.type}>{m.icon} {m.nameAr}</option>
              ))}
            </select>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="أدخل القيمة..."
              dir="ltr"
              className="flex-1 min-w-40 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && addNode()}
            />
            <button type="button" onClick={addNode} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              إضافة
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Add edge form */}
      {showEdgeForm && (
        <div className="glass rounded-xl p-5 animate-fade-up border border-info/30">
          <h3 className="font-semibold mb-3 text-sm">ربط كيانين</h3>
          <div className="flex flex-wrap gap-3">
            <select value={edgeFrom} onChange={(e) => setEdgeFrom(e.target.value)}
              className="flex-1 min-w-32 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary">
              <option value="">الكيان الأول...</option>
              {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.icon} {n.label}</option>)}
            </select>
            <select value={edgeTo} onChange={(e) => setEdgeTo(e.target.value)}
              className="flex-1 min-w-32 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary">
              <option value="">الكيان الثاني...</option>
              {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.icon} {n.label}</option>)}
            </select>
            <input type="text" value={edgeLabel} onChange={(e) => setEdgeLabel(e.target.value)}
              placeholder="تسمية الرابط..."
              className="flex-1 min-w-28 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
            <button type="button" onClick={addEdge} className="px-5 py-2 rounded-lg bg-info text-primary-foreground text-sm font-semibold">
              ربط
            </button>
            <button type="button" onClick={() => setShowEdgeForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-3 glass rounded-xl overflow-hidden relative" style={{ minHeight: 520 }}>
          {graph.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl text-cyan/30 mb-4">⬡</div>
              <h3 className="text-lg font-bold text-muted-foreground">الخريطة فارغة</h3>
              <p className="text-sm text-muted-foreground/60 mt-2 max-w-sm">
                أضف كيانات تحقيق من الزر أعلاه، أو من صفحة التحقيق بالنقر على "إضافة إلى خريطة الروابط".
              </p>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setShowAddForm(true)} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm glow-cyan">
                  + إضافة أول كيان
                </button>
                <Link to="/modules" className="px-5 py-2.5 rounded-lg border border-border text-sm">
                  محركات التحقيق
                </Link>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              className="w-full h-full"
              style={{ minHeight: 520, cursor: dragging ? "grabbing" : "default" }}
              onMouseMove={onMouseMove}
              onMouseUp={() => setDragging(null)}
              onMouseLeave={() => setDragging(null)}
              onClick={() => setSelected(null)}
            >
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="oklch(0.65 0.02 240)" />
                </marker>
              </defs>

              {/* Edges */}
              {graph.edges.map((edge) => {
                const fromNode = getNodeById(edge.from);
                const toNode = getNodeById(edge.to);
                if (!fromNode || !toNode) return null;
                const mx = (fromNode.x + toNode.x) / 2;
                const my = (fromNode.y + toNode.y) / 2;
                return (
                  <g key={edge.id}>
                    <line
                      x1={fromNode.x} y1={fromNode.y}
                      x2={toNode.x} y2={toNode.y}
                      stroke="oklch(0.35 0.025 248)"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      markerEnd="url(#arrow)"
                    />
                    <text x={mx} y={my - 5} textAnchor="middle" fontSize={9} fill="oklch(0.55 0.02 240)" fontFamily="IBM Plex Mono">
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {graph.nodes.map((node) => {
                const color = HUE_COLORS[node.hue] ?? HUE_COLORS.cyan;
                const isSelected = selected === node.id;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    style={{ cursor: "grab" }}
                    onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                    onClick={(e) => { e.stopPropagation(); setSelected(node.id); }}
                  >
                    <circle r={32} fill="oklch(0.18 0.022 248)" stroke={color} strokeWidth={isSelected ? 2.5 : 1.5}
                      style={{ filter: isSelected ? `drop-shadow(0 0 12px ${color})` : `drop-shadow(0 0 4px ${color}55)` }} />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={18} y={-3}>
                      {node.icon}
                    </text>
                    <text textAnchor="middle" y={20} fontSize={9} fill="oklch(0.75 0.16 220)" fontFamily="IBM Plex Mono">
                      {node.label.substring(0, 14)}
                    </text>
                    <text textAnchor="middle" y={32} fontSize={8} fill="oklch(0.55 0.02 240)" fontFamily="IBM Plex Mono">
                      {node.type}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-3">
          {/* Stats */}
          <div className="glass rounded-xl p-4">
            <div className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">GRAPH · STATS</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الكيانات</span>
                <span className="font-mono text-cyan">{graph.nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الروابط</span>
                <span className="font-mono text-cyan">{graph.edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الأنواع</span>
                <span className="font-mono text-cyan">{new Set(graph.nodes.map((n) => n.type)).size}</span>
              </div>
            </div>
          </div>

          {/* Selected node */}
          {selectedNode && (
            <div className="glass rounded-xl p-4 border border-primary/30">
              <div className="text-[10px] font-mono text-cyan tracking-widest mb-3">SELECTED · NODE</div>
              <div className="text-2xl mb-2">{selectedNode.icon}</div>
              <div className="font-bold text-sm mb-1">{selectedNode.value}</div>
              <div className="text-xs text-muted-foreground mb-3">{selectedNode.type}</div>
              <div className="space-y-2">
                <Link
                  to="/modules/$slug"
                  params={{ slug: selectedNode.type }}
                  className="block w-full text-center px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs hover:bg-primary/20 transition"
                >
                  تحقيق →
                </Link>
                <button
                  type="button"
                  onClick={() => removeNode(selectedNode.id)}
                  className="block w-full text-center px-3 py-2 rounded-lg border border-critical/30 text-critical text-xs hover:bg-critical/10 transition"
                >
                  حذف الكيان
                </button>
              </div>
            </div>
          )}

          {/* Nodes list */}
          {graph.nodes.length > 0 && (
            <div className="glass rounded-xl p-4">
              <div className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">ALL · NODES</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {graph.nodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelected(node.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition text-right ${selected === node.id ? "bg-primary/10 border border-primary/30" : "hover:bg-surface-2"}`}
                  >
                    <span>{node.icon}</span>
                    <span className="flex-1 truncate font-mono">{node.label}</span>
                    <span className={`text-${node.hue} opacity-60`}>{node.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type breakdown */}
          {graph.nodes.length > 0 && (
            <div className="glass rounded-xl p-4">
              <div className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">TYPE · BREAKDOWN</div>
              <div className="space-y-1.5">
                {MODULES.filter((m) => graph.nodes.some((n) => n.type === m.type)).map((m) => {
                  const count = graph.nodes.filter((n) => n.type === m.type).length;
                  return (
                    <div key={m.type} className="flex items-center gap-2 text-xs">
                      <span>{m.icon}</span>
                      <span className="flex-1 text-muted-foreground">{m.nameAr.split(" ")[0]}</span>
                      <span className={`font-mono text-${m.hue}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
