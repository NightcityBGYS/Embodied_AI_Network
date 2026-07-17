import {
  createNextStep,
  listNextSteps,
} from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";
import type { NextStep } from "@/lib/research-pool-types";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  return Response.json({ nextSteps: await listNextSteps() });
}

export async function POST(request: Request) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const body = (await request.json()) as { step: Partial<NextStep> };
  const step = await createNextStep({ step: body.step ?? {} }, user);
  return Response.json({ step }, { status: 201 });
}
