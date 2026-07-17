import { importPeopleFromCsv } from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";

export async function POST(request: Request) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const body = (await request.json()) as { csv: string };
  const people = await importPeopleFromCsv(body.csv ?? "", user);
  return Response.json({ people }, { status: 201 });
}
