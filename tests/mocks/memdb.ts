// A small in-memory stand-in for the Supabase query builder, for route tests
// that need rows to persist between calls (select/insert/update/delete with
// eq/in filters, order, limit, single/maybeSingle).
type Row = Record<string, any>;
export function memDb(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  let ids = 0;
  const from = (name: string) => {
    tables[name] ??= [];
    let op: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row | Row[] | null = null;
    const filters: ((r: Row) => boolean)[] = [];
    let sort: { col: string; asc: boolean } | null = null, max = Infinity, returning = false;
    const rows = () => tables[name].filter((r) => filters.every((f) => f(r)));
    const run = () => {
      if (op === "insert") {
        const list = (Array.isArray(payload) ? payload : [payload!]).map((r) => ({ id: r.id ?? `00000000-0000-4000-8000-${String(++ids).padStart(12, "0")}`, created_at: new Date().toISOString(), joined_at: new Date().toISOString(), removed: false, ...r }));
        tables[name].push(...list);
        return { data: returning ? list : null, error: null };
      }
      if (op === "update") { const hit = rows(); hit.forEach((r) => Object.assign(r, payload)); return { data: returning ? hit : null, error: null }; }
      if (op === "delete") { const hit = new Set(rows()); tables[name] = tables[name].filter((r) => !hit.has(r)); return { data: null, error: null }; }
      let out = rows();
      if (sort) { const { col, asc } = sort; out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1)); }
      return { data: out.slice(0, max).map((r) => ({ ...r })), error: null };
    };
    const q: any = {
      select() { if (op !== "select") returning = true; return q; },
      insert(p: Row | Row[]) { op = "insert"; payload = p; return q; },
      update(p: Row) { op = "update"; payload = p; return q; },
      delete() { op = "delete"; return q; },
      eq(c: string, v: unknown) { filters.push((r) => r[c] === v); return q; },
      in(c: string, v: unknown[]) { filters.push((r) => v.includes(r[c])); return q; },
      is(c: string, v: unknown) { filters.push((r) => (r[c] ?? null) === v); return q; },
      gt(c: string, v: any) { filters.push((r) => r[c] != null && r[c] > v); return q; },
      lte(c: string, v: any) { filters.push((r) => r[c] != null && r[c] <= v); return q; },
      order(c: string, o?: { ascending?: boolean }) { sort = { col: c, asc: o?.ascending !== false }; return q; },
      limit(n: number) { max = n; return q; },
      async maybeSingle() { const r = run(); const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data; return { data: d, error: null }; },
      async single() { const r = run(); const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data; return d ? { data: d, error: null } : { data: null, error: { message: "no rows" } }; },
      then(ok: (v: any) => any, no: (e: any) => any) { return Promise.resolve(run()).then(ok, no); },
    };
    return q;
  };
  return { from, tables };
}
