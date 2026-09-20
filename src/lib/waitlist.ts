const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_HEADERS = ["Timestamp", "Email", "Source"];
const ALLOWED_SOURCES = new Set(["waitlist", "footer", "post_export"]);

function waitlistHeaders() {
  const fromEnv = (process.env.WAITLIST_HEADERS || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_HEADERS;
}

export async function submitWaitlistEmail(input: {
  email: string;
  website?: string;
  source?: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (input.website) return { ok: true };

  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) {
    return { ok: false, status: 503, error: "Waitlist is not connected yet." };
  }

  const email = String(input.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  const source = ALLOWED_SOURCES.has(String(input.source || ""))
    ? String(input.source)
    : "waitlist";
  const payload = {
    email,
    project: (process.env.WAITLIST_PROJECT || "Cushion").trim(),
    source,
    headers: waitlistHeaders(),
    values: {
      Timestamp: new Date().toISOString(),
      Email: email,
      Source: source,
    },
    ...(process.env.WAITLIST_SECRET ? { secret: process.env.WAITLIST_SECRET } : {}),
  };

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "User-Agent": "cushion-waitlist",
      },
      body: JSON.stringify(payload),
      redirect: "manual",
    });

    const status = response.status;
    const redirected = status === 0 || (status >= 300 && status < 400) || status === 405;
    if (!response.ok && !redirected) {
      console.error("[waitlist] sheets webhook failed", status);
      return {
        ok: false,
        status: 502,
        error: status === 401
          ? "The waitlist connection needs to be redeployed."
          : "Could not save that address. Try again in a moment.",
      };
    }
  } catch (error) {
    console.error("[waitlist] sheets webhook unreachable", error);
    return { ok: false, status: 502, error: "Could not reach the waitlist sheet." };
  }

  return { ok: true };
}