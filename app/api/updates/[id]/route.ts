import {
  deleteUpdate,
  getUpdate,
  patchUpdate,
} from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";
import type { WorkUpdate } from "@/lib/research-pool-types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const { id } = await context.params;
  const update = await getUpdate(id);
  if (!update) {
    return Response.json({ error: "工作动态不存在" }, { status: 404 });
  }
  return Response.json({ update });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const body = (await request.json()) as { update: Partial<WorkUpdate> };
  const update = await patchUpdate(id, { update: body.update ?? {} }, user);
  if (!update) {
    return Response.json({ error: "工作动态不存在" }, { status: 404 });
  }
  return Response.json({ update });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const update = await deleteUpdate(id, user);
  if (!update) {
    return Response.json({ error: "工作动态不存在" }, { status: 404 });
  }
  return Response.json({ update });
}
