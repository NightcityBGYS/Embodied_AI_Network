import {
  getDashboardBrief,
  patchDashboardBrief,
} from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";
import type { DashboardBrief } from "@/lib/research-pool-types";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  return Response.json({ brief: await getDashboardBrief() });
}

export async function PATCH(request: Request) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const body = (await request.json()) as { patch: Partial<DashboardBrief> };
  const brief = await patchDashboardBrief({ patch: body.patch ?? {} }, user);
  return Response.json({ brief });
}
