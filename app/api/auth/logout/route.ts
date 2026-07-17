import { clearAuthCookies } from "@/lib/server-auth";

export async function POST() {
  const response = Response.json({ ok: true });
  clearAuthCookies(response);
  return response;
}

