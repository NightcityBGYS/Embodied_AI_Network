import { createPerson, listPeople } from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";
import type { Person } from "@/lib/research-pool-types";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  return Response.json({ people: await listPeople() });
}

export async function POST(request: Request) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const body = (await request.json()) as { person: Person };
  const person = await createPerson(body.person, user);
  return Response.json({ person }, { status: 201 });
}
