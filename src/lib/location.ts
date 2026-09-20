const VIRTUAL_HOSTS = [
  "zoom.us",
  "meet.google.com",
  "teams.microsoft.com",
  "webex.com",
  "whereby.com",
  "gotomeeting.com",
  "chime.aws",
  "meet.jit.si",
];

const VIRTUAL_EXACT_NAMES = new Set([
  "zoom",
  "google meet",
  "google hangout",
  "hangout",
  "microsoft teams",
  "teams",
  "skype",
  "webex",
  "phone",
  "phone call",
  "conference call",
  "virtual",
  "remote",
  "online",
]);

/**
 * Decides whether an event's free-text `location` field looks like a real,
 * geocodable physical address rather than a video-call link or empty string.
 */
export function isPhysicalLocation(location: string | null | undefined): boolean {
  if (!location) return false;
  const trimmed = location.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://")) return false;
  if (VIRTUAL_HOSTS.some((host) => lower.includes(host))) return false;
  if (VIRTUAL_EXACT_NAMES.has(lower)) return false;

  return true;
}
