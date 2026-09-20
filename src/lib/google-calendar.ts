export class GoogleCalendarAuthError extends Error {
  constructor() {
    super("Google Calendar access token is invalid or expired");
    this.name = "GoogleCalendarAuthError";
  }
}

export type CalendarEvent = {
  id: string;
  title: string;
  location: string | null;
  /** null for all-day events, which don't carry a specific time. */
  start: Date | null;
  end: Date | null;
  allDay: boolean;
  htmlLink: string | null;
};

type GoogleEventTime = {
  dateTime?: string;
  date?: string;
};

type GoogleEvent = {
  id: string;
  summary?: string;
  location?: string;
  status?: string;
  htmlLink?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
};

type GoogleEventsResponse = {
  items?: GoogleEvent[];
};

/**
 * Fetches events on the user's primary calendar within [timeMin, timeMax).
 * Cancelled events and events without a start time are dropped.
 */
export async function listUpcomingEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  if (response.status === 401) {
    throw new GoogleCalendarAuthError();
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as GoogleEventsResponse;

  return (data.items ?? [])
    .filter((event) => event.status !== "cancelled" && (event.start?.dateTime || event.start?.date))
    .map((event) => {
      const allDay = Boolean(event.start?.date && !event.start?.dateTime);
      return {
        id: event.id,
        title: event.summary?.trim() || "(No title)",
        location: event.location?.trim() || null,
        start: event.start?.dateTime
          ? new Date(event.start.dateTime)
          : event.start?.date
            ? new Date(`${event.start.date}T00:00:00`)
            : null,
        end: event.end?.dateTime
          ? new Date(event.end.dateTime)
          : event.end?.date
            ? new Date(`${event.end.date}T00:00:00`)
            : null,
        allDay,
        htmlLink: event.htmlLink ?? null,
      };
    });
}
