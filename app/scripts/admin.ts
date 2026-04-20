#!/usr/bin/env bun
/**
 * Tada admin CLI — drives the /api/v1/admin/** endpoints over HTTPS.
 *
 * Auth: username + password → session cookie. Your user must be in
 * ADMIN_USER_IDS on the target instance.
 *
 * Config (env):
 *   TADA_ADMIN_URL       e.g. https://tada.living
 *   TADA_ADMIN_USERNAME  your admin username
 *   TADA_ADMIN_PASSWORD  your admin password
 *
 * Load from file:   bun --env-file=.env.admin run admin ...
 * Or inline:        TADA_ADMIN_URL=... TADA_ADMIN_USERNAME=... TADA_ADMIN_PASSWORD=... bun run admin ...
 *
 * Commands:
 *   users list [--search=<q>] [--tier=free|premium] [--limit=<n>] [--offset=<n>]
 *   users get <userId>
 *   modules set <userId> <flag>=<true|false> [<flag>=<bool> ...]
 */

interface User {
  id: string;
  username: string;
  email: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
}

const url = process.env["TADA_ADMIN_URL"];
const username = process.env["TADA_ADMIN_USERNAME"];
const password = process.env["TADA_ADMIN_PASSWORD"];

function die(msg: string, code = 1): never {
  console.error(msg);
  process.exit(code);
}

if (!url || !username || !password) {
  die(
    "Missing env. Set TADA_ADMIN_URL, TADA_ADMIN_USERNAME, TADA_ADMIN_PASSWORD\n" +
      "(or run with: bun --env-file=.env.admin run admin ...)",
    2,
  );
}

const baseUrl: string = url.replace(/\/+$/, "");

async function login(): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    die(`Login failed: ${res.status} ${await res.text()}`);
  }
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/auth_session=([^;]+)/);
  if (!match || !match[1]) die("No auth_session cookie in login response");
  return `auth_session=${match[1]}`;
}

async function req<T>(
  cookie: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Cookie: cookie,
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    die(`${init.method ?? "GET"} ${path} → ${res.status}\n${text}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function parseFlags(args: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of args) {
    const m = arg.match(/^--([\w-]+)=(.*)$/);
    if (m && m[1]) out[m[1]] = m[2] ?? "";
  }
  return out;
}

async function usersList(cookie: string, args: string[]) {
  const flags = parseFlags(args);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(flags)) qs.set(k, v);
  if (!qs.has("limit")) qs.set("limit", "50");
  const body = await req<PaginatedResponse<User>>(
    cookie,
    `/api/v1/admin/users?${qs.toString()}`,
  );
  console.table(
    body.data.map((u) => ({ id: u.id, username: u.username, email: u.email })),
  );
  console.log(`total: ${body.meta.total}  (showing ${body.data.length})`);
}

async function usersGet(cookie: string, args: string[]) {
  const [userId] = args;
  if (!userId) die("Usage: admin users get <userId>", 2);
  const body = await req<{ data: unknown }>(
    cookie,
    `/api/v1/admin/users/${userId}`,
  );
  console.log(JSON.stringify(body, null, 2));
}

async function modulesSet(cookie: string, args: string[]) {
  const [userId, ...flagArgs] = args;
  if (!userId || flagArgs.length === 0) {
    die(
      "Usage: admin modules set <userId> <flag>=<true|false> [<flag>=<bool> ...]",
      2,
    );
  }
  const flags: Record<string, boolean> = {};
  for (const arg of flagArgs) {
    const [k, v] = arg.split("=");
    if (!k || (v !== "true" && v !== "false")) {
      die(`Bad flag (must be key=true|false): ${arg}`, 2);
    }
    flags[k] = v === "true";
  }
  const body = await req<{ data: { enabledModules: Record<string, boolean> } }>(
    cookie,
    `/api/v1/admin/users/${userId}/modules`,
    { method: "PATCH", body: JSON.stringify(flags) },
  );
  console.log(
    `OK — ${userId} enabledModules:`,
    JSON.stringify(body.data.enabledModules),
  );
}

function usage(): never {
  console.error(
    [
      "Usage:",
      "  bun run admin users list [--search=<q>] [--tier=free|premium] [--limit=<n>]",
      "  bun run admin users get <userId>",
      "  bun run admin modules set <userId> <flag>=<true|false> ...",
      "",
      "Example:",
      "  bun run admin users list --search=caspar",
      "  bun run admin modules set abc123 ourmoji=true",
    ].join("\n"),
  );
  process.exit(2);
}

const [cmd, sub, ...rest] = process.argv.slice(2);
if (!cmd || !sub) usage();

const cookie = await login();

if (cmd === "users" && sub === "list") await usersList(cookie, rest);
else if (cmd === "users" && sub === "get") await usersGet(cookie, rest);
else if (cmd === "modules" && sub === "set") await modulesSet(cookie, rest);
else usage();
