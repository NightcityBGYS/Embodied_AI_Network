import {
  deleteNextStep,
  patchNextStep,
} from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";
import type { NextStep } from "@/lib/research-pool-types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const body = (await request.json()) as { step: Partial<NextStep> };
  const step = await patchNextStep(id, { step: body.step ?? {} }, user);
  if (!step) {
    return Response.json({ error: "下一步计划不存在" }, { status: 404 });
  }
  return Response.json({ step });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const step = await deleteNextStep(id, user);
  if (!step) {
    return Response.json({ error: "下一步计划不存在" }, { status: 404 });
  }
  return Response.json({ step });
}
