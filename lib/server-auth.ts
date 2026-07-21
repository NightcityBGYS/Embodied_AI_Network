import { userFromRequest } from "./research-pool-store";
import { getSupabaseConfig, isSupabaseConfigured } from "./supabase-config";
import type { UserRole } from "./research-pool-types";

export type CurrentUser = {
  id?: string;
  name: string;
  email?: string;
  role: UserRole;
};

type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    display_name?: string;
  };
};

type UserProfileRow = {
  auth_user_id: string;
  email: string | null;
  display_name: string | null;
  role: string | null;
};

const ACCESS_COOKIE = "ea-sb-access-token";
const REFRESH_COOKIE = "ea-sb-refresh-token";
const APP_SESSION_COOKIE = "ea-app-session";
const WRITE_ROLES: UserRole[] = ["Admin", "Editor"];
const EMAIL_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const roleMap: Record<string, UserRole> = {
  admin: "Admin",
  editor: "Editor",
  commenter: "Commenter",
  viewer: "Viewer",
  Admin: "Admin",
  Editor: "Editor",
  Commenter: "Commenter",
  Viewer: "Viewer",
};

export function accessCookieName() {
  return ACCESS_COOKIE;
}

export function refreshCookieName() {
  return REFRESH_COOKIE;
}

export function appSessionCookieName() {
  return APP_SESSION_COOKIE;
}

export function canWrite(user: CurrentUser) {
  return WRITE_ROLES.includes(user.role);
}

export async function getRequestUser(request: Request): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) {
    return userFromRequest(request);
  }

  const config = getSupabaseConfig();
  const accessToken = readCookie(request, ACCESS_COOKIE);
  if (!config) {
    return null;
  }

  const appSession = await userFromAppSessionCookie(
    readCookie(request, APP_SESSION_COOKIE),
    config.serviceRoleKey,
  );

  if (!accessToken) {
    return appSession;
  }

  const authResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!authResponse.ok) {
    return appSession;
  }

  const authUser = (await authResponse.json()) as SupabaseAuthUser;
  const profile = await fetchUserProfile(authUser.id);
  const email = authUser.email || profile?.email || "";
  const displayName =
    profile?.display_name ||
    authUser.user_metadata?.display_name ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email ||
    "未命名用户";

  return {
    id: authUser.id,
    name: displayName,
    email,
    role: normalizeRole(profile?.role || "viewer"),
  };
}

export async function getInvitedUserByEmail(email: string): Promise<CurrentUser | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const response = await fetch(
    `${config.url}/rest/v1/user_profiles?email=ilike.${encodeURIComponent(
      normalizedEmail,
    )}&select=auth_user_id,email,display_name,role&limit=1`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        authorization: `Bearer ${config.serviceRoleKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as UserProfileRow[];
  const profile = rows[0];
  if (!profile?.email) return null;

  return {
    id: profile.auth_user_id,
    name: profile.display_name || profile.email,
    email: profile.email,
    role: normalizeRole(profile.role || "viewer"),
  };
}

export async function requireApiUser(
  request: Request,
  access: "read" | "write" = "read",
): Promise<CurrentUser | Response> {
  const user = await getRequestUser(request);
  if (!user) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  if (access === "write" && !canWrite(user)) {
    return Response.json({ error: "当前账号没有编辑权限" }, { status: 403 });
  }

  return user;
}

export function setAuthCookies(
  response: Response,
  session: { access_token: string; refresh_token: string; expires_in?: number },
) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.max(60, Number(session.expires_in || 3600));
  response.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  );
  response.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`,
  );
}

export async function setEmailSessionCookie(response: Response, user: CurrentUser) {
  const config = getSupabaseConfig();
  if (!config || !user.email) return;

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const expiresAt = Date.now() + EMAIL_SESSION_MAX_AGE * 1000;
  const payload = base64UrlEncodeString(
    JSON.stringify({
      email: user.email,
      exp: expiresAt,
      id: user.id,
      name: user.name,
      role: user.role,
    }),
  );
  const signature = await signSession(payload, config.serviceRoleKey);

  response.headers.append(
    "Set-Cookie",
    `${APP_SESSION_COOKIE}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${EMAIL_SESSION_MAX_AGE}${secure}`,
  );
}

export function clearAuthCookies(response: Response) {
  response.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  response.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  response.headers.append(
    "Set-Cookie",
    `${APP_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function userFromAppSessionCookie(
  cookieValue: string | undefined,
  secret: string,
): Promise<CurrentUser | null> {
  if (!cookieValue) return null;

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expected = await signSession(payload, secret);
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const session = JSON.parse(base64UrlDecodeString(payload)) as {
      email?: string;
      exp?: number;
      id?: string;
      name?: string;
      role?: string;
    };
    if (!session.email || !session.exp || session.exp < Date.now()) {
      return null;
    }
    return {
      id: session.id,
      name: session.name || session.email,
      email: session.email,
      role: normalizeRole(session.role || "viewer"),
    };
  } catch {
    return null;
  }
}

async function fetchUserProfile(authUserId: string) {
  const config = getSupabaseConfig();
  if (!config) return null;

  const response = await fetch(
    `${config.url}/rest/v1/user_profiles?auth_user_id=eq.${encodeURIComponent(
      authUserId,
    )}&select=auth_user_id,email,display_name,role&limit=1`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        authorization: `Bearer ${config.serviceRoleKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as UserProfileRow[];
  return rows[0] ?? null;
}

function normalizeRole(value: string): UserRole {
  return roleMap[value] || "Viewer";
}

async function signSession(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

function base64UrlEncodeString(value: string) {
  return base64UrlEncode(new TextEncoder().encode(value));
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeString(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}
