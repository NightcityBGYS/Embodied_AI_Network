export const APP_TIME_ZONE = "Asia/Shanghai";

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: APP_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  const hour = partMap.get("hour") === "24" ? "00" : partMap.get("hour") ?? "00";

  return {
    day: partMap.get("day") ?? "01",
    hour,
    minute: partMap.get("minute") ?? "00",
    month: partMap.get("month") ?? "01",
    year: partMap.get("year") ?? "1970",
  };
}

export function nowStamp(date = new Date()) {
  const parts = zonedParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export function todayDate(date = new Date()) {
  return nowStamp(date).slice(0, 10);
}

export function formatDate(value: unknown, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return fallback;
  return todayDate(date);
}

export function formatStamp(value: unknown, fallback = "") {
  if (!value) return fallback;
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) &&
    !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value.trim())
  ) {
    return value.slice(0, 16);
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return fallback;
  return nowStamp(date);
}

export function toSupabaseTimestamp(value = nowStamp()) {
  const trimmed = value.trim();
  if (!trimmed) return toSupabaseTimestamp(nowStamp());
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) return trimmed;

  const dateTime = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (dateTime) {
    const [, date, hour, minute, second = "00"] = dateTime;
    return `${date}T${hour}:${minute}:${pad(Number(second))}+08:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00+08:00`;
  }

  return trimmed;
}
