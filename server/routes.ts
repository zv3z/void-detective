import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  saveInvestigation, getInvestigations, getInvestigationById,
  getCases, getCaseById, createCase, updateCase, deleteCase,
  getGraph, addGraphNode, removeGraphNode, addGraphEdge, removeGraphEdge, clearGraph,
  getStats,
} from "./db.js";
import { runInvestigation, type OsintType } from "./osint.js";

const router = Router();

// ─── Health ───────────────────────────────────────────────────────────────────

router.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, version: "1.0.0", ts: new Date().toISOString() });
});

// ─── Investigate ─────────────────────────────────────────────────────────────

router.post("/investigate", async (req: Request, res: Response) => {
  const { type, input } = req.body as { type?: string; input?: string };
  if (!type || !input?.trim()) {
    res.status(400).json({ error: "type and input are required" });
    return;
  }
  const validTypes: OsintType[] = ["username","email","ip","domain","phone","crypto","person","ioc"];
  if (!validTypes.includes(type as OsintType)) {
    res.status(400).json({ error: `Invalid type: ${type}` });
    return;
  }

  try {
    const result = await runInvestigation(type as OsintType, input.trim());
    const id = await saveInvestigation(type, input.trim(), result);
    res.json({ id, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Investigation failed";
    res.status(500).json({ error: msg });
  }
});

router.get("/investigations", async (_req: Request, res: Response) => {
  try {
    const rows = await getInvestigations(100);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/investigations/:id", async (req: Request, res: Response) => {
  try {
    const row = await getInvestigationById(req.params["id"] as string);
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Cases ────────────────────────────────────────────────────────────────────

router.get("/cases", async (_req: Request, res: Response) => {
  try {
    res.json(await getCases());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/cases", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  if (!body.name || !body.target || !body.type) {
    res.status(400).json({ error: "name, target, type required" });
    return;
  }
  try {
    const now = new Date().getFullYear();
    const id = `CASE-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const row = await createCase({
      id,
      name:     String(body.name),
      target:   String(body.target),
      type:     String(body.type),
      icon:     String(body.icon ?? "◉"),
      hue:      String(body.hue ?? "cyan"),
      status:   String(body.status ?? "نشطة"),
      priority: String(body.priority ?? "متوسط"),
      notes:    String(body.notes ?? ""),
    });
    void now; // suppress unused var
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/cases/:id", async (req: Request, res: Response) => {
  try {
    const row = await getCaseById(req.params["id"] as string);
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/cases/:id", async (req: Request, res: Response) => {
  try {
    const row = await updateCase(req.params["id"] as string, req.body as Parameters<typeof updateCase>[1]);
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/cases/:id", async (req: Request, res: Response) => {
  try {
    const ok = await deleteCase(req.params["id"] as string);
    if (!ok) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Graph ────────────────────────────────────────────────────────────────────

router.get("/graph", async (_req: Request, res: Response) => {
  try {
    res.json(await getGraph());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/graph/nodes", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  if (!body.type || !body.value) {
    res.status(400).json({ error: "type and value required" });
    return;
  }
  try {
    const node = await addGraphNode({
      id:    body.id ? String(body.id) : `${body.type}-${Date.now()}`,
      type:  String(body.type),
      value: String(body.value),
      label: String(body.label ?? String(body.value).substring(0, 18)),
      x:     Number(body.x ?? 200 + Math.random() * 400),
      y:     Number(body.y ?? 150 + Math.random() * 300),
      hue:   String(body.hue ?? "cyan"),
      icon:  String(body.icon ?? "◉"),
    });
    res.status(201).json(node);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/graph/nodes/:id", async (req: Request, res: Response) => {
  try {
    const ok = await removeGraphNode(req.params["id"] as string);
    if (!ok) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/graph/edges", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  if (!body.from_node || !body.to_node) {
    res.status(400).json({ error: "from_node and to_node required" });
    return;
  }
  try {
    const edge = await addGraphEdge({
      id:        body.id ? String(body.id) : `edge-${Date.now()}`,
      from_node: String(body.from_node),
      to_node:   String(body.to_node),
      label:     String(body.label ?? "مرتبط"),
    });
    res.status(201).json(edge);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/graph/edges/:id", async (req: Request, res: Response) => {
  try {
    const ok = await removeGraphEdge(req.params["id"] as string);
    if (!ok) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/graph/reset", async (_req: Request, res: Response) => {
  try {
    await clearGraph();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    res.json(await getStats());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── OSINT samples ───────────────────────────────────────────────────────────

router.get("/samples", (_req: Request, res: Response) => {
  res.json({
    username: "torvalds",
    email:    "test@gmail.com",
    ip:       "8.8.8.8",
    domain:   "google.com",
    phone:    "+966501234567",
    crypto:   "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    person:   "محمد بن سلمان",
    ioc:      "IPs: 203.0.113.10\nHash: 5d41402abc4b2a76b9719d911017c592\nCVE-2024-12345",
  });
});

export default router;
