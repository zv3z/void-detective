// Frontend API client — connects to the VoidSINT backend.
// API URL is read from: localStorage "voidsint_api_url" → VITE_API_URL env → empty (fallback mode)

import type { InvestigationResult, OsintType } from "@/engines/osint-engines";

const LS_KEY = "voidsint_api_url";

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(LS_KEY);
    if (stored?.trim()) return stored.trim().replace(/\/$/, "");
  }
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl?.trim()) return envUrl.trim().replace(/\/$/, "");
  return "";
}

export function setApiUrl(url: string): void {
  localStorage.setItem(LS_KEY, url.trim());
}

export function clearApiUrl(): void {
  localStorage.removeItem(LS_KEY);
}

export function hasBackend(): boolean {
  return getApiUrl() !== "";
}

// ─── Core fetch ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiUrl();
  if (!base) throw new Error("NO_BACKEND");
  const resp = await fetch(`${base}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: resp.statusText })) as { error?: string };
    throw new Error(body.error ?? `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function checkBackend(): Promise<boolean> {
  try {
    await apiFetch<{ ok: boolean }>("/health");
    return true;
  } catch {
    return false;
  }
}

// ─── Investigate ─────────────────────────────────────────────────────────────

export interface InvestigateResponse {
  id: string;
  result: InvestigationResult;
}

export async function apiInvestigate(
  type: OsintType,
  input: string
): Promise<InvestigateResponse> {
  return apiFetch<InvestigateResponse>("/investigate", {
    method: "POST",
    body: JSON.stringify({ type, input }),
  });
}

// ─── Investigations list ──────────────────────────────────────────────────────

export interface InvListItem {
  id: string;
  type: string;
  input: string;
  created_at: string;
  result: InvestigationResult;
}

export async function apiGetInvestigations(): Promise<InvListItem[]> {
  return apiFetch<InvListItem[]>("/investigations");
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export interface ApiCase {
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

export async function apiGetCases(): Promise<ApiCase[]> {
  return apiFetch<ApiCase[]>("/cases");
}

export async function apiCreateCase(
  data: Omit<ApiCase, "id" | "created_at" | "updated_at">
): Promise<ApiCase> {
  return apiFetch<ApiCase>("/cases", { method: "POST", body: JSON.stringify(data) });
}

export async function apiUpdateCase(
  id: string,
  data: Partial<Pick<ApiCase, "name" | "target" | "status" | "priority" | "notes">>
): Promise<ApiCase> {
  return apiFetch<ApiCase>(`/cases/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function apiDeleteCase(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/cases/${id}`, { method: "DELETE" });
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface ApiGraphNode {
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

export interface ApiGraphEdge {
  id: string;
  from_node: string;
  to_node: string;
  label: string;
  created_at: string;
}

export interface ApiGraph {
  nodes: ApiGraphNode[];
  edges: ApiGraphEdge[];
}

export async function apiGetGraph(): Promise<ApiGraph> {
  return apiFetch<ApiGraph>("/graph");
}

export async function apiAddGraphNode(
  data: Omit<ApiGraphNode, "added_at">
): Promise<ApiGraphNode> {
  return apiFetch<ApiGraphNode>("/graph/nodes", { method: "POST", body: JSON.stringify(data) });
}

export async function apiRemoveGraphNode(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/graph/nodes/${id}`, { method: "DELETE" });
}

export async function apiAddGraphEdge(
  data: Omit<ApiGraphEdge, "created_at">
): Promise<ApiGraphEdge> {
  return apiFetch<ApiGraphEdge>("/graph/edges", { method: "POST", body: JSON.stringify(data) });
}

export async function apiRemoveGraphEdge(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/graph/edges/${id}`, { method: "DELETE" });
}

export async function apiResetGraph(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/graph/reset", { method: "DELETE" });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface ApiStats {
  totalInvestigations: number;
  weekInvestigations: number;
  casesByStatus: Record<string, number>;
  investigationsByType: Record<string, number>;
  recentInvestigations: { id: string; type: string; input: string; created_at: string }[];
}

export async function apiGetStats(): Promise<ApiStats> {
  return apiFetch<ApiStats>("/stats");
}
