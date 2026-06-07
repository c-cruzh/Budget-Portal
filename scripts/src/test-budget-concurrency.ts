/**
 * Integration regression test for simultaneous budget editing.
 *
 * Exercises the server-side concurrency guarantees of the budget save path:
 *   1. Two atomic batch writes to *different* items both persist (no lost
 *      update) and the revision counter increments once per write.
 *   2. A full-list PUT with a stale baseRev is rejected with 409 and returns
 *      the latest server data (optimistic locking).
 *   3. Writes from an org without edit permission, and unauthenticated writes,
 *      are rejected (403) and do not mutate state.
 *
 * Runs against BOTH budget keys: legacy (/budget-items) and final
 * (/budget-items-final).
 *
 * The session cookie is `secure:true; sameSite:none`, so this test MUST talk to
 * the server over HTTPS via $REPLIT_DEV_DOMAIN (the shared proxy), not plain
 * localhost http. The API Server workflow must be running.
 *
 * Run with: pnpm --filter @workspace/scripts run test:budget-concurrency
 */

const DEV_DOMAIN = process.env["REPLIT_DEV_DOMAIN"];
if (!DEV_DOMAIN) {
  console.error("REPLIT_DEV_DOMAIN is not set; cannot reach the server over https.");
  process.exit(1);
}
const BASE = `https://${DEV_DOMAIN}/api`;

// Seeded credentials (see artifacts/api-server/src/routes/auth.ts).
const C2_PASSWORD = "EmTech2026!C2"; // C2 LABS → canEdit
const AURORA_PASSWORD = "EmTech2026!AU"; // AURORA360 → no edit, no comment
const EDITOR_A = { email: "camila@c2labs.ai", password: C2_PASSWORD };
const EDITOR_B = { email: "kevin@c2labs.ai", password: C2_PASSWORD };
const NO_EDIT = { email: "flor@aurora360.xyz", password: AURORA_PASSWORD };

const BUDGET_PATHS = ["/budget-items", "/budget-items-final"] as const;

let failures = 0;
let checks = 0;

function check(cond: boolean, message: string) {
  checks++;
  if (cond) {
    console.log(`  \u2713 ${message}`);
  } else {
    failures++;
    console.error(`  \u2717 FAIL: ${message}`);
  }
}

async function login(creds: { email: string; password: string }): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${creds.email}: ${res.status} ${await res.text()}`);
  }
  const setCookies = res.headers.getSetCookie();
  const sid = setCookies.map((c) => c.split(";")[0]).find((c) => c.startsWith("emtech.sid="));
  if (!sid) {
    throw new Error(`No emtech.sid cookie returned for ${creds.email}`);
  }
  return sid;
}

interface Json {
  status: number;
  body: any;
}

async function api(
  method: string,
  path: string,
  opts: { cookie?: string; body?: unknown } = {},
): Promise<Json> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let body: any = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function getRev(cookie: string, path: string): Promise<number> {
  const r = await api("GET", `${path}/rev`, { cookie });
  return typeof r.body?.rev === "number" ? r.body.rev : 0;
}

async function getItems(cookie: string, path: string): Promise<any[]> {
  const r = await api("GET", path, { cookie });
  return Array.isArray(r.body?.items) ? r.body.items : [];
}

function testItem(id: string, label: string) {
  return {
    id,
    item: label,
    descripcion: "Concurrency regression test item (safe to delete)",
    evento: "__TEST__",
    area: "__TEST__",
    qty: 1,
    precioUnitario: 0,
    total: 0,
  };
}

async function runForPath(path: string, cookieA: string, cookieB: string, cookieNoEdit: string) {
  console.log(`\n=== ${path} ===`);

  const tag = `__concurrency-test-${Date.now()}`;
  const idA = `${tag}-A`;
  const idB = `${tag}-B`;
  const idForbidden = `${tag}-X`;

  try {
    // --- Test 1: concurrent batch adds, no lost update, rev += 2 ---
    const startRev = await getRev(cookieA, path);

    const [resA, resB] = await Promise.all([
      api("POST", `${path}/batch`, { cookie: cookieA, body: { adds: [testItem(idA, "Test A")] } }),
      api("POST", `${path}/batch`, { cookie: cookieB, body: { adds: [testItem(idB, "Test B")] } }),
    ]);

    check(resA.status === 200, `concurrent batch add A succeeded (got ${resA.status})`);
    check(resB.status === 200, `concurrent batch add B succeeded (got ${resB.status})`);

    const afterItems = await getItems(cookieA, path);
    const hasA = afterItems.some((it) => it?.id === idA);
    const hasB = afterItems.some((it) => it?.id === idB);
    check(hasA && hasB, "both concurrently-added items persisted (no lost update)");

    const afterRev = await getRev(cookieA, path);
    check(
      afterRev === startRev + 2,
      `revision incremented once per write (${startRev} \u2192 ${afterRev}, expected ${startRev + 2})`,
    );

    // --- Test 2: full-list PUT with stale baseRev returns 409 + latest data ---
    const currentItems = await getItems(cookieA, path);
    const currentRev = await getRev(cookieA, path);
    const conflictRes = await api("PUT", path, {
      cookie: cookieA,
      // Send the current items so even a (theoretical) accepted write is a no-op;
      // the stale baseRev guarantees a conflict before any write happens.
      body: { items: currentItems, baseRev: currentRev - 1 },
    });
    check(conflictRes.status === 409, `stale-baseRev PUT rejected with 409 (got ${conflictRes.status})`);
    check(conflictRes.body?.error === "conflict", "409 response carries error:'conflict'");
    check(Array.isArray(conflictRes.body?.items), "409 response returns latest items array");

    const revAfterConflict = await getRev(cookieA, path);
    check(revAfterConflict === currentRev, "rejected stale PUT did not bump the revision");

    // --- Test 3: unauthorized writes rejected ---
    const noEditRes = await api("POST", `${path}/batch`, {
      cookie: cookieNoEdit,
      body: { adds: [testItem(idForbidden, "Forbidden")] },
    });
    check(noEditRes.status === 403, `AURORA360 (no edit) batch rejected with 403 (got ${noEditRes.status})`);

    const anonRes = await api("POST", `${path}/batch`, {
      body: { adds: [testItem(idForbidden, "Forbidden")] },
    });
    check(anonRes.status === 403, `unauthenticated batch rejected with 403 (got ${anonRes.status})`);

    const afterForbidden = await getItems(cookieA, path);
    check(
      !afterForbidden.some((it) => it?.id === idForbidden),
      "rejected writes did not add the forbidden item",
    );
  } finally {
    // Cleanup: remove any test items we may have added, even on assertion failure.
    await api("POST", `${path}/batch`, {
      cookie: cookieA,
      body: { deletes: [idA, idB, idForbidden] },
    }).catch(() => {});
  }
}

async function main() {
  console.log(`Budget concurrency integration test against ${BASE}`);

  const [cookieA, cookieB, cookieNoEdit] = await Promise.all([
    login(EDITOR_A),
    login(EDITOR_B),
    login(NO_EDIT),
  ]);

  for (const path of BUDGET_PATHS) {
    await runForPath(path, cookieA, cookieB, cookieNoEdit);
  }

  console.log(`\n${checks - failures}/${checks} checks passed.`);
  if (failures > 0) {
    console.error(`${failures} check(s) FAILED.`);
    process.exit(1);
  }
  console.log("All concurrency checks passed.");
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
