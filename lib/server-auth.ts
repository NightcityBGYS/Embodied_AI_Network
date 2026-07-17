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
const WRITE_ROLES: UserRole[] = ["Admin", "Editor"];

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

export function canWrite(user: CurrentUser) {
  return WRITE_ROLES.includes(user.role);
}

export async function getRequestUser(request: Request): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) {
    return userFromRequest(request);
  }

  const config = getSupabaseConfig();
  const accessToken = readCookie(request, ACCESS_COOKIE);
  if (!config || !accessToken) {
    return null;
  }

  const authResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!authResponse.ok) {
    return null;
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

export function clearAuthCookies(response: Response) {
  response.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  response.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
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

