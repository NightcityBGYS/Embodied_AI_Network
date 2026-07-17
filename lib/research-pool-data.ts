import * as memoryStore from "./research-pool-store";
import * as supabaseStore from "./supabase-research-pool-store";
import { isSupabaseConfigured } from "./supabase-config";
import type { DashboardBrief, NextStep, Person, WorkUpdate } from "./research-pool-types";
import type { CurrentUser } from "./server-auth";

type PersonPatchPayload = {
  patch: Partial<Person>;
  action?: string;
  summary?: string;
  before?: string;
  after?: string;
};

type UpdatePayload = {
  update: Partial<WorkUpdate>;
};

type UpdateFilters = {
  date?: string;
  from?: string;
  to?: string;
  updateType?: string;
  person?: string;
  organization?: string;
};

type DashboardBriefPayload = {
  patch: Partial<DashboardBrief>;
};

type NextStepPayload = {
  step: Partial<NextStep>;
};

function usingSupabase() {
  return isSupabaseConfigured();
}

export async function listPeople() {
  return usingSupabase() ? supabaseStore.listPeople() : memoryStore.listPeople();
}

export async function getPerson(id: string) {
  return usingSupabase() ? supabaseStore.getPerson(id) : memoryStore.getPerson(id);
}

export async function createPerson(person: Person, user: CurrentUser) {
  return usingSupabase()
    ? supabaseStore.createPerson(person, user)
    : memoryStore.createPerson(person, user);
}

export async function patchPerson(
  id: string,
  payload: PersonPatchPayload,
  user: CurrentUser,
) {
  return usingSupabase()
    ? supabaseStore.patchPerson(id, payload, user)
    : memoryStore.patchPerson(id, payload, user);
}

export async function archivePerson(id: string, user: CurrentUser) {
  return usingSupabase()
    ? supabaseStore.archivePerson(id, user)
    : memoryStore.archivePerson(id, user);
}

export async function deletePerson(id: string, user: CurrentUser) {
  return usingSupabase()
    ? supabaseStore.deletePerson(id, user)
    : memoryStore.deletePerson(id, user);
}

export async function listActivities() {
  return usingSupabase() ? supabaseStore.listActivities() : memoryStore.listActivities();
}

export async function getDashboardBrief() {
  return usingSupabase()
    ? supabaseStore.getDashboardBrief()
    : memoryStore.getDashboardBrief();
}

export async function patchDashboardBrief(
  payload: DashboardBriefPayload,
  user: CurrentUser,
) {
  return usingSupabase()
    ? supabaseStore.patchDashboardBrief(payload, user)
    : memoryStore.patchDashboardBrief(payload, user);
}

export async function listNextSteps() {
  return usingSupabase() ? supabaseStore.listNextSteps() : memoryStore.listNextSteps();
}

export async function createNextStep(payload: NextStepPayload, user: CurrentUser) {
  return usingSupabase()
    ? supabaseStore.createNextStep(payload, user)
    : memoryStore.createNextStep(payload, user);
}

export async function patchNextStep(
  id: string,
  payload: NextStepPayload,
  user: CurrentUser,
) {
  return usingSupabase()
    ? supabaseStore.patchNextStep(id, payload, user)
    : memoryStore.patchNextStep(id, payload, user);
}

export async function deleteNextStep(id: string, user: CurrentUser) {
  return usingSupabase()
    ? supabaseStore.deleteNextStep(id, user)
    : memoryStore.deleteNextStep(id, user);
}

export async function listUpdates(filters: UpdateFilters = {}) {
  return usingSupabase()
    ? supabaseStore.listUpdates(filters)
    : memoryStore.listUpdates(filters);
}

export async function getUpdate(id: string) {
  return usingSupabase() ? supabaseStore.getUpdate(id) : memoryStore.getUpdate(id);
}

export async function createUpdate(payload: UpdatePayload, user: CurrentUser) {
  return usingSupabase()
    ? supabaseStore.createUpdate(payload, user)
    : memoryStore.createUpdate(payload, user);
}

export async function patchUpdate(id: string, payload: UpdatePayload, user: CurrentUser) {
  return usingSupabase()
    ? supabaseStore.patchUpdate(id, payload, user)
    : memoryStore.patchUpdate(id, payload, user);
}

export async function deleteUpdate(id: string, user: CurrentUser) {
  return usingSupabase()
    ? supabaseStore.deleteUpdate(id, user)
    : memoryStore.deleteUpdate(id, user);
}

export async function importPeopleFromCsv(csv: string, user: CurrentUser) {
  return usingSupabase()
    ? supabaseStore.importPeopleFromCsv(csv, user)
    : memoryStore.importPeopleFromCsv(csv, user);
}

export async function listOrganizations() {
  if (usingSupabase()) {
    return supabaseStore.listOrganizations();
  }

  const people = memoryStore.listPeople();
  const organizations = new Map<string, { id: string; name: string; type: string; sourceCount: number }>();
  for (const person of people) {
    for (const [name, type] of [
      [person.institution, "school"],
      [person.lab, "lab"],
    ] as const) {
      if (!name) continue;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const existing = organizations.get(id);
      organizations.set(id, {
        id,
        name,
        type,
        sourceCount: (existing?.sourceCount ?? 0) + 1,
      });
    }
  }
  return [...organizations.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function resetResearchPoolState(user: CurrentUser) {
  if (usingSupabase()) {
    return null;
  }
  return memoryStore.resetResearchPoolState(user);
}

