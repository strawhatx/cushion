import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { GoogleCalendarAuthError, listUpcomingEvents, type CalendarEvent } from "@/lib/google-calendar";
import { buildDayTimelines, computeTravelLegs, type DayTimeline, type TravelLeg } from "@/lib/conflicts";
import { isPhysicalLocation } from "@/lib/location";
import RefreshOnInterval from "./RefreshOnInterval";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

const DAYS_AHEAD = 7;
const POLL_INTERVAL_MINUTES = 15;

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.error === "RefreshAccessTokenError" || !session.accessToken) {
    return <ReauthRequired />;
  }

  let events: CalendarEvent[] = [];
  let legs: TravelLeg[] = [];
  let loadError: string | null = null;

  try {
    const timeMin = new Date();
    const timeMax = new Date(timeMin.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
    events = await listUpcomingEvents(session.accessToken, timeMin, timeMax);
    legs = await computeTravelLegs(events);
  } catch (error) {
    if (error instanceof GoogleCalendarAuthError) {
      return <ReauthRequired />;
    }
    console.error("[dashboard] failed to load calendar data", error);
    loadError = "Couldn't load your calendar right now. Try refreshing in a moment.";
  }

  const days = buildDayTimelines(events, legs);
  const conflictCount = legs.filter((leg) => leg.isConflict).length;

  return (
    <main className={styles.page}>
      <RefreshOnInterval minutes={POLL_INTERVAL_MINUTES} />
      <header className={styles.topBar}>
        <div className={styles.mark}>CUSHION</div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className={styles.signOutButton} type="submit">
            Sign out
          </button>
        </form>
      </header>

      <div className={styles.wrap}>
        <h1>Next {DAYS_AHEAD} days</h1>
        <p className={styles.summary}>
          {conflictCount > 0
            ? `${conflictCount} ${conflictCount === 1 ? "gap" : "gaps"} flagged — not enough real travel time.`
            : "No tight gaps found between your located events."}
          {" "}Rechecks automatically every {POLL_INTERVAL_MINUTES} minutes.
        </p>

        {loadError && <p className={styles.errorBanner}>{loadError}</p>}

        {!loadError && days.length === 0 && (
          <p className={styles.empty}>No events on your calendar in the next {DAYS_AHEAD} days.</p>
        )}

        {days.map((day) => (
          <DaySection key={day.dateKey} day={day} />
        ))}
      </div>
    </main>
  );
}

function DaySection({ day }: { day: DayTimeline }) {
  return (
    <section className={styles.daySection}>
      <h2 className={styles.dayLabel}>{day.label}</h2>
      <div className={styles.timeline}>
        {day.events.map((event, index) => {
          const leg = day.legs.get(event.id);
          return (
            <div key={event.id}>
              <EventRow event={event} />
              {leg && <LegConnector leg={leg} />}
              {!leg && index < day.events.length - 1 && <PlainConnector to={day.events[index + 1]} from={event} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const timeLabel = event.allDay
    ? "All day"
    : `${formatTime(event.start)} – ${formatTime(event.end)}`;

  return (
    <div className={styles.eventRow}>
      <div className={styles.node} />
      <div className={styles.eventContent}>
        <div className={styles.eventTime}>{timeLabel}</div>
        <div className={styles.eventTitle}>{event.title}</div>
        {event.location && <div className={styles.eventLocation}>{event.location}</div>}
      </div>
    </div>
  );
}

function LegConnector({ leg }: { leg: TravelLeg }) {
  return (
    <div className={`${styles.connector} ${leg.isConflict ? styles.connectorConflict : styles.connectorOk}`}>
      <div className={styles.connectorRail} />
      <div className={styles.connectorContent}>
        {leg.isConflict ? (
          <>
            <span className={styles.warningIcon} aria-hidden="true">⚠</span>
            <span>
              <strong>{leg.neededMinutes} min needed</strong>, only {leg.availableMinutes} min available
              {" "}({leg.travelMinutes} min drive)
            </span>
          </>
        ) : (
          <span>
            {leg.travelMinutes} min drive needed, {leg.availableMinutes} min available — you&apos;re fine
          </span>
        )}
      </div>
    </div>
  );
}

/** Shown between events we didn't run a travel check on (virtual or missing location). */
function PlainConnector({ from, to }: { from: CalendarEvent; to: CalendarEvent }) {
  const reason = !isPhysicalLocation(from.location) && !isPhysicalLocation(to.location)
    ? "no physical location on either event"
    : !isPhysicalLocation(from.location)
      ? `no physical location for "${from.title}"`
      : `no physical location for "${to.title}"`;

  return (
    <div className={styles.connector}>
      <div className={styles.connectorRail} />
      <div className={styles.connectorContentMuted}>Not checked — {reason}</div>
    </div>
  );
}

function ReauthRequired() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <h1>Reconnect your Google account</h1>
        <p className={styles.summary}>
          Your calendar access expired or was revoked. Sign in again to keep checking for travel conflicts.
        </p>
        <a className={styles.signOutButton} href="/login">
          Go to sign in
        </a>
      </div>
    </main>
  );
}

function formatTime(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
