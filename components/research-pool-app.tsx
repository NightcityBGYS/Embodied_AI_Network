"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DEFAULT_RESEARCH_TOPICS,
  ROLE_OPTIONS,
  seedResearchPoolState,
} from "@/lib/seed-data";
import { nowStamp, todayDate } from "@/lib/time";
import type {
  ActivityLog,
  DashboardBrief,
  NextStep,
  Person,
  ResearchOrganization,
  ResearchPoolState,
  UpdateType,
  UserRole,
  WorkUpdate,
} from "@/lib/research-pool-types";
import {
  EMPTY_FILTERS,
  EMPTY_SAVE_STATE,
  EMPTY_UPDATE_FILTERS,
  ORGANIZATION_TYPES,
  PROGRESS_STATUSES,
  SIMPLE_PRIORITIES,
  SPECIAL_PROGRESS_STATUSES,
  UPDATE_TYPES,
  csvEscape,
  displayAssessment,
  displayUpdateSummary,
  formatDateLabel,
  formatTimeLabel,
  initialPerson,
  initials,
  isThisWeek,
  isToday,
  normalizePerson,
  normalizeOrganization,
  normalizeOrganizationPriority,
  normalizePriority,
  normalizeProgressStatus,
  sortOrganizationsByPriority,
  sortPeopleByPriority,
  roleLabels,
  slugify,
  splitList,
  statusTone,
  unique,
  userRoleLabels,
  visibleUpdateOrganization,
  type BadgeTone,
  type BriefDraft,
  type CardEditMode,
  type CurrentUserState,
  type Filters,
  type NextStepDraft,
  type OrganizationDraft,
  type PeopleSortMode,
  type PersonCardDraft,
  type SaveState,
  type UpdateDraft,
  type UpdateDrawerMode,
  type UpdateFilters,
  type View,
} from "./research-pool/shared";

type ResearchPoolAppProps = {
  initialView: View;
  selectedId?: string;
};

const PUBLIC_SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const INITIAL_USER: CurrentUserState = PUBLIC_SUPABASE_CONFIGURED
  ? { name: "", role: "Viewer" }
  : { name: "Eric", role: "Admin" };
const INITIAL_RESEARCH_POOL_STATE: ResearchPoolState = PUBLIC_SUPABASE_CONFIGURED
  ? {
      people: [],
      organizations: [],
      activities: [],
      updates: [],
      dashboardBrief: {
        title: "加载工作简报",
        description: "正在从云端加载最新人员名单和工作记录。",
        focusAreas: [],
        updatedAt: "",
        updatedBy: "",
      },
      nextSteps: [],
    }
  : seedResearchPoolState;

function ToggleGroup({
  labels,
  title,
  options,
  selected,
  onToggle,
}: {
  labels?: Map<string, string>;
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (!options.length) {
    return null;
  }

  return (
    <div className="filter-block">
      <div className="filter-title">{title}</div>
      <div className="filter-options">
        {options.map((option) => (
          <label className="check-row" key={option}>
            <input
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              type="checkbox"
            />
            <span>{labels?.get(option) ?? option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function PersonAvatar({
  name,
  url,
}: {
  name: string;
  url?: string;
}) {
  if (url) {
    return (
      <span
        aria-label={`${name} 头像`}
        className="avatar avatar-image person-avatar"
        role="img"
        style={{ backgroundImage: `url("${url}")` }}
      />
    );
  }

  return (
    <span aria-label={`${name} 首字母头像`} className="avatar avatar-fallback person-avatar">
      {initials(name)}
    </span>
  );
}

function AvatarUploader({
  avatarUrl,
  disabled,
  name,
  onChange,
  onRemove,
  onUpload,
}: {
  avatarUrl: string;
  disabled: boolean;
  name: string;
  onChange: (url: string) => void;
  onRemove: (url: string) => Promise<void> | void;
  onUpload: (file: File) => Promise<string>;
}) {
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const displayUrl = previewUrl || avatarUrl;

  async function handleFile(file?: File) {
    if (!file || disabled) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("仅支持 JPG、PNG、WebP。");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("头像不能超过 2MB。");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setError("");
    setUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
      setPreviewUrl("");
      URL.revokeObjectURL(objectUrl);
    } catch (uploadError) {
      setPreviewUrl("");
      URL.revokeObjectURL(objectUrl);
      setError(uploadError instanceof Error ? uploadError.message : "头像上传失败。");
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    if (!avatarUrl || disabled) {
      onChange("");
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm("确认删除当前头像？")
    ) {
      return;
    }
    setError("");
    setUploading(true);
    try {
      await onRemove(avatarUrl);
      onChange("");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "头像删除失败。");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="avatar-uploader">
      <PersonAvatar name={name || "EA"} url={displayUrl} />
      <div>
        <label className="button avatar-upload-button">
          {uploading ? "上传中..." : avatarUrl ? "替换头像" : "上传头像"}
          <input
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
            type="file"
          />
        </label>
        <button className="button" disabled={disabled || uploading || !avatarUrl} onClick={remove} type="button">
          删除头像
        </button>
        <small>JPG、PNG、WebP，最大 2MB。</small>
        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}

export function ResearchPoolApp({
  initialView,
  selectedId,
}: ResearchPoolAppProps) {
  const [state, setState] = useState<ResearchPoolState>(INITIAL_RESEARCH_POOL_STATE);
  const [view, setView] = useState<View>(initialView);
  const [selectedEntityId, setSelectedEntityId] = useState(selectedId ?? "");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [currentUser, setCurrentUser] = useState<CurrentUserState>(INITIAL_USER);
  const [authRequired, setAuthRequired] = useState(PUBLIC_SUPABASE_CONFIGURED);
  const [importText, setImportText] = useState("");
  const [isLoading, setIsLoading] = useState(PUBLIC_SUPABASE_CONFIGURED);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const requestHeaders = useCallback(
    () => ({
      "content-type": "application/json",
    }),
    [],
  );

  const loadState = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        peopleResponse,
        activitiesResponse,
        updatesResponse,
        organizationsResponse,
        briefResponse,
        nextStepsResponse,
      ] = await Promise.all([
        fetch("/api/people"),
        fetch("/api/activity-logs"),
        fetch("/api/updates"),
        fetch("/api/organizations"),
        fetch("/api/dashboard/brief"),
        fetch("/api/dashboard/next-steps"),
      ]);

      if (
        !peopleResponse.ok ||
        !activitiesResponse.ok ||
        !updatesResponse.ok ||
        !organizationsResponse.ok ||
        !briefResponse.ok ||
        !nextStepsResponse.ok
      ) {
        throw new Error("REST API load failed");
      }

      const [
        peopleData,
        activitiesData,
        updatesData,
        organizationsData,
        briefData,
        nextStepsData,
      ] =
        await Promise.all([
        peopleResponse.json() as Promise<{ people: Person[] }>,
        activitiesResponse.json() as Promise<{ activities: ActivityLog[] }>,
        updatesResponse.json() as Promise<{ updates: WorkUpdate[] }>,
        organizationsResponse.json() as Promise<{ organizations: ResearchOrganization[] }>,
        briefResponse.json() as Promise<{ brief: DashboardBrief }>,
        nextStepsResponse.json() as Promise<{ nextSteps: NextStep[] }>,
      ]);

      setState({
        people: peopleData.people.map(normalizePerson),
        organizations: organizationsData.organizations.map(normalizeOrganization),
        activities: activitiesData.activities,
        updates: updatesData.updates,
        dashboardBrief: briefData.brief,
        nextSteps: nextStepsData.nextSteps,
      });
      setLoadError("");
    } catch (error) {
      if (PUBLIC_SUPABASE_CONFIGURED) {
        const message =
          error instanceof Error ? error.message : "云端数据加载失败";
        setLoadError(`云端数据加载失败，请刷新或检查登录状态。${message}`);
        setNotice("云端数据加载失败");
        return;
      }

      setState({
        people: seedResearchPoolState.people.map(normalizePerson),
        organizations: seedResearchPoolState.organizations.map(normalizeOrganization),
        activities: seedResearchPoolState.activities,
        updates: seedResearchPoolState.updates,
        dashboardBrief: seedResearchPoolState.dashboardBrief,
        nextSteps: seedResearchPoolState.nextSteps,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        authRequired?: boolean;
        user?: CurrentUserState;
      };
      const nextAuthRequired = Boolean(data.authRequired);
      setAuthRequired(nextAuthRequired);

      if (!response.ok || !data.user) {
        if (!nextAuthRequired) {
          setCurrentUser({ name: "Eric", role: "Admin" });
          return { authenticated: true, authRequired: false };
        }
        setCurrentUser({ name: "", role: "Viewer" });
        return { authenticated: false, authRequired: true };
      }

      setCurrentUser(data.user);
      return { authenticated: true, authRequired: nextAuthRequired };
    } catch {
      if (PUBLIC_SUPABASE_CONFIGURED) {
        setAuthRequired(true);
        setCurrentUser({ name: "", role: "Viewer" });
        return { authenticated: false, authRequired: true };
      }

      setAuthRequired(false);
      setCurrentUser({ name: "Eric", role: "Admin" });
      return { authenticated: true, authRequired: false };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(async () => {
      const session = await loadSession();
      if (cancelled) return;

      if (session.authenticated || !session.authRequired) {
        await loadState();
      } else {
        if (initialView !== "login") {
          setView("login");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initialView, loadSession, loadState]);

  const activePeople = useMemo(
    () => state.people.filter((person) => !person.archived),
    [state.people],
  );

  const personById = useMemo(
    () => new Map(state.people.map((person) => [person.id, person])),
    [state.people],
  );

  const selectedPerson = selectedEntityId
    ? personById.get(selectedEntityId)
    : undefined;

  const canEdit = currentUser.role === "Admin" || currentUser.role === "Editor";
  const canArchive = currentUser.role === "Admin" || currentUser.role === "Editor";

  const institutions = unique(state.people.map((person) => person.institution));
  const labs = unique(state.people.map((person) => person.lab));
  const allTopics = unique([
    ...DEFAULT_RESEARCH_TOPICS,
    ...state.people.flatMap((person) => [
      ...person.researchTopics,
      ...person.secondaryTopics,
    ]),
  ]);
  const allPriorities = [...SIMPLE_PRIORITIES];
  const roleLabelMap = useMemo(() => new Map(Object.entries(roleLabels)), []);

  const filteredPeople = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return state.people.filter((person) => {
      if (!filters.showArchived && person.archived) {
        return false;
      }

      const haystack = [
        person.name,
        person.role,
        person.title,
        person.department,
        person.location,
        person.bio,
        person.currentResearchFocus,
        person.shortAssessment,
        person.feishuDocUrl,
        person.supervisorNote,
        person.managerNote,
        person.nextAction,
        person.researchMode,
        person.priority,
        normalizePriority(person.priority),
        person.researchStatus,
        normalizeProgressStatus(person.researchStatus),
        person.contactStatus,
        person.institution,
        person.lab,
        ...person.contacts.map((contact) => `${contact.label} ${contact.value}`),
        ...person.researchTopics,
        ...person.secondaryTopics,
        ...person.flags,
        ...person.tags,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || haystack.includes(query);
      const matchesInstitution =
        !filters.institutions.length ||
        filters.institutions.includes(person.institution);
      const matchesLab = !filters.labs.length || filters.labs.includes(person.lab);
      const matchesRole = !filters.roles.length || filters.roles.includes(person.role);
      const matchesTopic =
        !filters.topics.length ||
        filters.topics.some((topic) =>
          [...person.researchTopics, ...person.secondaryTopics].includes(topic),
        );
      const matchesResearchStatus =
        !filters.researchStatuses.length ||
        filters.researchStatuses.includes(normalizeProgressStatus(person.researchStatus));
      const matchesPriority =
        !filters.priorities.length || filters.priorities.includes(normalizePriority(person.priority));
      const matchesContact =
        !filters.contactStatuses.length ||
        filters.contactStatuses.includes(person.contactStatus);
      const matchesFlags =
        !filters.flags.length ||
        filters.flags.some((flag) => person.flags.includes(flag));
      const matchesTags =
        !filters.tags.length || filters.tags.some((tag) => person.tags.includes(tag));

      return (
        matchesQuery &&
        matchesInstitution &&
        matchesLab &&
        matchesRole &&
        matchesTopic &&
        matchesResearchStatus &&
        matchesPriority &&
        matchesContact &&
        matchesFlags &&
        matchesTags
      );
    });
  }, [filters, state.people]);

  function navigate(nextView: View, id = "") {
    setView(nextView);
    setSelectedEntityId(id);

    const paths: Record<View, string> = {
      login: "/login",
      dashboard: "/dashboard",
      updates: "/updates",
      organizations: "/organizations",
      people: id ? `/people#person-${id}` : "/people",
      detail: `/people/${id}`,
      new: "/people/new",
      edit: `/people/${id}/edit`,
    };

    if (typeof window !== "undefined") {
      window.history.pushState({}, "", paths[nextView]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function toggleFilter(key: keyof Omit<Filters, "search" | "showArchived">, value: string) {
    setFilters((current) => {
      const selected = current[key];
      return {
        ...current,
        [key]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  }

  async function updatePerson(
    personId: string,
    patch: Partial<Person>,
    action: string,
    summary: string,
    before?: string,
    after?: string,
  ) {
    if (!canEdit) {
      return;
    }
    await fetch(`/api/people/${personId}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify({ patch, action, summary, before, after }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error("人员保存失败");
      }
    });
    await loadState();
    setNotice("人员信息已保存");
  }

  async function quickUpdatePerson(person: Person, patch: Partial<Person>, label: string) {
    if (!canEdit) {
      return;
    }

    const changed = Object.entries(patch).filter(([key, value]) => {
      const current = person[key as keyof Person];
      return String(current ?? "") !== String(value ?? "");
    });

    if (!changed.length) {
      return;
    }

    await updatePerson(
      person.id,
      patch,
      `更新${label}`,
      `${currentUser.name} 更新了 ${person.name} 的${label}。`,
      changed.map(([key]) => `${key}: ${String(person[key as keyof Person] ?? "")}`).join("; "),
      changed.map(([key, value]) => `${key}: ${String(value ?? "")}`).join("; "),
    );
  }

  async function createWorkUpdate(update: Partial<WorkUpdate>) {
    if (!canEdit) {
      return;
    }

    const response = await fetch("/api/updates", {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify({ update }),
    });
    if (!response.ok) {
      throw new Error("工作记录保存失败");
    }
    await loadState();
    setNotice("工作记录已保存");
  }

  async function patchWorkUpdate(updateId: string, update: Partial<WorkUpdate>) {
    if (!canEdit) {
      return;
    }

    const response = await fetch(`/api/updates/${updateId}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify({ update }),
    });
    if (!response.ok) {
      throw new Error("工作记录保存失败");
    }
    await loadState();
    setNotice("工作记录已更新");
  }

  async function deleteWorkUpdate(updateId: string) {
    if (!canEdit) {
      return;
    }

    const response = await fetch(`/api/updates/${updateId}`, {
      method: "DELETE",
      headers: requestHeaders(),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "工作记录删除失败");
    }
    await loadState();
    setNotice("工作记录已删除");
  }

  async function createOrganization(organization: Partial<ResearchOrganization>) {
    if (!canEdit) {
      return;
    }

    const response = await fetch("/api/organizations", {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify({ organization }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "组织保存失败");
    }
    await loadState();
    setNotice("组织已保存");
  }

  async function patchOrganization(
    organizationId: string,
    organization: Partial<ResearchOrganization>,
  ) {
    if (!canEdit) {
      return;
    }

    const response = await fetch(`/api/organizations/${organizationId}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify({ organization }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "组织保存失败");
    }
    await loadState();
    setNotice("组织已保存");
  }

  async function deleteOrganization(organizationId: string) {
    if (!canEdit) {
      return;
    }

    const response = await fetch(`/api/organizations/${organizationId}`, {
      method: "DELETE",
      headers: requestHeaders(),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "组织删除失败");
    }
    await loadState();
    setNotice("组织已删除");
  }

  async function patchDashboardBrief(patch: Partial<DashboardBrief>) {
    if (!canEdit) {
      return;
    }

    const response = await fetch("/api/dashboard/brief", {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify({ patch }),
    });
    if (!response.ok) {
      throw new Error("简报保存失败");
    }
    await loadState();
    setNotice("工作简报已保存");
  }

  async function createNextStep(step: Partial<NextStep>) {
    if (!canEdit) {
      return;
    }

    const response = await fetch("/api/dashboard/next-steps", {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify({ step }),
    });
    if (!response.ok) {
      throw new Error("下一步计划保存失败");
    }
  }

  async function patchNextStep(stepId: string, step: Partial<NextStep>) {
    if (!canEdit) {
      return;
    }

    const response = await fetch(`/api/dashboard/next-steps/${stepId}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify({ step }),
    });
    if (!response.ok) {
      throw new Error("下一步计划保存失败");
    }
  }

  async function deleteNextStep(stepId: string) {
    if (!canEdit) {
      return;
    }

    const response = await fetch(`/api/dashboard/next-steps/${stepId}`, {
      method: "DELETE",
      headers: requestHeaders(),
    });
    if (!response.ok) {
      throw new Error("下一步计划删除失败");
    }
  }

  async function saveNextSteps(
    drafts: NextStepDraft[],
    deletedStepIds: string[],
  ) {
    if (!canEdit) {
      return;
    }

    const activeDrafts = drafts.filter((step) => !step.deleted && step.content.trim());
    await Promise.all([
      ...deletedStepIds.map((id) => deleteNextStep(id)),
      ...activeDrafts.map((step, index) => {
        const payload: Partial<NextStep> = {
          content: step.content.trim(),
          completed: step.completed,
          sortOrder: index + 1,
        };
        return step.isNew ? createNextStep(payload) : patchNextStep(step.id, payload);
      }),
    ]);
    await loadState();
    setNotice("下一步计划已保存");
  }

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads/avatar", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      url?: string;
    };
    if (!response.ok || !data.url) {
      throw new Error(data.error || "头像上传失败");
    }
    setNotice("头像已上传");
    return data.url;
  }

  async function removeAvatar(url: string) {
    if (!url.startsWith("/uploads/avatars/")) {
      return;
    }
    const response = await fetch("/api/uploads/avatar", {
      method: "DELETE",
      headers: requestHeaders(),
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      throw new Error("头像删除失败");
    }
    setNotice("头像已删除");
  }

  async function savePerson(person: Person, mode: "new" | "edit") {
    if (!canEdit) {
      return;
    }

    const id = person.id || slugify(person.name);
    const saved: Person = {
      ...person,
      id,
      owner: person.owner || currentUser.name,
    };

    let response: Response;
    if (mode === "new") {
      response = await fetch("/api/people", {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({ person: saved }),
      });
    } else {
      response = await fetch(`/api/people/${id}`, {
        method: "PATCH",
        headers: requestHeaders(),
        body: JSON.stringify({
          patch: saved,
          action: "编辑人员",
          summary: `${currentUser.name} 更新了 ${saved.name} 的人员信息。`,
        }),
      });
    }
    if (!response.ok) {
      throw new Error("人员保存失败");
    }

    await loadState();
    setNotice("人员信息已保存");
    navigate("people");
  }

  async function archivePerson(person: Person, archived: boolean) {
    if (!canArchive) {
      return;
    }

    await fetch(`/api/people/${person.id}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify({
        patch: { archived },
        action: archived ? "归档人员" : "恢复人员",
        summary: archived
          ? `${currentUser.name} 归档了 ${person.name}。`
          : `${currentUser.name} 恢复了 ${person.name}。`,
        before: archived ? "未归档" : "已归档",
        after: archived ? "已归档" : "未归档",
      }),
    });
    await loadState();
  }

  async function deletePerson(person: Person) {
    if (!canArchive) {
      return;
    }

    await fetch(`/api/people/${person.id}?hard=true`, {
      method: "DELETE",
      headers: requestHeaders(),
    });
    await loadState();
  }

  function exportCsv() {
    const rows = filteredPeople.map((person) => ({
      name: person.name,
      role: person.role,
      title: person.title,
      institution: person.institution,
      lab: person.lab,
      department: person.department,
      location: person.location,
      research_topics: person.researchTopics.join("; "),
      priority: person.priority,
      short_assessment: person.shortAssessment,
      owner: person.owner,
      feishu_doc_url: person.feishuDocUrl,
      supervisor_note: person.supervisorNote,
      last_modified_by: person.lastModifiedBy,
      last_modified_at: person.lastModifiedAt,
    }));

    const headers = Object.keys(rows[0] ?? { name: "" });
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => csvEscape(String(row[header as keyof typeof row] ?? "")))
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `具身智能科研对象池-${todayDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv() {
    if (!canEdit || !importText.trim()) {
      return;
    }

    await fetch("/api/people/import", {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify({ csv: importText }),
    });
    await loadState();
    setImportText("");
    navigate("people");
  }

  async function resetRemoteData() {
    await fetch("/api/research-pool/reset", {
      method: "POST",
      headers: requestHeaders(),
    });
    await loadState();
    setFilters(EMPTY_FILTERS);
    navigate("dashboard");
  }

  async function login(email: string) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "登录失败");
    }
    const session = await loadSession();
    if (!session.authenticated && session.authRequired) {
      throw new Error("登录状态读取失败");
    }
    await loadState();
    navigate("dashboard");
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    setCurrentUser({ name: "", role: "Viewer" });
    setState(INITIAL_RESEARCH_POOL_STATE);
    navigate("login");
  }

  return (
    <main className="app-shell">
      <Header
        authRequired={authRequired}
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
        view={view}
      />
      {notice && (
        <button className="toast" onClick={() => setNotice("")} type="button">
          {notice}
        </button>
      )}
      {loadError && (
        <div className="system-error" role="alert">
          {loadError}
        </div>
      )}
      {isLoading && view !== "login" && (
        <div className="loading-strip" aria-live="polite" role="status">
          正在同步云端数据
        </div>
      )}

      {view === "login" && (
        <LoginView
          authRequired={authRequired}
          currentUser={currentUser}
          onEnter={() => navigate("dashboard")}
          onLogin={login}
        />
      )}

      {view !== "login" && (
        <div className="workspace">
          <aside className="side-nav" aria-label="Primary">
            <button
              className={view === "dashboard" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("dashboard")}
              type="button"
            >
              工作概览
            </button>
            <button
              className={view === "updates" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("updates")}
              type="button"
            >
              工作记录
            </button>
            <button
              className={view === "people" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("people")}
              type="button"
            >
              人员目录
            </button>
            <button
              className={view === "organizations" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("organizations")}
              type="button"
            >
              组织目录
            </button>
            <button
              className={view === "new" ? "nav-item active" : "nav-item"}
              disabled={!canEdit}
              onClick={() => navigate("new")}
              type="button"
            >
              新增人员
            </button>
          </aside>

          <section className="content-area">
            {view === "dashboard" && (
              <DashboardView
                activePeople={activePeople}
                brief={state.dashboardBrief}
                canEdit={canEdit}
                currentUser={currentUser}
                onCreateUpdate={createWorkUpdate}
                onDeleteUpdate={deleteWorkUpdate}
                onPatchBrief={patchDashboardBrief}
                onNavigate={navigate}
                onPatchUpdate={patchWorkUpdate}
                onSaveNextSteps={saveNextSteps}
                nextSteps={state.nextSteps}
                updates={state.updates}
              />
            )}

            {view === "updates" && (
              <UpdatesView
                activePeople={activePeople}
                canEdit={canEdit}
                currentUser={currentUser}
                onCreateUpdate={createWorkUpdate}
                onDeleteUpdate={deleteWorkUpdate}
                onPatchUpdate={patchWorkUpdate}
                updates={state.updates}
              />
            )}

            {view === "people" && (
              <PeopleView
                allPeople={state.people}
                canEdit={canEdit}
                exportCsv={exportCsv}
                filteredPeople={filteredPeople}
                filters={filters}
                highlightPersonId={selectedEntityId}
                importCsv={importCsv}
                importText={importText}
                institutions={institutions}
                labs={labs}
                onArchive={archivePerson}
                onDelete={deletePerson}
                onFilterChange={setFilters}
                onImportTextChange={setImportText}
                onNavigate={navigate}
                onResetData={resetRemoteData}
                onQuickUpdate={quickUpdatePerson}
                onToggleFilter={toggleFilter}
                onUploadAvatar={uploadAvatar}
                onRemoveAvatar={removeAvatar}
                priorities={allPriorities}
                roleLabels={roleLabelMap}
                roles={[...ROLE_OPTIONS]}
                topics={allTopics}
              />
            )}

            {view === "organizations" && (
              <OrganizationsView
                canEdit={canEdit}
                onCreate={createOrganization}
                onDelete={deleteOrganization}
                onNavigate={navigate}
                onPatch={patchOrganization}
                organizations={state.organizations}
                people={state.people}
                updates={state.updates}
              />
            )}

            {view === "detail" && selectedPerson && (
              <PersonDocumentNotice
                onNavigate={navigate}
                person={selectedPerson}
              />
            )}

            {view === "detail" && !selectedPerson && (
              <EmptyState
                actionLabel="返回人员目录"
                message="没有找到这位人员，可能已被导入数据覆盖或路径有误。"
                onAction={() => navigate("people")}
                title="人员不存在"
              />
            )}

            {view === "new" && (
              <PersonForm
                canEdit={canEdit}
                currentUser={currentUser}
                key="new-person"
                onCancel={() => navigate("people")}
                onRemoveAvatar={removeAvatar}
                onSave={(person) => savePerson(person, "new")}
                onUploadAvatar={uploadAvatar}
                person={initialPerson(currentUser)}
                title="新增科研对象"
              />
            )}

            {view === "edit" && selectedPerson && (
              <PersonForm
                canEdit={canEdit}
                currentUser={currentUser}
                key={selectedPerson.id}
                onCancel={() => navigate("people")}
                onRemoveAvatar={removeAvatar}
                onSave={(person) => savePerson(person, "edit")}
                onUploadAvatar={uploadAvatar}
                person={selectedPerson}
                title={`编辑 ${selectedPerson.name}`}
              />
            )}

            {view === "edit" && !selectedPerson && (
              <EmptyState
                actionLabel="返回人员目录"
                message="没有找到可编辑的人员记录。"
                onAction={() => navigate("people")}
                title="人员不存在"
              />
            )}

          </section>
        </div>
      )}
    </main>
  );
}

function Header({
  authRequired,
  currentUser,
  onNavigate,
  onLogout,
  view,
}: {
  authRequired: boolean;
  currentUser: CurrentUserState;
  onNavigate: (view: View, id?: string) => void;
  onLogout: () => void;
  view: View;
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onNavigate("dashboard")} type="button">
        <span className="brand-mark">EA</span>
        <span>
          <strong>具身智能科研对象池</strong>
          <small>内部协作管理平台</small>
        </span>
      </button>
      <div className="topbar-actions">
        <button
          className={view === "people" ? "text-tab active" : "text-tab"}
          onClick={() => onNavigate("people")}
          type="button"
        >
          人员
        </button>
        <button
          className={view === "organizations" ? "text-tab active" : "text-tab"}
          onClick={() => onNavigate("organizations")}
          type="button"
        >
          组织
        </button>
        <div className="account-pill">
          <span>{currentUser.name || "未登录"}</span>
          <small>{userRoleLabels[currentUser.role]}</small>
        </div>
        <button
          className="button ghost"
          onClick={authRequired ? onLogout : () => onNavigate("login")}
          type="button"
        >
          {authRequired ? "退出登录" : "本地演示"}
        </button>
      </div>
    </header>
  );
}

function LoginView({
  authRequired,
  currentUser,
  onEnter,
  onLogin,
}: {
  authRequired: boolean;
  currentUser: CurrentUserState;
  onEnter: () => void;
  onLogin: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(currentUser.email ?? "");
  const [saveState, setSaveState] = useState<SaveState>(EMPTY_SAVE_STATE);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState({ ...EMPTY_SAVE_STATE, saving: true });
    try {
      await onLogin(email);
      setSaveState({ error: "", saving: false, success: "登录成功" });
    } catch (error) {
      setSaveState({
        error: error instanceof Error ? error.message : "登录失败",
        saving: false,
        success: "",
      });
    }
  }

  return (
    <section className="login-layout">
      <div className="login-copy">
        <p className="eyebrow">内部协作工作台</p>
        <h1>具身智能科研对象池协作管理平台</h1>
        <p>
          使用受邀账号登录后查看工作简报、每日记录和人员名单。
        </p>
      </div>
      {authRequired ? (
        <form className="login-panel" onSubmit={submitLogin}>
          <label className="field-label">
            邮箱
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />
          </label>
          {saveState.error && <p className="form-error">{saveState.error}</p>}
          {saveState.success && <p className="form-success">{saveState.success}</p>}
          <button className="button primary full" disabled={saveState.saving} type="submit">
            {saveState.saving ? "进入中..." : "进入系统"}
          </button>
        </form>
      ) : (
        <div className="login-panel">
          <p className="form-hint">
            当前未配置 Supabase，系统以本地演示模式运行。配置云端环境变量后，这里会切换为真实登录。
          </p>
          <button className="button primary full" onClick={onEnter} type="button">
            进入本地演示
          </button>
        </div>
      )}
    </section>
  );
}

function DashboardView({
  activePeople,
  brief,
  canEdit,
  currentUser,
  nextSteps,
  onCreateUpdate,
  onDeleteUpdate,
  onNavigate,
  onPatchBrief,
  onPatchUpdate,
  onSaveNextSteps,
  updates,
}: {
  activePeople: Person[];
  brief: DashboardBrief;
  canEdit: boolean;
  currentUser: { name: string; role: UserRole };
  nextSteps: NextStep[];
  onCreateUpdate: (update: Partial<WorkUpdate>) => Promise<void> | void;
  onDeleteUpdate: (updateId: string) => Promise<void> | void;
  onNavigate: (view: View, id?: string) => void;
  onPatchBrief: (patch: Partial<DashboardBrief>) => Promise<void> | void;
  onPatchUpdate: (updateId: string, update: Partial<WorkUpdate>) => Promise<void> | void;
  onSaveNextSteps: (
    drafts: NextStepDraft[],
    deletedStepIds: string[],
  ) => Promise<void> | void;
  updates: WorkUpdate[];
}) {
  const [range, setRange] = useState<"today" | "recent">("recent");
  const [drawer, setDrawer] = useState<{
    mode: UpdateDrawerMode;
    source?: Partial<WorkUpdate>;
  } | null>(null);
  const [briefDrawerOpen, setBriefDrawerOpen] = useState(false);
  const [nextStepsDrawerOpen, setNextStepsDrawerOpen] = useState(false);

  const sortedUpdates = sortWorkUpdates(updates);
  const latestUpdate = sortedUpdates[0];
  const todayUpdates = sortedUpdates.filter((update) => isToday(update.occurredAt));
  const weekUpdates = sortedUpdates.filter((update) => isThisWeek(update.occurredAt));
  const visibleUpdates = sortedUpdates
    .filter((update) =>
      range === "today" ? isToday(update.occurredAt) : true,
    )
    .slice(0, 6);
  const latestInsights = sortedUpdates
    .filter((update) => update.insight.trim())
    .slice(0, 3);
  const visibleNextSteps = nextSteps
    .filter((step) => !step.completed)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, 5);

  async function saveUpdate(draft: UpdateDraft) {
    if (drawer?.mode === "edit" && drawer.source?.id) {
      await onPatchUpdate(drawer.source.id, draft);
    } else {
      await onCreateUpdate({ ...draft, author: currentUser.name });
    }
    setDrawer(null);
  }

  function duplicateUpdate(update: WorkUpdate) {
    setDrawer({
      mode: "create",
      source: {
        ...update,
        title: `${update.title}（副本）`,
        occurredAt: nowStamp(),
      },
    });
  }

  return (
    <div className="page-stack research-brief">
      <section className="brief-hero">
        <div>
          <div className="brief-title-row">
            <p className="eyebrow">实时工作简报</p>
            {canEdit && (
              <button className="link-button" onClick={() => setBriefDrawerOpen(true)} type="button">
                编辑简报
              </button>
            )}
          </div>
          <h1>{brief.title}</h1>
          <p className="brief-text">{brief.description.replace(/\\n/g, "\n")}</p>
          {brief.focusAreas.length > 0 && (
            <div className="focus-area-row" aria-label="关注方向">
              {brief.focusAreas.map((area) => (
                <span key={area}>{area}</span>
              ))}
            </div>
          )}
          <span>
            最后更新：{brief.updatedAt || latestUpdate?.occurredAt || nowStamp()}
            {brief.updatedBy ? ` · ${brief.updatedBy}` : ""}
          </span>
        </div>
        <div className="button-row">
          <button
            className="button primary"
            disabled={!canEdit}
            onClick={() => setDrawer({ mode: "create" })}
            type="button"
          >
            记录进展
          </button>
          <button className="button" onClick={() => onNavigate("people")} type="button">
            查看人员名单
          </button>
        </div>
      </section>

      <section className="brief-summary-bar" aria-label="今日与本周摘要">
        <div>
          <strong>今日：{todayUpdates.length} 条更新</strong>
          <span>{compactUpdateSummary(todayUpdates)}</span>
        </div>
        <div>
          <strong>本周：{weekUpdates.length} 条更新</strong>
          <span>{compactUpdateSummary(weekUpdates)}</span>
        </div>
      </section>

      <div className="brief-main-grid">
        <section className="dashboard-section timeline-section">
          <div className="panel-heading">
            <div>
              <h2>最近工作记录</h2>
              <span>{range === "today" ? "今天摘要" : "最近 6 条摘要"}</span>
            </div>
            <div className="segmented-actions" aria-label="工作记录范围">
              <button
                className={range === "today" ? "active" : ""}
                onClick={() => setRange("today")}
                type="button"
              >
                今天
              </button>
              <button
                className={range === "recent" ? "active" : ""}
                onClick={() => setRange("recent")}
                type="button"
              >
                最近记录
              </button>
              <button onClick={() => onNavigate("updates")} type="button">
                查看全部记录
              </button>
            </div>
          </div>
          <UpdateTimeline
            canEdit={canEdit}
            compact
            emptyMessage="点击“记录进展”补充今天完成的工作。"
            emptyTitle="暂无工作记录"
            onDelete={onDeleteUpdate}
            onDuplicate={duplicateUpdate}
            onEdit={(update) => setDrawer({ mode: "edit", source: update })}
            showInsight={false}
            updates={visibleUpdates}
          />
        </section>

        <aside className="brief-side-column">
          <section className="dashboard-section side-brief-card">
            <div className="panel-heading">
              <div>
                <h2>下一步</h2>
                <span>本周方向</span>
              </div>
              {canEdit && (
                <button className="link-button" onClick={() => setNextStepsDrawerOpen(true)} type="button">
                  编辑
                </button>
              )}
            </div>
            {visibleNextSteps.length > 0 ? (
              <ul className="next-list">
                {visibleNextSteps.map((step) => (
                  <li key={step.id}>{step.content}</li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">暂无未完成计划。</p>
            )}
          </section>
          <section className="dashboard-section side-brief-card">
            <div className="panel-heading">
              <div>
                <h2>最新判断</h2>
                <span>{latestInsights.length} 条</span>
              </div>
              {canEdit && (
                <button
                  className="link-button"
                  onClick={() =>
                    setDrawer({
                      mode: "create",
                      source: { updateType: "新增研究判断", occurredAt: nowStamp() },
                    })
                  }
                  type="button"
                >
                  新增判断
                </button>
              )}
            </div>
            {latestInsights.length ? (
              <ul className="insight-list">
                {latestInsights.map((update) => (
                  <li key={update.id}>
                    <div className="insight-title-row">
                      <strong>{update.linkedPerson || update.linkedOrganization || update.title}</strong>
                      {canEdit ? (
                        <details className="update-more-menu compact-more-menu">
                          <summary aria-label={`管理判断 ${update.title}`}>···</summary>
                          <div>
                            <button
                              onClick={() => setDrawer({ mode: "edit", source: update })}
                              type="button"
                            >
                              编辑判断
                            </button>
                            {update.feishuUrl ? (
                              <a href={update.feishuUrl} rel="noreferrer" target="_blank">
                                打开相关飞书
                              </a>
                            ) : (
                              <button disabled type="button">
                                打开相关飞书
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (
                                  typeof window !== "undefined" &&
                                  !window.confirm(`确认删除这条判断来源记录？\n\n${update.title}`)
                                ) {
                                  return;
                                }
                                onDeleteUpdate(update.id);
                              }}
                              type="button"
                            >
                              删除记录
                            </button>
                          </div>
                        </details>
                      ) : update.feishuUrl ? (
                        <a className="link-button" href={update.feishuUrl} rel="noreferrer" target="_blank">
                          飞书 ↗
                        </a>
                      ) : null}
                    </div>
                    <button
                      className="insight-body"
                      onClick={() => setDrawer({ mode: "edit", source: update })}
                      type="button"
                    >
                      {update.insight}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">暂无可展示的研究判断。</p>
            )}
          </section>
        </aside>
      </div>

      {briefDrawerOpen && (
        <BriefDrawer
          brief={brief}
          onClose={() => setBriefDrawerOpen(false)}
          onSave={async (patch) => {
            await onPatchBrief(patch);
            setBriefDrawerOpen(false);
          }}
        />
      )}

      {nextStepsDrawerOpen && (
        <NextStepsDrawer
          nextSteps={nextSteps}
          onClose={() => setNextStepsDrawerOpen(false)}
          onSave={async (drafts, deletedStepIds) => {
            await onSaveNextSteps(drafts, deletedStepIds);
            setNextStepsDrawerOpen(false);
          }}
        />
      )}

      {drawer && (
        <UpdateDrawer
          activePeople={activePeople}
          key={`${drawer.mode}-${drawer.source?.id ?? "new"}-${drawer.source?.occurredAt ?? ""}`}
          mode={drawer.mode}
          onClose={() => setDrawer(null)}
          onSave={saveUpdate}
          source={drawer.source}
        />
      )}
    </div>
  );
}

function UpdatesView({
  activePeople,
  canEdit,
  currentUser,
  onCreateUpdate,
  onDeleteUpdate,
  onPatchUpdate,
  updates,
}: {
  activePeople: Person[];
  canEdit: boolean;
  currentUser: { name: string; role: UserRole };
  onCreateUpdate: (update: Partial<WorkUpdate>) => Promise<void> | void;
  onDeleteUpdate: (updateId: string) => Promise<void> | void;
  onPatchUpdate: (updateId: string, update: Partial<WorkUpdate>) => Promise<void> | void;
  updates: WorkUpdate[];
}) {
  const [filters, setFilters] = useState<UpdateFilters>(EMPTY_UPDATE_FILTERS);
  const [drawer, setDrawer] = useState<{
    mode: UpdateDrawerMode;
    source?: Partial<WorkUpdate>;
  } | null>(null);

  const visibleUpdates = sortWorkUpdates(updates).filter((update) => updateMatchesFilters(update, filters));

  async function saveUpdate(draft: UpdateDraft) {
    if (drawer?.mode === "edit" && drawer.source?.id) {
      await onPatchUpdate(drawer.source.id, draft);
    } else {
      await onCreateUpdate({ ...draft, author: currentUser.name });
    }
    setDrawer(null);
  }

  function duplicateUpdate(update: WorkUpdate) {
    setDrawer({
      mode: "create",
      source: {
        ...update,
        title: `${update.title}（副本）`,
        occurredAt: nowStamp(),
      },
    });
  }

  return (
    <div className="page-stack updates-manager">
      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">工作记录</p>
          <h1>每日更新记录</h1>
          <p>查看、筛选、补充和维护所有面向上级的研究日报记录。</p>
        </div>
        <button
          className="button primary"
          disabled={!canEdit}
          onClick={() => setDrawer({ mode: "create" })}
          type="button"
        >
          记录进展
        </button>
      </section>

      <section className="dashboard-section update-filter-panel">
        <div className="update-filter-row">
          <input
            aria-label="按日期筛选"
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
            type="date"
            value={filters.date}
          />
          <select
            aria-label="按类型筛选"
            onChange={(event) => setFilters((current) => ({ ...current, updateType: event.target.value }))}
            value={filters.updateType}
          >
            <option value="">全部类型</option>
            {UPDATE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            aria-label="按人员筛选"
            onChange={(event) => setFilters((current) => ({ ...current, person: event.target.value }))}
            placeholder="按人员筛选"
            value={filters.person}
          />
          <input
            aria-label="按实验室筛选"
            onChange={(event) => setFilters((current) => ({ ...current, organization: event.target.value }))}
            placeholder="按实验室 / 组织筛选"
            value={filters.organization}
          />
          <button className="button" onClick={() => setFilters(EMPTY_UPDATE_FILTERS)} type="button">
            清空筛选
          </button>
        </div>
      </section>

      <section className="dashboard-section timeline-section">
        <div className="panel-heading">
          <h2>全部历史记录</h2>
          <span>{visibleUpdates.length} 条</span>
        </div>
        <UpdateTimeline
          canEdit={canEdit}
          emptyMessage="调整筛选条件，或点击“记录进展”新增一条记录。"
          emptyTitle="没有匹配的工作记录"
          onDelete={onDeleteUpdate}
          onDuplicate={duplicateUpdate}
          onEdit={(update) => setDrawer({ mode: "edit", source: update })}
          updates={visibleUpdates}
        />
      </section>

      {drawer && (
        <UpdateDrawer
          activePeople={activePeople}
          key={`${drawer.mode}-${drawer.source?.id ?? "new"}-${drawer.source?.occurredAt ?? ""}`}
          mode={drawer.mode}
          onClose={() => setDrawer(null)}
          onSave={saveUpdate}
          source={drawer.source}
        />
      )}
    </div>
  );
}

function UpdateTimeline({
  canEdit,
  compact = false,
  emptyMessage,
  emptyTitle,
  onDelete,
  onDuplicate,
  onEdit,
  showInsight = true,
  updates,
}: {
  canEdit: boolean;
  compact?: boolean;
  emptyMessage: string;
  emptyTitle: string;
  onDelete: (updateId: string) => Promise<void> | void;
  onDuplicate: (update: WorkUpdate) => void;
  onEdit: (update: WorkUpdate) => void;
  showInsight?: boolean;
  updates: WorkUpdate[];
}) {
  const groupedUpdates = groupWorkUpdates(updates);

  function confirmDelete(update: WorkUpdate) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`确认删除这条工作记录？\n\n${update.title}`)
    ) {
      return;
    }
    onDelete(update.id);
  }

  if (!groupedUpdates.length) {
    return (
      <div className="inline-empty">
        <strong>{emptyTitle}</strong>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="timeline-list">
      {groupedUpdates.map((group) => (
        <div className="timeline-day" key={group.date}>
          <h3>{formatDateLabel(group.date)}</h3>
          {group.items.map((update) => {
            const summary = displayUpdateSummary(update);
            const organization = visibleUpdateOrganization(update.linkedOrganization);
            const hasLinks = Boolean(update.linkedPerson || organization || update.feishuUrl);

            return (
              <article className={compact ? "timeline-item compact" : "timeline-item"} key={update.id}>
                <div className="timeline-item-head">
                  <div className="timeline-meta">
                    <span className="update-type">{update.updateType}</span>
                    <time>{formatTimeLabel(update.occurredAt)}</time>
                    {update.author && <span>{update.author}</span>}
                  </div>
                  {canEdit && (
                    <details className="update-more-menu">
                      <summary aria-label={`管理 ${update.title}`}>···</summary>
                      <div>
                        <button onClick={() => onEdit(update)} type="button">
                          编辑
                        </button>
                        <button onClick={() => confirmDelete(update)} type="button">
                          删除
                        </button>
                        <button onClick={() => onDuplicate(update)} type="button">
                          复制
                        </button>
                        {update.feishuUrl ? (
                          <a href={update.feishuUrl} rel="noreferrer" target="_blank">
                            打开飞书
                          </a>
                        ) : (
                          <button disabled type="button">
                            打开飞书
                          </button>
                        )}
                      </div>
                    </details>
                  )}
                </div>
                {!compact && <h4>{update.title}</h4>}
                {summary && (
                  <p className="timeline-summary">
                    {compact ? summarizeCoreChange(update, summary) : summary}
                  </p>
                )}
                {showInsight && update.insight && <blockquote>判断：{update.insight}</blockquote>}
                {hasLinks && (
                  <div className="update-links">
                    {update.linkedPerson && <span>{update.linkedPerson}</span>}
                    {organization && <span>{organization}</span>}
                    {update.feishuUrl && !compact && (
                      <a href={update.feishuUrl} rel="noreferrer" target="_blank">
                        飞书 ↗
                      </a>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function BriefDrawer({
  brief,
  onClose,
  onSave,
}: {
  brief: DashboardBrief;
  onClose: () => void;
  onSave: (patch: Partial<DashboardBrief>) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<BriefDraft>({
    title: brief.title,
    description: brief.description,
    focusAreas: brief.focusAreas,
  });
  const [saveState, setSaveState] = useState<SaveState>(EMPTY_SAVE_STATE);
  const canSave = Boolean(draft.title.trim() && draft.description.trim());

  async function submit() {
    if (!canSave || saveState.saving) {
      return;
    }

    setSaveState({ error: "", saving: true, success: "" });
    try {
      await onSave({
        title: draft.title.trim(),
        description: draft.description.trim(),
        focusAreas: draft.focusAreas.map((area) => area.trim()).filter(Boolean),
      });
    } catch (error) {
      setSaveState({
        error: error instanceof Error ? error.message : "保存失败",
        saving: false,
        success: "",
      });
    }
  }

  return (
    <div className="drawer-shell">
      <button className="drawer-backdrop" aria-label="关闭编辑简报" onClick={onClose} type="button" />
      <aside className="person-drawer update-drawer" aria-label="编辑实时工作简报">
        <div className="drawer-header">
          <div>
            <span>实时工作简报</span>
            <h2>编辑简报</h2>
          </div>
          <button className="small-button" onClick={onClose} type="button">
            关闭
          </button>
        </div>
        <div className="drawer-form">
          <Field
            label="简报标题"
            onChange={(value) => setDraft((current) => ({ ...current, title: value }))}
            value={draft.title}
          />
          <label className="field-label">
            当前工作描述
            <textarea
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              value={draft.description}
            />
          </label>
          <Field
            label="关注方向，分号分隔"
            onChange={(value) =>
              setDraft((current) => ({ ...current, focusAreas: splitList(value) }))
            }
            value={draft.focusAreas.join("; ")}
          />
          <p className="form-hint subtle">保存后会自动更新最后更新时间和更新人。</p>
          {saveState.error && <p className="form-error">{saveState.error}</p>}
          {saveState.success && <p className="form-success">{saveState.success}</p>}
        </div>
        <div className="drawer-actions">
          <button className="button" disabled={saveState.saving} onClick={onClose} type="button">
            取消
          </button>
          <button className="button primary" disabled={!canSave || saveState.saving} onClick={submit} type="button">
            {saveState.saving ? "保存中..." : "保存简报"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function NextStepsDrawer({
  nextSteps,
  onClose,
  onSave,
}: {
  nextSteps: NextStep[];
  onClose: () => void;
  onSave: (drafts: NextStepDraft[], deletedStepIds: string[]) => Promise<void> | void;
}) {
  const [drafts, setDrafts] = useState<NextStepDraft[]>(
    () => [...nextSteps].sort((left, right) => left.sortOrder - right.sortOrder),
  );
  const [deletedStepIds, setDeletedStepIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>(EMPTY_SAVE_STATE);

  function addStep() {
    const stamp = nowStamp();
    setDrafts((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        content: "",
        completed: false,
        sortOrder: current.length + 1,
        createdAt: stamp,
        updatedAt: stamp,
        isNew: true,
      },
    ]);
  }

  function updateStep(id: string, patch: Partial<NextStepDraft>) {
    setDrafts((current) =>
      current.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
  }

  function removeStep(step: NextStepDraft) {
    if (
      !step.isNew &&
      typeof window !== "undefined" &&
      !window.confirm(`确认删除这条下一步计划？\n\n${step.content}`)
    ) {
      return;
    }
    if (!step.isNew) {
      setDeletedStepIds((current) => [...current, step.id]);
    }
    setDrafts((current) => current.filter((item) => item.id !== step.id));
  }

  function moveStep(id: string, direction: -1 | 1) {
    setDrafts((current) => {
      const next = [...current];
      const index = next.findIndex((step) => step.id === id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((step, orderIndex) => ({ ...step, sortOrder: orderIndex + 1 }));
    });
  }

  async function submit() {
    if (saveState.saving) {
      return;
    }

    setSaveState({ error: "", saving: true, success: "" });
    try {
      await onSave(
        drafts.map((step, index) => ({ ...step, sortOrder: index + 1 })),
        deletedStepIds,
      );
      setSaveState({ error: "", saving: false, success: "已保存" });
    } catch (error) {
      setSaveState({
        error: error instanceof Error ? error.message : "保存失败",
        saving: false,
        success: "",
      });
    }
  }

  return (
    <div className="drawer-shell">
      <button className="drawer-backdrop" aria-label="关闭下一步编辑" onClick={onClose} type="button" />
      <aside className="person-drawer update-drawer next-step-drawer" aria-label="编辑下一步计划">
        <div className="drawer-header">
          <div>
            <span>计划列表</span>
            <h2>编辑下一步</h2>
          </div>
          <button className="small-button" onClick={onClose} type="button">
            关闭
          </button>
        </div>

        <div className="next-step-editor-list">
          {drafts.map((step, index) => (
            <div className={step.completed ? "next-step-editor-row completed" : "next-step-editor-row"} key={step.id}>
              <label className="check-row">
                <input
                  checked={step.completed}
                  onChange={(event) => updateStep(step.id, { completed: event.target.checked })}
                  type="checkbox"
                />
                <span>完成</span>
              </label>
              <input
                aria-label="下一步内容"
                onChange={(event) => updateStep(step.id, { content: event.target.value })}
                placeholder="输入下一步计划"
                value={step.content}
              />
              <div className="step-row-actions">
                <button disabled={index === 0} onClick={() => moveStep(step.id, -1)} type="button">
                  上移
                </button>
                <button disabled={index === drafts.length - 1} onClick={() => moveStep(step.id, 1)} type="button">
                  下移
                </button>
                <button onClick={() => removeStep(step)} type="button">
                  删除
                </button>
              </div>
            </div>
          ))}
          {!drafts.length && <p className="muted-text">暂无下一步计划。</p>}
        </div>

        <button className="button" onClick={addStep} type="button">
          新增计划
        </button>
        {saveState.error && <p className="form-error">{saveState.error}</p>}
        {saveState.success && <p className="form-success">{saveState.success}</p>}

        <div className="drawer-actions">
          <button className="button" disabled={saveState.saving} onClick={onClose} type="button">
            取消
          </button>
          <button className="button primary" disabled={saveState.saving} onClick={submit} type="button">
            {saveState.saving ? "保存中..." : "保存下一步"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function UpdateDrawer({
  activePeople,
  mode,
  onClose,
  onSave,
  source,
}: {
  activePeople: Person[];
  mode: UpdateDrawerMode;
  onClose: () => void;
  onSave: (draft: UpdateDraft) => Promise<void> | void;
  source?: Partial<WorkUpdate>;
}) {
  const [draft, setDraft] = useState<UpdateDraft>(() => draftFromUpdate(source));
  const [saveState, setSaveState] = useState<SaveState>(EMPTY_SAVE_STATE);
  const canSave = Boolean(draft.title.trim() && draft.summary.trim());

  function updateDraft<K extends keyof UpdateDraft>(key: K, value: UpdateDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function selectLinkedPerson(personId: string) {
    const person = activePeople.find((item) => item.id === personId);
    setDraft((current) => ({
      ...current,
      linkedPersonId: personId,
      linkedPerson: person?.name ?? "",
      linkedOrganization: person?.lab || person?.institution || current.linkedOrganization,
      feishuUrl: person?.feishuDocUrl || current.feishuUrl,
    }));
  }

  async function submit() {
    if (!canSave || saveState.saving) {
      return;
    }
    setSaveState({ error: "", saving: true, success: "" });
    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        insight: draft.insight.trim(),
        linkedPerson: draft.linkedPerson.trim(),
        linkedOrganization: draft.linkedOrganization.trim(),
        feishuUrl: draft.feishuUrl.trim(),
        occurredAt: draft.occurredAt.trim() || nowStamp(),
      });
      setSaveState({ error: "", saving: false, success: "已保存" });
    } catch (error) {
      setSaveState({
        error: error instanceof Error ? error.message : "保存失败",
        saving: false,
        success: "",
      });
    }
  }

  return (
    <div className="drawer-shell">
      <button className="drawer-backdrop" aria-label="关闭记录进展表单" onClick={onClose} type="button" />
      <aside className="person-drawer update-drawer" aria-label={mode === "edit" ? "编辑工作记录" : "记录进展"}>
        <div className="drawer-header">
          <div>
            <span>{mode === "edit" ? "编辑已有记录" : "新增工作动态"}</span>
            <h2>{mode === "edit" ? "编辑工作记录" : "记录进展"}</h2>
          </div>
          <button className="small-button" onClick={onClose} type="button">
            关闭
          </button>
        </div>

        <div className="drawer-form">
          <Field
            label="日期与时间"
            onChange={(value) => updateDraft("occurredAt", value)}
            value={draft.occurredAt}
          />
          <label className="field-label">
            更新类型
            <select
              onChange={(event) => updateDraft("updateType", event.target.value as UpdateType)}
              value={draft.updateType}
            >
              {UPDATE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="标题"
            onChange={(value) => updateDraft("title", value)}
            value={draft.title}
          />
          <label className="field-label">
            完成内容
            <textarea
              onChange={(event) => updateDraft("summary", event.target.value)}
              placeholder="今天具体完成了什么。"
              value={draft.summary}
            />
          </label>
          <label className="field-label">
            形成的判断
            <textarea
              onChange={(event) => updateDraft("insight", event.target.value)}
              placeholder="可选，记录值得让上级看到的研究判断。"
              value={draft.insight}
            />
          </label>
          <label className="field-label">
            关联人员
            <select
              onChange={(event) => selectLinkedPerson(event.target.value)}
              value={draft.linkedPersonId}
            >
              <option value="">不关联人员</option>
              {activePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="关联实验室 / 组织"
            onChange={(value) => updateDraft("linkedOrganization", value)}
            value={draft.linkedOrganization}
          />
          <Field
            label="飞书链接"
            onChange={(value) => updateDraft("feishuUrl", value)}
            value={draft.feishuUrl}
          />
          {saveState.error && <p className="form-error">{saveState.error}</p>}
          {saveState.success && <p className="form-success">{saveState.success}</p>}
        </div>

        <div className="drawer-actions">
          <button className="button" disabled={saveState.saving} onClick={onClose} type="button">
            取消
          </button>
          <button className="button primary" disabled={!canSave || saveState.saving} onClick={submit} type="button">
            {saveState.saving ? "保存中..." : mode === "edit" ? "保存修改" : "保存进展"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function sortWorkUpdates(updates: WorkUpdate[]) {
  return [...updates].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function summarizeCoreChange(update: WorkUpdate, summary: string) {
  const priorityMatch = summary.match(/优先级从\s*([SABC])\s*调整为\s*([SABC])/);
  const target = update.linkedPerson || update.linkedOrganization || update.title.replace(/^调整优先级[:：]\s*/, "");
  if (priorityMatch) {
    return `${target}：${priorityMatch[1]} → ${priorityMatch[2]}`;
  }
  return summary;
}

function groupWorkUpdates(updates: WorkUpdate[]) {
  return updates.reduce<Array<{ date: string; items: WorkUpdate[] }>>((groups, update) => {
    const date = update.occurredAt.slice(0, 10);
    const group = groups.find((item) => item.date === date);
    if (group) {
      group.items.push(update);
    } else {
      groups.push({ date, items: [update] });
    }
    return groups;
  }, []);
}

function updateMatchesFilters(update: WorkUpdate, filters: UpdateFilters) {
  const personQuery = filters.person.trim().toLowerCase();
  const orgQuery = filters.organization.trim().toLowerCase();

  return (
    (!filters.date || update.occurredAt.startsWith(filters.date)) &&
    (!filters.updateType || update.updateType === filters.updateType) &&
    (!personQuery ||
      update.linkedPerson.toLowerCase().includes(personQuery) ||
      (update.linkedPersonId ?? "").toLowerCase().includes(personQuery)) &&
    (!orgQuery || update.linkedOrganization.toLowerCase().includes(orgQuery))
  );
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (cell || row.length) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      }
      if (char === "\r" && next === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  const [headers = [], ...records] = rows;
  return records.map((record) =>
    headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header.trim()] = record[index] ?? "";
      return accumulator;
    }, {}),
  );
}

function compactUpdateSummary(updates: WorkUpdate[]) {
  if (!updates.length) {
    return "暂无新增";
  }

  const labels: Partial<Record<UpdateType, string>> = {
    新增人员: "新增人员",
    完成人物调研: "完成调研",
    完成信息核验: "核验信息",
    新增实验室: "新增实验室",
    新增资料: "新增资料",
    更新人物资料: "资料更新",
    新增研究判断: "新增判断",
    调整优先级: "调整优先级",
    手动记录: "手动记录",
  };
  return UPDATE_TYPES.map((type) => ({
    count: updates.filter((update) => update.updateType === type).length,
    label: labels[type] ?? type,
  }))
    .filter((item) => item.count > 0)
    .slice(0, 3)
    .map((item) => `${item.label} ${item.count}`)
    .join("｜");
}

function draftFromUpdate(source?: Partial<WorkUpdate>): UpdateDraft {
  return {
    updateType: source?.updateType ?? "手动记录",
    title: source?.title ?? "",
    summary: source?.summary ?? "",
    insight: source?.insight ?? "",
    linkedPersonId: source?.linkedPersonId ?? "",
    linkedPerson: source?.linkedPerson ?? "",
    linkedOrganization: source?.linkedOrganization ?? "",
    feishuUrl: source?.feishuUrl ?? "",
    occurredAt: source?.occurredAt ?? nowStamp(),
  };
}

function OrganizationsView({
  canEdit,
  onCreate,
  onDelete,
  onNavigate,
  onPatch,
  organizations,
  people,
  updates,
}: {
  canEdit: boolean;
  onCreate: (organization: Partial<ResearchOrganization>) => Promise<void> | void;
  onDelete: (organizationId: string) => Promise<void> | void;
  onNavigate: (view: View, id?: string) => void;
  onPatch: (organizationId: string, organization: Partial<ResearchOrganization>) => Promise<void> | void;
  organizations: ResearchOrganization[];
  people: Person[];
  updates: WorkUpdate[];
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [priorityFilter, setPriorityFilter] = useState("全部");
  const [csvOpen, setCsvOpen] = useState(false);
  const [organizationCsv, setOrganizationCsv] = useState("");
  const [drawer, setDrawer] = useState<{
    mode: "create" | "edit";
    source?: ResearchOrganization;
  } | null>(null);

  const concreteOrganizations = sortOrganizationsByPriority(
    organizations.map(normalizeOrganization).filter((organization) => organization.type !== "school"),
  );
  const organizationTypes = unique([
    ...ORGANIZATION_TYPES,
    ...concreteOrganizations.map((organization) => organization.type),
  ]);
  const relatedPeopleByOrganization = new Map(
    concreteOrganizations.map((organization) => [
      organization.name,
      people.filter(
        (person) =>
          !person.archived &&
          person.lab.trim().toLowerCase() === organization.name.trim().toLowerCase(),
      ),
    ]),
  );
  const visibleOrganizations = concreteOrganizations.filter((organization) => {
    const haystack = [
      organization.name,
      organization.type,
      organization.websiteUrl,
      organization.note,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
    const matchesType = typeFilter === "全部" || organization.type === typeFilter;
    const matchesPriority =
      priorityFilter === "全部" ||
      normalizeOrganizationPriority(organization) === priorityFilter;
    return matchesQuery && matchesType && matchesPriority;
  });

  async function confirmDelete(organization: ResearchOrganization) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`确认删除这个组织？\n\n${organization.name}\n\n人员记录里的实验室文本不会被删除。`)
    ) {
      return;
    }
    await onDelete(organization.id);
  }

  function exportOrganizationsCsv() {
    const rows = visibleOrganizations.map((organization) => ({
      name: organization.name,
      type: organization.type,
      priority: normalizeOrganizationPriority(organization),
      website_url: organization.websiteUrl,
      note: organization.note,
      source_count: organization.sourceCount,
      updated_at: organization.updatedAt,
    }));
    const headers = Object.keys(rows[0] ?? { name: "", type: "", priority: "" });
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => csvEscape(String(row[header as keyof typeof row] ?? "")))
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `具身智能研究组织-${todayDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importOrganizationsCsv() {
    if (!canEdit || !organizationCsv.trim()) {
      return;
    }
    const records = parseCsvRows(organizationCsv);
    for (const record of records) {
      if (!record.name?.trim()) continue;
      await onCreate({
        name: record.name.trim(),
        type: record.type?.trim() || record.organization_type?.trim() || "实验室",
        priority: normalizeOrganizationPriority({ name: record.name, priority: record.priority }),
        websiteUrl: record.website_url?.trim() || record.websiteUrl?.trim() || "",
        note: record.note?.trim() || "",
      });
    }
    setOrganizationCsv("");
    setCsvOpen(false);
  }

  return (
    <div className="page-stack organization-page">
      <section className="directory-hero">
        <div>
          <p className="eyebrow">组织目录</p>
          <h1>研究组织名单</h1>
          <p>只维护实验室、研究团队、公司或项目中心；学校等大机构继续保留在人员基础信息里。</p>
        </div>
        <div className="directory-metrics organization-metrics" aria-label="组织概览">
          <button className={typeFilter === "全部" ? "active" : ""} onClick={() => setTypeFilter("全部")} type="button">
            <strong>{concreteOrganizations.length}</strong>
            <small>具体组织</small>
          </button>
          <button className={typeFilter === "实验室" ? "active" : ""} onClick={() => setTypeFilter("实验室")} type="button">
            <strong>{concreteOrganizations.filter((item) => item.type === "实验室").length}</strong>
            <small>实验室</small>
          </button>
          <button
            className={typeFilter === "公司/产业机构" ? "active" : ""}
            onClick={() => setTypeFilter("公司/产业机构")}
            type="button"
          >
            <strong>{concreteOrganizations.filter((item) => item.type === "公司/产业机构").length}</strong>
            <small>产业机构</small>
          </button>
          <button type="button">
            <strong>{people.filter((person) => person.lab && !person.archived).length}</strong>
            <small>关联人员</small>
          </button>
        </div>
      </section>

      <section className="directory-toolbar">
        <label className="search-row">
          <input
            aria-label="搜索组织"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索组织名称、类型、官网或备注"
            value={query}
          />
        </label>
        <div className="button-row">
          {canEdit && (
            <button className="button primary" onClick={() => setDrawer({ mode: "create" })} type="button">
              新增组织
            </button>
          )}
          <button className="button" onClick={exportOrganizationsCsv} type="button">
            导出 CSV
          </button>
          {canEdit && (
            <button className="button" onClick={() => setCsvOpen((open) => !open)} type="button">
              导入 CSV
            </button>
          )}
        </div>
      </section>

      {csvOpen && (
        <section className="dashboard-section organization-import-panel">
          <label className="field-label">
            组织 CSV
            <textarea
              onChange={(event) => setOrganizationCsv(event.target.value)}
              placeholder="name,type,priority,website_url,note&#10;H2X Lab,实验室,S,,重点组织"
              rows={5}
              value={organizationCsv}
            />
          </label>
          <div className="button-row">
            <button className="button" onClick={() => setCsvOpen(false)} type="button">
              取消
            </button>
            <button className="button primary" onClick={() => void importOrganizationsCsv()} type="button">
              导入组织
            </button>
          </div>
        </section>
      )}

      <div className="quick-filter-row" aria-label="组织类型筛选">
        <span className="quick-filter-label">类型</span>
        {["全部", ...organizationTypes].map((type) => (
          <button
            className={typeFilter === type ? "quick-filter active" : "quick-filter"}
            key={type}
            onClick={() => setTypeFilter(type)}
            type="button"
          >
            <span>{type}</span>
            <strong>
              {type === "全部"
                ? concreteOrganizations.length
                : concreteOrganizations.filter((organization) => organization.type === type).length}
            </strong>
          </button>
        ))}
      </div>

      <div className="quick-filter-row" aria-label="组织优先级筛选">
        <span className="quick-filter-label">优先级</span>
        {["全部", ...SIMPLE_PRIORITIES].map((priority) => (
          <button
            className={priorityFilter === priority ? "quick-filter active" : "quick-filter"}
            key={priority}
            onClick={() => setPriorityFilter(priority)}
            type="button"
          >
            <span>{priority}</span>
            <strong>
              {priority === "全部"
                ? concreteOrganizations.length
                : concreteOrganizations.filter((organization) => normalizeOrganizationPriority(organization) === priority).length}
            </strong>
          </button>
        ))}
      </div>

      {visibleOrganizations.length ? (
        <div className="organization-grid">
          {visibleOrganizations.map((organization) => {
            const relatedPeople = relatedPeopleByOrganization.get(organization.name) ?? [];
            const recentUpdates = sortWorkUpdates(
              updates.filter(
                (update) =>
                  update.linkedOrganization.trim().toLowerCase() ===
                  organization.name.trim().toLowerCase(),
              ),
            ).slice(0, 2);
            const sourceCount = relatedPeople.length || organization.sourceCount;

            return (
              <article className="organization-card" key={organization.id}>
                <div className="organization-card-head">
                  <div>
                    <div className="org-badge-row">
                      <span className="org-type-pill">{organization.type || "组织"}</span>
                      <Badge tone={statusTone(normalizeOrganizationPriority(organization))}>
                        {normalizeOrganizationPriority(organization)}
                      </Badge>
                    </div>
                    <h2>{organization.name}</h2>
                  </div>
                  {canEdit && (
                    <details className="update-more-menu compact-more-menu">
                      <summary aria-label={`管理 ${organization.name}`}>···</summary>
                      <div>
                        <button onClick={() => setDrawer({ mode: "edit", source: organization })} type="button">
                          编辑组织
                        </button>
                        <button onClick={() => void confirmDelete(organization)} type="button">
                          删除
                        </button>
                      </div>
                    </details>
                  )}
                </div>

                <p className={organization.note ? "organization-note" : "organization-note muted"}>
                  {organization.note || "暂未记录组织备注。"}
                </p>

                <div className="organization-facts">
                  <span>
                    <strong>{normalizeOrganizationPriority(organization)}</strong>
                    优先级
                  </span>
                  <span>
                    <strong>{sourceCount}</strong>
                    关联人员
                  </span>
                  {organization.websiteUrl ? (
                    <a href={organization.websiteUrl} rel="noreferrer" target="_blank">
                      飞书详情 ↗
                    </a>
                  ) : (
                    <button
                      disabled={!canEdit}
                      onClick={() => setDrawer({ mode: "edit", source: organization })}
                      type="button"
                    >
                      补充飞书详情
                    </button>
                  )}
                </div>

                <div className="organization-section">
                  <span>关联人员</span>
                  {relatedPeople.length ? (
                    <div className="organization-person-list">
                      {relatedPeople.slice(0, 6).map((person) => (
                        <button
                          key={person.id}
                          onClick={() => onNavigate("people", person.id)}
                          type="button"
                        >
                          {person.name}
                        </button>
                      ))}
                      {relatedPeople.length > 6 && <em>+{relatedPeople.length - 6}</em>}
                    </div>
                  ) : (
                    <p>暂无人员直接关联。</p>
                  )}
                </div>

                <div className="organization-section">
                  <span>最近记录</span>
                  {recentUpdates.length ? (
                    <ul className="organization-update-list">
                      {recentUpdates.map((update) => (
                        <li key={update.id}>
                          <small>{formatTimeLabel(update.occurredAt)}</small>
                          <strong>{update.title}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>暂无关联工作记录。</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        canEdit ? (
          <EmptyState
            actionLabel="新增组织"
            message="可以手动添加实验室、研究团队或产业机构，学校层级暂时不用收录。"
            onAction={() => setDrawer({ mode: "create" })}
            title="暂无组织"
          />
        ) : (
          <div className="inline-empty">
            <strong>暂无组织</strong>
            <p>当前还没有可查看的组织记录。</p>
          </div>
        )
      )}

      {drawer && (
        <OrganizationDrawer
          key={`${drawer.mode}-${drawer.source?.id ?? "new"}`}
          mode={drawer.mode}
          onClose={() => setDrawer(null)}
          onCreate={onCreate}
          onPatch={onPatch}
          organization={drawer.source}
        />
      )}
    </div>
  );
}

function OrganizationDrawer({
  mode,
  onClose,
  onCreate,
  onPatch,
  organization,
}: {
  mode: "create" | "edit";
  onClose: () => void;
  onCreate: (organization: Partial<ResearchOrganization>) => Promise<void> | void;
  onPatch: (organizationId: string, organization: Partial<ResearchOrganization>) => Promise<void> | void;
  organization?: ResearchOrganization;
}) {
  const [draft, setDraft] = useState<OrganizationDraft>({
    name: organization?.name ?? "",
    type: organization?.type ?? "实验室",
    priority: normalizeOrganizationPriority(organization ?? {}),
    websiteUrl: organization?.websiteUrl ?? "",
    note: organization?.note ?? "",
  });
  const [saveState, setSaveState] = useState<SaveState>(EMPTY_SAVE_STATE);

  function update<K extends keyof OrganizationDraft>(key: K, value: OrganizationDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!draft.name.trim()) {
      setSaveState({ error: "请先填写组织名称。", saving: false, success: "" });
      return;
    }

    setSaveState({ error: "", saving: true, success: "" });
    try {
      const payload = {
        name: draft.name.trim(),
        type: draft.type.trim() || "实验室",
        priority: normalizeOrganizationPriority({ name: draft.name, priority: draft.priority }),
        websiteUrl: draft.websiteUrl.trim(),
        note: draft.note.trim(),
      };
      if (mode === "edit" && organization) {
        await onPatch(organization.id, payload);
      } else {
        await onCreate(payload);
      }
      setSaveState({ error: "", saving: false, success: "已保存" });
      onClose();
    } catch (error) {
      setSaveState({
        error: error instanceof Error ? error.message : "组织保存失败",
        saving: false,
        success: "",
      });
    }
  }

  return (
    <div className="drawer-layer">
      <button className="drawer-backdrop" aria-label="关闭组织编辑" onClick={onClose} type="button" />
      <aside className="person-drawer update-drawer organization-drawer" aria-label={mode === "edit" ? "编辑组织" : "新增组织"}>
        <div className="drawer-header">
          <div>
            <span>{mode === "edit" ? "编辑已有组织" : "手动添加组织"}</span>
            <h2>{mode === "edit" ? "编辑组织" : "新增组织"}</h2>
          </div>
          <button className="button ghost" onClick={onClose} type="button">
            关闭
          </button>
        </div>
        <div className="drawer-form">
          <Field label="组织名称" onChange={(value) => update("name", value)} value={draft.name} />
          <label className="field-label">
            组织类型
            <select onChange={(event) => update("type", event.target.value)} value={draft.type}>
              {ORGANIZATION_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            优先级
            <select onChange={(event) => update("priority", event.target.value)} value={normalizeOrganizationPriority(draft)}>
              {SIMPLE_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <Field label="飞书详情链接" onChange={(value) => update("websiteUrl", value)} value={draft.websiteUrl} />
          <label className="field-label">
            组织备注 / 当前判断
            <textarea
              onChange={(event) => update("note", event.target.value.slice(0, 600))}
              placeholder="记录这个实验室为什么值得关注、当前跟进重点、相关人物或资料状态。"
              rows={8}
              value={draft.note}
            />
          </label>
          {saveState.error && <p className="form-error">{saveState.error}</p>}
        </div>
        <div className="drawer-actions">
          <button className="button" disabled={saveState.saving} onClick={onClose} type="button">
            取消
          </button>
          <button className="button primary" disabled={saveState.saving} onClick={submit} type="button">
            {saveState.saving ? "保存中..." : "保存组织"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function PeopleView({
  allPeople,
  canEdit,
  exportCsv,
  filteredPeople,
  filters,
  highlightPersonId,
  importCsv,
  importText,
  institutions,
  labs,
  onArchive,
  onDelete,
  onFilterChange,
  onImportTextChange,
  onNavigate,
  onResetData,
  onQuickUpdate,
  onToggleFilter,
  onRemoveAvatar,
  onUploadAvatar,
  priorities,
  roles,
  roleLabels: roleLabelMap,
  topics,
}: {
  allPeople: Person[];
  canEdit: boolean;
  exportCsv: () => void;
  filteredPeople: Person[];
  filters: Filters;
  highlightPersonId: string;
  importCsv: () => void;
  importText: string;
  institutions: string[];
  labs: string[];
  onArchive: (person: Person, archived: boolean) => void;
  onDelete: (person: Person) => void;
  onFilterChange: (filters: Filters) => void;
  onImportTextChange: (value: string) => void;
  onNavigate: (view: View, id?: string) => void;
  onResetData: () => void;
  onQuickUpdate: (person: Person, patch: Partial<Person>, label: string) => void;
  onToggleFilter: (
    key: keyof Omit<Filters, "search" | "showArchived">,
    value: string,
  ) => void;
  onRemoveAvatar: (url: string) => Promise<void> | void;
  onUploadAvatar: (file: File) => Promise<string>;
  priorities: readonly string[];
  roleLabels: Map<string, string>;
  roles: string[];
  topics: string[];
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortMode, setSortMode] = useState<PeopleSortMode>("priority");
  const [editingPersonId, setEditingPersonId] = useState("");
  const [editMode, setEditMode] = useState<CardEditMode>("basic");
  const [openPersonMenuId, setOpenPersonMenuId] = useState("");
  const [cardDraft, setCardDraft] = useState<PersonCardDraft>({
    name: "",
    role: "PhD Student",
    title: "",
    institution: "",
    lab: "",
    avatarUrl: "",
    researchTopics: [],
    shortAssessment: "",
    nextAction: "",
    researchStatus: "待调研",
    priority: "",
    feishuDocUrl: "",
    supervisorNote: "",
  });

  useEffect(() => {
    if (!highlightPersonId || typeof window === "undefined") {
      return;
    }
    window.requestAnimationFrame(() => {
      document
        .getElementById(`person-${highlightPersonId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [highlightPersonId]);

  const filterGroups: Array<{
    key: keyof Omit<Filters, "search" | "showArchived">;
    labels?: Map<string, string>;
    options: string[];
    title: string;
  }> = [
    {
      key: "priorities",
      options: [...priorities],
      title: "优先级",
    },
    {
      key: "institutions",
      options: institutions,
      title: "学校",
    },
    {
      key: "labs",
      options: labs,
      title: "实验室",
    },
    {
      key: "roles",
      labels: roleLabelMap,
      options: roles,
      title: "身份",
    },
    {
      key: "topics",
      options: topics,
      title: "研究方向",
    },
  ];

  const activeFilterCount =
    (filters.search.trim() ? 1 : 0) +
    Number(filters.showArchived) +
    filters.institutions.length +
    filters.labs.length +
    filters.roles.length +
    filters.topics.length +
    filters.priorities.length;

  const sortedPeople =
    sortMode === "priority"
      ? sortPeopleByPriority(filteredPeople)
      : [...filteredPeople].sort((a, b) => {
          if (sortMode === "name") {
            return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
          }
          return b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name, "en", { sensitivity: "base" });
        });
  const displayPeople = sortedPeople;

  const activeFilterItems = [
    ...(filters.search.trim()
      ? [
          {
            label: `搜索：${filters.search.trim()}`,
            onRemove: () => onFilterChange({ ...filters, search: "" }),
          },
        ]
      : []),
    ...filterGroups.flatMap((group) =>
      filters[group.key].map((value) => ({
        label: group.labels?.get(value) ?? value,
        onRemove: () => onToggleFilter(group.key, value),
      })),
    ),
    ...(filters.showArchived
      ? [
          {
            label: "显示已归档",
            onRemove: () => onFilterChange({ ...filters, showArchived: false }),
          },
        ]
      : []),
  ];

  const sortOptions: Array<{
    key: PeopleSortMode;
    label: string;
    note: string;
  }> = [
    {
      key: "createdAt",
      label: "按添加时间",
      note: "最近新增在前",
    },
    {
      key: "name",
      label: "按名字首字母",
      note: "A-Z",
    },
    {
      key: "priority",
      label: "按优先级",
      note: "S → A → B → C",
    },
  ];

  const metricsPeople = allPeople.filter((person) => !person.archived);
  const sCount = metricsPeople.filter((person) => normalizePriority(person.priority) === "S").length;
  const aCount = metricsPeople.filter((person) => normalizePriority(person.priority) === "A").length;
  const bCount = metricsPeople.filter((person) => normalizePriority(person.priority) === "B").length;
  const cCount = metricsPeople.filter((person) => normalizePriority(person.priority) === "C").length;

  function startCardEdit(person: Person, mode: CardEditMode) {
    setOpenPersonMenuId("");
    setEditingPersonId(person.id);
    setEditMode(mode);
    setCardDraft({
      name: person.name,
      role: person.role,
      title: person.title,
      institution: person.institution,
      lab: person.lab,
      avatarUrl: person.avatarUrl,
      researchTopics: person.researchTopics,
      shortAssessment: person.shortAssessment,
      nextAction: person.nextAction,
      researchStatus: normalizeProgressStatus(person.researchStatus),
      priority: normalizePriority(person.priority),
      feishuDocUrl: person.feishuDocUrl,
      supervisorNote: person.supervisorNote,
    });
  }

  function updateCardDraft<K extends keyof PersonCardDraft>(key: K, value: PersonCardDraft[K]) {
    setCardDraft((current) => ({ ...current, [key]: value }));
  }

  function saveCardEdit(person: Person) {
    if (!canEdit) {
      return;
    }

    const patch: Partial<Person> =
      editMode === "priority"
        ? { priority: normalizePriority(cardDraft.priority) }
        : editMode === "avatar"
          ? { avatarUrl: cardDraft.avatarUrl.trim() }
          : editMode === "assessment"
            ? { shortAssessment: cardDraft.shortAssessment.trim().slice(0, 150) }
          : editMode === "progress"
            ? {
                researchStatus: normalizeProgressStatus(cardDraft.researchStatus),
                nextAction: cardDraft.nextAction.trim().slice(0, 240),
              }
          : editMode === "doc"
          ? {
              feishuDocUrl: cardDraft.feishuDocUrl.trim(),
              supervisorNote: cardDraft.supervisorNote.trim(),
              managerNote: cardDraft.supervisorNote.trim(),
            }
          : {
              name: cardDraft.name.trim(),
              role: cardDraft.role,
              title: cardDraft.title.trim(),
              institution: cardDraft.institution.trim(),
              lab: cardDraft.lab.trim(),
              avatarUrl: cardDraft.avatarUrl.trim(),
              researchTopics: cardDraft.researchTopics.filter(Boolean),
              shortAssessment: cardDraft.shortAssessment.trim().slice(0, 150),
              researchStatus: normalizeProgressStatus(cardDraft.researchStatus),
              nextAction: cardDraft.nextAction.trim().slice(0, 240),
            };

    onQuickUpdate(
      person,
      patch,
      editMode === "priority"
        ? "优先级"
        : editMode === "avatar"
          ? "头像"
          : editMode === "assessment"
            ? "简短判断"
            : editMode === "progress"
              ? "当前进展"
        : editMode === "doc"
          ? "人物详情链接"
          : "基础信息",
    );
    setOpenPersonMenuId("");
    setEditingPersonId("");
  }

  function confirmDelete(person: Person) {
    if (typeof window !== "undefined" && !window.confirm(`确认删除 ${person.name}？此操作会从当前名单移除。`)) {
      return;
    }
    onDelete(person);
  }

  return (
    <div className="directory-layout">
      <section className="people-panel">
        <div className="directory-hero">
          <div>
            <p className="eyebrow">人员目录</p>
            <h1>科研对象名单</h1>
            <p>看人物身份、推荐理由和推进状态，完整资料从飞书打开。</p>
          </div>
          <div className="directory-metrics" aria-label="当前结果概览">
            <button
              className={!filters.priorities.length ? "active" : ""}
              onClick={() => {
                if (filters.priorities.length) {
                  onFilterChange({ ...filters, priorities: [] });
                }
              }}
              type="button"
            >
              <strong>{metricsPeople.length}</strong>
              <small>总人数</small>
            </button>
            <button
              className={filters.priorities.includes("S") ? "active" : ""}
              onClick={() => {
                onFilterChange({
                  ...filters,
                  priorities: filters.priorities.includes("S") ? [] : ["S"],
                });
              }}
              type="button"
            >
              <strong>{sCount}</strong>
              <small>S</small>
            </button>
            <button
              className={filters.priorities.includes("A") ? "active" : ""}
              onClick={() => {
                onFilterChange({
                  ...filters,
                  priorities: filters.priorities.includes("A") ? [] : ["A"],
                });
              }}
              type="button"
            >
              <strong>{aCount}</strong>
              <small>A</small>
            </button>
            <button
              className={filters.priorities.includes("B") ? "active" : ""}
              onClick={() => {
                onFilterChange({
                  ...filters,
                  priorities: filters.priorities.includes("B") ? [] : ["B"],
                });
              }}
              type="button"
            >
              <strong>{bCount}</strong>
              <small>B</small>
            </button>
            <button
              className={filters.priorities.includes("C") ? "active" : ""}
              onClick={() => {
                onFilterChange({
                  ...filters,
                  priorities: filters.priorities.includes("C") ? [] : ["C"],
                });
              }}
              type="button"
            >
              <strong>{cCount}</strong>
              <small>C</small>
            </button>
          </div>
        </div>

        <div className="directory-toolbar">
          <div className="search-row">
            <input
              aria-label="搜索人员"
                onChange={(event) =>
                  onFilterChange({ ...filters, search: event.target.value })
                }
                placeholder="搜索姓名、学校、实验室、研究方向、推荐理由或推进状态"
                value={filters.search}
              />
            </div>
          <div className="button-row">
            <button
              aria-expanded={filtersOpen}
              className={filtersOpen ? "button filter-toggle active" : "button filter-toggle"}
              onClick={() => setFiltersOpen((open) => !open)}
              type="button"
            >
              筛选
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
            <button className="button" onClick={exportCsv} type="button">
              导出 CSV
            </button>
            <button
              className="button primary"
              disabled={!canEdit}
              onClick={() => onNavigate("new")}
              type="button"
            >
              新增人员
            </button>
          </div>
        </div>

        <div className="quick-filter-row" aria-label="排序方式">
          <span className="quick-filter-label">排序</span>
          {sortOptions.map((item) => (
            <button
              className={sortMode === item.key ? "quick-filter active" : "quick-filter"}
              key={item.label}
              onClick={() => {
                setSortMode(item.key);
              }}
              type="button"
            >
              <span>{item.label}</span>
              <strong>{item.note}</strong>
            </button>
          ))}
        </div>

        {activeFilterItems.length > 0 && (
          <div className="active-filter-row">
            {activeFilterItems.map((item) => (
              <button
                className="filter-pill"
                key={item.label}
                onClick={item.onRemove}
                type="button"
              >
                {item.label}
                <span aria-hidden="true">×</span>
              </button>
            ))}
            <button
              className="link-button"
              onClick={() => onFilterChange(EMPTY_FILTERS)}
              type="button"
            >
              清空全部
            </button>
          </div>
        )}

        {filtersOpen && (
          <section className="filters-panel compact-filters" aria-label="高级筛选">
            <div className="filter-header">
              <div>
                <strong>高级筛选</strong>
                <span>按机构、身份、方向和优先级缩小名单</span>
              </div>
              <label className="check-row archived-toggle">
                <input
                  checked={filters.showArchived}
                  onChange={(event) =>
                    onFilterChange({ ...filters, showArchived: event.target.checked })
                  }
                  type="checkbox"
                />
                <span>显示已归档</span>
              </label>
            </div>

            <div className="filter-grid">
              {filterGroups.map((group) => (
                <ToggleGroup
                  key={group.key}
                  labels={group.labels}
                  onToggle={(value) => onToggleFilter(group.key, value)}
                  options={group.options}
                  selected={filters[group.key]}
                  title={group.title}
                />
              ))}
            </div>
          </section>
        )}

        <div className="people-card-list">
          {displayPeople.map((person) => {
            const editing = editingPersonId === person.id;
            const visibleTopics = person.researchTopics.slice(0, 3);
            const extraTopicCount = Math.max(person.researchTopics.length - visibleTopics.length, 0);
            const hiddenTopics = person.researchTopics.slice(visibleTopics.length);
            const priority = normalizePriority(person.priority);
            const assessment = displayAssessment(person.shortAssessment);
            const progressText = person.nextAction.trim();
            const progressStatus = normalizeProgressStatus(person.researchStatus);
            const menuOpen = openPersonMenuId === person.id;

            return (
              <article
                className={[
                  "person-list-card",
                  editing ? "editing" : "",
                  highlightPersonId === person.id ? "highlighted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                id={`person-${person.id}`}
                key={person.id}
              >
                <div className="person-list-main">
                  <div className="person-list-identity">
                    <PersonAvatar name={person.name} url={person.avatarUrl} />
                    <div>
                      <div className="person-name-line">
                        <Badge tone={statusTone(priority)}>{priority}</Badge>
                        <strong>{person.name}</strong>
                      </div>
                      <span>
                        {person.title || roleLabels[person.role] || person.role}
                        {person.institution ? ` · ${person.institution}` : ""}
                      </span>
                      {person.lab && <em>{person.lab}</em>}
                      {person.archived && <small>已归档</small>}
                    </div>
                  </div>

                  <div className="person-list-topics">
                    <div className="table-tags">
                      {visibleTopics.map((topic) => (
                        <span key={topic}>{topic}</span>
                      ))}
                      {extraTopicCount > 0 && (
                        <span
                          className="topic-more"
                          data-tooltip={hiddenTopics.join(" / ")}
                          tabIndex={0}
                        >
                          +{extraTopicCount}
                        </span>
                      )}
                      {!visibleTopics.length && <em>未填写研究方向</em>}
                    </div>
                  </div>

                  <div className="assessment-cell">
                    {assessment ? (
                      <p>{assessment}</p>
                    ) : (
                      <button
                        className="link-button subtle-link"
                        disabled={!canEdit}
                        onClick={() => startCardEdit(person, "assessment")}
                        type="button"
                      >
                        + 添加简短判断
                      </button>
                    )}
                    {progressText || progressStatus ? (
                      <div className="person-progress-line">
                        <Badge tone={statusTone(progressStatus)}>{progressStatus}</Badge>
                        {progressText ? (
                          <em>{progressText}</em>
                        ) : canEdit ? (
                          <button
                            className="link-button subtle-link progress-inline-add"
                            onClick={() => startCardEdit(person, "progress")}
                            type="button"
                          >
                            + 添加进展总结
                          </button>
                        ) : null}
                      </div>
                    ) : canEdit ? (
                      <button
                        className="link-button subtle-link progress-add-button"
                        onClick={() => startCardEdit(person, "progress")}
                        type="button"
                      >
                        + 添加当前进展
                      </button>
                    ) : null}
                  </div>

                  <div className="person-list-actions">
                    {person.feishuDocUrl ? (
                      <a className="button primary doc-button" href={person.feishuDocUrl} rel="noreferrer" target="_blank">
                        详情 ↗
                      </a>
                    ) : (
                      <button
                        className="button primary"
                        disabled={!canEdit}
                        onClick={() => startCardEdit(person, "doc")}
                        type="button"
                      >
                        补充详情
                      </button>
                    )}
                    <div className={menuOpen ? "person-more-menu open" : "person-more-menu"}>
                      <button
                        aria-expanded={menuOpen}
                        aria-label={`更多操作 ${person.name}`}
                        className="person-more-trigger"
                        onClick={() => setOpenPersonMenuId(menuOpen ? "" : person.id)}
                        type="button"
                      >
                        ···
                      </button>
                      <div className="person-more-dropdown" hidden={!menuOpen}>
                        <button disabled={!canEdit} onClick={() => startCardEdit(person, "basic")} type="button">
                          编辑基础信息
                        </button>
                        <button disabled={!canEdit} onClick={() => startCardEdit(person, "priority")} type="button">
                          修改优先级
                        </button>
                        <button disabled={!canEdit} onClick={() => startCardEdit(person, "doc")} type="button">
                          修改飞书链接
                        </button>
                        <button disabled={!canEdit} onClick={() => startCardEdit(person, "avatar")} type="button">
                          更换头像
                        </button>
                        <button disabled={!canEdit} onClick={() => startCardEdit(person, "progress")} type="button">
                          编辑当前进展
                        </button>
                        <button
                          disabled={!canEdit}
                          onClick={() => {
                            setOpenPersonMenuId("");
                            onArchive(person, true);
                          }}
                          type="button"
                        >
                          归档
                        </button>
                        <button
                          disabled={!canEdit}
                          onClick={() => {
                            setOpenPersonMenuId("");
                            confirmDelete(person);
                          }}
                          type="button"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {editing && (
                  <div className="person-inline-editor">
                    {editMode === "basic" && (
                      <>
                        <Field label="姓名" value={cardDraft.name} onChange={(value) => updateCardDraft("name", value)} />
                        <label className="field-label">
                          人员类型
                          <select onChange={(event) => updateCardDraft("role", event.target.value)} value={cardDraft.role}>
                            {[...ROLE_OPTIONS, "Researcher"].map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role] || role}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Field label="当前身份" value={cardDraft.title} onChange={(value) => updateCardDraft("title", value)} />
                        <Field label="学校 / 机构" value={cardDraft.institution} onChange={(value) => updateCardDraft("institution", value)} />
                        <Field label="实验室 / 团队" value={cardDraft.lab} onChange={(value) => updateCardDraft("lab", value)} />
                        <div className="inline-editor-wide progress-editor">
                          <ProgressStatusPicker
                            onChange={(value) => updateCardDraft("researchStatus", value)}
                            value={cardDraft.researchStatus}
                          />
                          <Field label="当前进展总结" value={cardDraft.nextAction} onChange={(value) => updateCardDraft("nextAction", value.slice(0, 240))} />
                        </div>
                        <AvatarUploader
                          avatarUrl={cardDraft.avatarUrl}
                          disabled={!canEdit}
                          name={cardDraft.name || person.name}
                          onChange={(url) => updateCardDraft("avatarUrl", url)}
                          onRemove={onRemoveAvatar}
                          onUpload={onUploadAvatar}
                        />
                        <Field
                          label="研究方向标签，分号分隔"
                          value={cardDraft.researchTopics.join("; ")}
                          onChange={(value) => updateCardDraft("researchTopics", splitList(value))}
                        />
                        <label className="field-label inline-editor-wide">
                          简短判断
                          <textarea
                            maxLength={150}
                            onChange={(event) => updateCardDraft("shortAssessment", event.target.value)}
                            placeholder="建议 80-150 个中文字符，说明为什么此人值得关注。"
                            value={cardDraft.shortAssessment}
                          />
                        </label>
                      </>
                    )}

                    {editMode === "priority" && (
                      <label className="field-label">
                        优先级
                        <select onChange={(event) => updateCardDraft("priority", event.target.value)} value={cardDraft.priority}>
                          {SIMPLE_PRIORITIES.map((priorityOption) => (
                            <option key={priorityOption} value={priorityOption}>
                              {priorityOption}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {editMode === "avatar" && (
                      <div className="inline-editor-wide">
                        <AvatarUploader
                          avatarUrl={cardDraft.avatarUrl}
                          disabled={!canEdit}
                          name={cardDraft.name || person.name}
                          onChange={(url) => updateCardDraft("avatarUrl", url)}
                          onRemove={onRemoveAvatar}
                          onUpload={onUploadAvatar}
                        />
                      </div>
                    )}

                    {editMode === "assessment" && (
                      <label className="field-label inline-editor-wide">
                        简短判断
                        <textarea
                          autoFocus
                          maxLength={150}
                          onChange={(event) => updateCardDraft("shortAssessment", event.target.value)}
                          placeholder="建议 80-150 个中文字符，说明为什么此人值得关注。"
                          value={cardDraft.shortAssessment}
                        />
                      </label>
                    )}

                    {editMode === "progress" && (
                      <div className="inline-editor-wide progress-editor">
                        <ProgressStatusPicker
                          onChange={(value) => updateCardDraft("researchStatus", value)}
                          value={cardDraft.researchStatus}
                        />
                        <Field
                          label="当前进展总结"
                          value={cardDraft.nextAction}
                          onChange={(value) => updateCardDraft("nextAction", value.slice(0, 240))}
                        />
                      </div>
                    )}

                    {editMode === "doc" && (
                      <>
                        <Field
                          label="飞书人物详情链接"
                          value={cardDraft.feishuDocUrl}
                          onChange={(value) => updateCardDraft("feishuDocUrl", value)}
                        />
                        <label className="field-label inline-editor-wide">
                          上级批注
                          <textarea
                            onChange={(event) => updateCardDraft("supervisorNote", event.target.value)}
                            placeholder="可记录一句上级批注，例如：先保留；本周优先看；暂缓。"
                            value={cardDraft.supervisorNote}
                          />
                        </label>
                      </>
                    )}

                    <div className="inline-editor-actions">
                      <button className="button primary" onClick={() => saveCardEdit(person)} type="button">
                        保存
                      </button>
                      <button
                        className="button"
                        onClick={() => {
                          setOpenPersonMenuId("");
                          setEditingPersonId("");
                        }}
                        type="button"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {!displayPeople.length && (
            <div className="inline-empty">
              <strong>没有匹配的人员。</strong>
              <p>减少筛选条件或清空筛选后再试。</p>
            </div>
          )}
        </div>

        <details className="import-panel compact-import">
          <summary>
            <span>
              <strong>CSV 批量导入与重置</strong>
              <small>仅在集中维护数据时展开</small>
            </span>
          </summary>
          <p>
            支持字段：name, role, title, institution, lab, research_topics, priority,
            short_assessment, feishu_doc_url, supervisor_note, owner
          </p>
          <textarea
            onChange={(event) => onImportTextChange(event.target.value)}
            placeholder={
              "name,role,title,institution,lab,research_topics,priority,short_assessment,feishu_doc_url,supervisor_note\n新人员,PhD Student,博士生,Boston University,H2X Lab,Embodied AI; VLA,S,此人方向贴近具身智能评测，建议先看代表项目和公开代码。,https://example.feishu.cn/docx/new,请上级确认是否纳入重点名单"
            }
            value={importText}
          />
          <div className="button-row">
            <button className="button" disabled={!canEdit || !importText.trim()} onClick={importCsv} type="button">
              导入 CSV
            </button>
            <button className="button danger" onClick={onResetData} type="button">
              恢复种子数据
            </button>
          </div>
        </details>
      </section>
    </div>
  );
}

function PersonDocumentNotice({
  onNavigate,
  person,
}: {
  onNavigate: (view: View, id?: string) => void;
  person: Person;
}) {
  return (
    <section className="empty-state document-notice">
      <p className="eyebrow">人物资料</p>
      <h1>{person.name}</h1>
      <p>网页不再维护完整人物详情。请从飞书查看完整调研文档，人员目录只保留名单、简短判断和优先级。</p>
      <div className="button-row">
        {person.feishuDocUrl ? (
          <a className="button primary" href={person.feishuDocUrl} rel="noreferrer" target="_blank">
            详情 ↗
          </a>
        ) : (
          <button className="button primary" onClick={() => onNavigate("edit", person.id)} type="button">
            补充人物详情
          </button>
        )}
        <button className="button" onClick={() => onNavigate("people")} type="button">
          返回人员目录
        </button>
      </div>
    </section>
  );
}

function PersonForm({
  canEdit,
  currentUser,
  onCancel,
  onRemoveAvatar,
  onSave,
  onUploadAvatar,
  person,
  title,
}: {
  canEdit: boolean;
  currentUser: { name: string; role: UserRole };
  onCancel: () => void;
  onRemoveAvatar: (url: string) => Promise<void> | void;
  onSave: (person: Person) => Promise<void> | void;
  onUploadAvatar: (file: File) => Promise<string>;
  person: Person;
  title: string;
}) {
  const [draft, setDraft] = useState(person);
  const [saveState, setSaveState] = useState<SaveState>(EMPTY_SAVE_STATE);
  const canSave = Boolean(draft.name.trim());

  function update<K extends keyof Person>(key: K, value: Person[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!canSave || saveState.saving) {
      return;
    }

    const fallback = initialPerson(currentUser);
    setSaveState({ error: "", saving: true, success: "" });
    try {
      await onSave({
        ...fallback,
        ...draft,
        id: draft.id || slugify(draft.name),
        name: draft.name.trim(),
        degree: draft.degree.trim(),
        title: (draft.title || draft.role).trim(),
        institution: draft.institution.trim(),
        lab: draft.lab.trim(),
        department: draft.department.trim(),
        location: draft.location.trim(),
        contacts: draft.contacts ?? [],
        feishuDocUrl: draft.feishuDocUrl.trim(),
        shortAssessment: draft.shortAssessment.trim().slice(0, 150),
        supervisorNote: draft.supervisorNote.trim(),
        managerNote: draft.supervisorNote.trim(),
        researchDocument: "",
        researchTopics: draft.researchTopics.filter(Boolean),
        secondaryTopics: [],
        flags: draft.flags.filter(Boolean),
        tags: draft.tags.filter(Boolean),
        priority: normalizePriority(draft.priority),
        researchStatus: normalizeProgressStatus(draft.researchStatus),
        contactStatus: draft.contactStatus.trim() || "暂不联系",
        owner: draft.owner.trim() || currentUser.name,
        nextAction: draft.nextAction.trim(),
        followUpDate: draft.followUpDate,
        isStarred: false,
      });
      setSaveState({ error: "", saving: false, success: "已保存" });
    } catch (error) {
      setSaveState({
        error: error instanceof Error ? error.message : "保存失败",
        saving: false,
        success: "",
      });
    }
  }

  if (!canEdit) {
    return (
      <EmptyState
        actionLabel="返回人员目录"
        message="当前角色没有新增或编辑核心资料的权限，可以切换为管理员或编辑者。"
        onAction={onCancel}
        title="没有编辑权限"
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">新增 / 编辑人员</p>
          <h1>{title}</h1>
          <p>网页只保存名单、简短判断、优先级和飞书入口，完整调研内容放在飞书里。</p>
        </div>
        <div className="button-row">
          <button className="button" onClick={onCancel} type="button">
            取消
          </button>
          <button className="button primary" disabled={!canSave || saveState.saving} onClick={save} type="button">
            {saveState.saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
      {!canSave && <p className="form-hint">至少填写姓名后才能保存。</p>}
      {saveState.error && <p className="form-error">{saveState.error}</p>}

      <form className="edit-form" onSubmit={(event) => event.preventDefault()}>
        <section className="form-section">
          <h2>1. 基础信息</h2>
          <AvatarUploader
            avatarUrl={draft.avatarUrl}
            disabled={!canEdit}
            name={draft.name || "新人员"}
            onChange={(url) => update("avatarUrl", url)}
            onRemove={onRemoveAvatar}
            onUpload={onUploadAvatar}
          />
          <div className="form-grid">
            <Field label="姓名（必填）" value={draft.name} onChange={(value) => update("name", value)} />
            <Field label="学位后缀" value={draft.degree} onChange={(value) => update("degree", value)} />
            <label className="field-label">
              人员类型
              <select onChange={(event) => update("role", event.target.value)} value={draft.role}>
                {[...ROLE_OPTIONS, "Researcher"].map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role] || role}
                  </option>
                ))}
              </select>
            </label>
            <Field label="当前身份 / 职位" value={draft.title} onChange={(value) => update("title", value)} />
            <Field label="学校 / 公司 / 机构" value={draft.institution} onChange={(value) => update("institution", value)} />
            <Field label="实验室 / 团队 / Group" value={draft.lab} onChange={(value) => update("lab", value)} />
            <Field label="院系" value={draft.department} onChange={(value) => update("department", value)} />
            <Field label="地区" value={draft.location} onChange={(value) => update("location", value)} />
            <Field
              label="研究方向标签，分号分隔，列表最多展示前三个"
              value={draft.researchTopics.join("; ")}
              onChange={(value) => update("researchTopics", splitList(value))}
            />
            <div className="full-field progress-editor">
              <ProgressStatusPicker
                onChange={(value) => update("researchStatus", value)}
                value={draft.researchStatus}
              />
              <Field
                label="当前进展总结"
                value={draft.nextAction}
                onChange={(value) => update("nextAction", value.slice(0, 240))}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>2. 简短判断与优先级</h2>
          <label className="field-label full-field">
            简短判断
            <textarea
              maxLength={150}
              onChange={(event) => update("shortAssessment", event.target.value)}
              placeholder="建议 80-150 个中文字符，说明为什么此人值得关注、是否值得进入重点名单。"
              value={draft.shortAssessment}
            />
          </label>
          <div className="form-grid">
            <label className="field-label">
              优先级
              <select onChange={(event) => update("priority", event.target.value)} value={normalizePriority(draft.priority)}>
                {SIMPLE_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field-label full-field">
            上级批注
            <textarea
              onChange={(event) => update("supervisorNote", event.target.value)}
              placeholder="可选。用于记录一句上级批注，例如：先保留；本周优先看；暂缓。"
              value={draft.supervisorNote}
            />
          </label>
        </section>

        <section className="form-section">
          <h2>3. 飞书文档链接</h2>
          <Field
            label="飞书调研文档 URL"
            value={draft.feishuDocUrl}
            onChange={(value) => update("feishuDocUrl", value)}
          />
        </section>
      </form>
    </div>
  );
}

function ProgressStatusPicker({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const normalized = normalizeProgressStatus(value);

  return (
    <div className="progress-status-picker">
      <span>当前进展状态</span>
      <div className="progress-status-group">
        {PROGRESS_STATUSES.map((status) => (
          <button
            className={normalized === status ? "active" : ""}
            key={status}
            onClick={() => onChange(status)}
            type="button"
          >
            {status}
          </button>
        ))}
      </div>
      <div className="progress-status-group special">
        {SPECIAL_PROGRESS_STATUSES.map((status) => (
          <button
            className={normalized === status ? "active" : ""}
            key={status}
            onClick={() => onChange(status)}
            type="button"
          >
            {status}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="field-label">
      {label}
      <input onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  );
}

function EmptyState({
  actionLabel,
  message,
  onAction,
  title,
}: {
  actionLabel: string;
  message: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <section className="empty-state">
      <h1>{title}</h1>
      <p>{message}</p>
      <button className="button primary" onClick={onAction} type="button">
        {actionLabel}
      </button>
    </section>
  );
}
