import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on("error", (err) => console.error("[DB] Pool error:", err.message));
  }
  return pool;
}

// ─── Migrations ───────────────────────────────────────────────────────────────

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS investigations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(20)  NOT NULL,
  input       TEXT         NOT NULL,
  result      JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS investigations_type_idx  ON investigations(type);
CREATE INDEX IF NOT EXISTS investigations_time_idx  ON investigations(created_at DESC);

CREATE TABLE IF NOT EXISTS cases (
  id          VARCHAR(20)  PRIMARY KEY,
  name        TEXT         NOT NULL,
  target      TEXT         NOT NULL,
  type        VARCHAR(20)  NOT NULL,
  icon        VARCHAR(10)  NOT NULL DEFAULT '◉',
  hue         VARCHAR(20)  NOT NULL DEFAULT 'cyan',
  status      VARCHAR(20)  NOT NULL DEFAULT 'نشطة',
  priority    VARCHAR(20)  NOT NULL DEFAULT 'متوسط',
  notes       TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id          VARCHAR(100) PRIMARY KEY,
  type        VARCHAR(20)  NOT NULL,
  value       TEXT         NOT NULL,
  label       TEXT         NOT NULL,
  x           FLOAT        NOT NULL DEFAULT 200,
  y           FLOAT        NOT NULL DEFAULT 200,
  hue         VARCHAR(20)  NOT NULL DEFAULT 'cyan',
  icon        VARCHAR(10)  NOT NULL DEFAULT '◉',
  added_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id          VARCHAR(100) PRIMARY KEY,
  from_node   VARCHAR(100) NOT NULL,
  to_node     VARCHAR(100) NOT NULL,
  label       TEXT         NOT NULL DEFAULT 'مرتبط',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
`;

export async function initDB(): Promise<void> {
  const db = getPool();
  await db.query(SCHEMA);
  console.log("[DB] Schema ready");
}

// ─── Investigations ───────────────────────────────────────────────────────────

export async function saveInvestigation(
  type: string,
  input: string,
  result: object
): Promise<string> {
  const db = getPool();
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO investigations (type, input, result) VALUES ($1, $2, $3) RETURNING id`,
    [type, input, JSON.stringify(result)]
  );
  return rows[0].id;
}

export async function getInvestigations(limit = 50): Promise<InvRow[]> {
  const db = getPool();
  const { rows } = await db.query<InvRow>(
    `SELECT id, type, input, result, created_at FROM investigations ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getInvestigationById(id: string): Promise<InvRow | null> {
  const db = getPool();
  const { rows } = await db.query<InvRow>(
    `SELECT id, type, input, result, created_at FROM investigations WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export interface InvRow {
  id: string;
  type: string;
  input: string;
  result: object;
  created_at: string;
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export interface CaseRow {
  id: string;
  name: string;
  target: string;
  type: string;
  icon: string;
  hue: string;
  status: string;
  priority: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export async function getCases(): Promise<CaseRow[]> {
  const db = getPool();
  const { rows } = await db.query<CaseRow>(
    `SELECT * FROM cases ORDER BY created_at DESC`
  );
  return rows;
}

export async function getCaseById(id: string): Promise<CaseRow | null> {
  const db = getPool();
  const { rows } = await db.query<CaseRow>(
    `SELECT * FROM cases WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createCase(c: Omit<CaseRow, "created_at" | "updated_at">): Promise<CaseRow> {
  const db = getPool();
  const { rows } = await db.query<CaseRow>(
    `INSERT INTO cases (id, name, target, type, icon, hue, status, priority, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [c.id, c.name, c.target, c.type, c.icon, c.hue, c.status, c.priority, c.notes]
  );
  return rows[0];
}

export async function updateCase(
  id: string,
  fields: Partial<Pick<CaseRow, "name" | "target" | "status" | "priority" | "notes">>
): Promise<CaseRow | null> {
  const db = getPool();
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (!entries.length) return getCaseById(id);
  const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(", ");
  const vals = entries.map(([, v]) => v);
  const { rows } = await db.query<CaseRow>(
    `UPDATE cases SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...vals]
  );
  return rows[0] ?? null;
}

export async function deleteCase(id: string): Promise<boolean> {
  const db = getPool();
  const { rowCount } = await db.query(`DELETE FROM cases WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphNodeRow {
  id: string;
  type: string;
  value: string;
  label: string;
  x: number;
  y: number;
  hue: string;
  icon: string;
  added_at: string;
}

export interface GraphEdgeRow {
  id: string;
  from_node: string;
  to_node: string;
  label: string;
  created_at: string;
}

export async function getGraph(): Promise<{ nodes: GraphNodeRow[]; edges: GraphEdgeRow[] }> {
  const db = getPool();
  const [nodesRes, edgesRes] = await Promise.all([
    db.query<GraphNodeRow>(`SELECT * FROM graph_nodes ORDER BY added_at`),
    db.query<GraphEdgeRow>(`SELECT * FROM graph_edges ORDER BY created_at`),
  ]);
  return { nodes: nodesRes.rows, edges: edgesRes.rows };
}

export async function addGraphNode(n: Omit<GraphNodeRow, "added_at">): Promise<GraphNodeRow> {
  const db = getPool();
  const { rows } = await db.query<GraphNodeRow>(
    `INSERT INTO graph_nodes (id, type, value, label, x, y, hue, icon)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [n.id, n.type, n.value, n.label, n.x, n.y, n.hue, n.icon]
  );
  return rows[0];
}

export async function removeGraphNode(id: string): Promise<boolean> {
  const db = getPool();
  await db.query(`DELETE FROM graph_edges WHERE from_node = $1 OR to_node = $1`, [id]);
  const { rowCount } = await db.query(`DELETE FROM graph_nodes WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function addGraphEdge(e: Omit<GraphEdgeRow, "created_at">): Promise<GraphEdgeRow> {
  const db = getPool();
  const { rows } = await db.query<GraphEdgeRow>(
    `INSERT INTO graph_edges (id, from_node, to_node, label)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [e.id, e.from_node, e.to_node, e.label]
  );
  return rows[0];
}

export async function removeGraphEdge(id: string): Promise<boolean> {
  const db = getPool();
  const { rowCount } = await db.query(`DELETE FROM graph_edges WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function clearGraph(): Promise<void> {
  const db = getPool();
  await db.query(`DELETE FROM graph_edges`);
  await db.query(`DELETE FROM graph_nodes`);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
  const db = getPool();
  const [invTotal, invWeek, caseStats, typeStats, recentInv] = await Promise.all([
    db.query<{ count: string }>(`SELECT COUNT(*) as count FROM investigations`),
    db.query<{ count: string }>(`SELECT COUNT(*) as count FROM investigations WHERE created_at > NOW() - INTERVAL '7 days'`),
    db.query<{ status: string; count: string }>(`SELECT status, COUNT(*) as count FROM cases GROUP BY status`),
    db.query<{ type: string; count: string }>(`SELECT type, COUNT(*) as count FROM investigations GROUP BY type ORDER BY count DESC`),
    db.query<{ id: string; type: string; input: string; created_at: string }>(
      `SELECT id, type, input, created_at FROM investigations ORDER BY created_at DESC LIMIT 10`
    ),
  ]);

  return {
    totalInvestigations: parseInt(invTotal.rows[0]?.count ?? "0"),
    weekInvestigations: parseInt(invWeek.rows[0]?.count ?? "0"),
    casesByStatus: Object.fromEntries(caseStats.rows.map((r) => [r.status, parseInt(r.count)])),
    investigationsByType: Object.fromEntries(typeStats.rows.map((r) => [r.type, parseInt(r.count)])),
    recentInvestigations: recentInv.rows,
  };
}
