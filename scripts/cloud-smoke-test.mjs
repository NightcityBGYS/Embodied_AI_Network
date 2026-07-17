import fs from "node:fs";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const TABLES = [
  "user_profiles",
  "organizations",
  "research_topics",
  "person_research_topics",
  "people",
  "updates",
  "dashboard_brief",
  "next_steps",
  "activity_logs",
];

const COUNTS = ["people", "updates", "dashboard_brief", "next_steps"];

function loadEnv() {
  const env = { ...process.env };
  if (fs.existsSync(".env.local")) {
    const lines = fs.readFileSync(".env.local", "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index < 0) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (key && !env[key]) env[key] = value;
    }
  }
  return env;
}

function maskEmail(email = "") {
  const [name, domain] = email.split("@");
  if (!domain) return "unknown";
  return `${name.slice(0, 2)}***@${domain}`;
}

async function retry(fn, tries = 5) {
  let lastError;
  for (let index = 0; index < tries; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 750 * (index + 1)));
    }
  }
  throw lastError;
}

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const env = loadEnv();
const missing = REQUIRED_ENV.filter((key) => !env[key]);
assertOk(!missing.length, `Missing required env: ${missing.join(", ")}`);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const serviceHeaders = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
};

async function serviceFetch(path, init = {}) {
  return retry(() =>
    fetch(`${supabaseUrl}${path}`, {
      ...init,
      headers: {
        ...serviceHeaders,
        ...(init.headers || {}),
      },
    }),
  );
}

async function rest(path, init = {}) {
  const response = await serviceFetch(`/rest/v1${path}`, init);
  const text = await response.text();
  return { response, text };
}

async function createAuthUser(email, password, role) {
  const createUser = await serviceFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });
  const created = await createUser.json();
  assertOk(createUser.ok && created.id, `Failed to create ${role} test user`);

  const profile = await serviceFetch(
    "/rest/v1/user_profiles?on_conflict=auth_user_id",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([
        {
          auth_user_id: created.id,
          email,
          display_name: `Codex ${role}`,
          role,
        },
      ]),
    },
  );
  assertOk(profile.ok, `Failed to create ${role} profile`);
  return created.id;
}

async function deleteAuthUser(authUserId) {
  await serviceFetch(`/rest/v1/user_profiles?auth_user_id=eq.${authUserId}`, {
    method: "DELETE",
  }).catch(() => undefined);
  await serviceFetch(`/auth/v1/admin/users/${authUserId}`, {
    method: "DELETE",
  }).catch(() => undefined);
}

async function signIn(email, password) {
  const response = await retry(() =>
    fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }),
  );
  const data = await response.json();
  assertOk(response.ok && data.access_token, `Failed to sign in ${maskEmail(email)}`);
  return data.access_token;
}

console.log("Cloud smoke test started");

for (const table of TABLES) {
  const { response, text } = await rest(`/${table}?select=*&limit=1`);
  assertOk(response.ok, `${table} is not reachable: ${text.slice(0, 160)}`);
  console.log(`table ${table}: ok`);
}

for (const table of COUNTS) {
  const { response, text } = await rest(`/${table}?select=*`);
  assertOk(response.ok, `${table} count failed`);
  const rows = JSON.parse(text);
  console.log(`${table} count: ${rows.length}`);
}

const profiles = await rest("/user_profiles?select=email,role&order=email.asc");
assertOk(profiles.response.ok, "user_profiles role check failed");
for (const profile of JSON.parse(profiles.text)) {
  console.log(`profile role: ${maskEmail(profile.email)} -> ${profile.role}`);
}

const bucket = await serviceFetch("/storage/v1/bucket/avatars");
assertOk(bucket.ok, "avatars bucket is not reachable");
console.log("avatars bucket: ok");

const stamp = Date.now();
const viewerEmail = `codex-viewer-${stamp}@example.com`;
const viewerPassword = `Codex-${stamp}-Viewer!`;
const adminEmail = `codex-admin-${stamp}@example.com`;
const adminPassword = `Codex-${stamp}-Admin!`;
let viewerId = "";
let adminId = "";
let storagePath = "";

try {
  viewerId = await createAuthUser(viewerEmail, viewerPassword, "viewer");
  const viewerToken = await signIn(viewerEmail, viewerPassword);
  const viewerWrite = await retry(() =>
    fetch(`${supabaseUrl}/rest/v1/people`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${viewerToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "RLS should block this", role: "Researcher" }),
    }),
  );
  assertOk(!viewerWrite.ok, "viewer was able to write to people table");
  console.log("viewer RLS write block: ok");

  adminId = await createAuthUser(adminEmail, adminPassword, "admin");
  const adminToken = await signIn(adminEmail, adminPassword);
  storagePath = `${adminId}/codex-smoke-${stamp}.png`;
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const upload = await retry(() =>
    fetch(`${supabaseUrl}/storage/v1/object/avatars/${storagePath}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${adminToken}`,
        "content-type": "image/png",
        "x-upsert": "false",
      },
      body: png,
    }),
  );
  assertOk(upload.ok, "admin could not upload avatar object");
  console.log("avatar storage upload: ok");

  const remove = await retry(() =>
    fetch(`${supabaseUrl}/storage/v1/object/avatars`, {
      method: "DELETE",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prefixes: [storagePath] }),
    }),
  );
  assertOk(remove.ok, "admin could not delete avatar object");
  storagePath = "";
  console.log("avatar storage delete: ok");
} finally {
  if (storagePath) {
    await serviceFetch("/storage/v1/object/avatars", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefixes: [storagePath] }),
    }).catch(() => undefined);
  }
  if (viewerId) await deleteAuthUser(viewerId);
  if (adminId) await deleteAuthUser(adminId);
}

console.log("Cloud smoke test passed");

