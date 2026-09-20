import type { CalendarEvent } from "./google-calendar";
import { isPhysicalLocation } from "./location";
import { getDrivingTravelTime } from "./travel-time";

export const TRAVEL_BUFFER_MINUTES = 5;

export type TravelLeg = {
  from: CalendarEvent;
  to: CalendarEvent;
  availableMinutes: number;
  neededMinutes: number;
  travelMinutes: number;
  trafficAware: boolean;
  isConflict: boolean;
};

export type DayTimeline = {
  dateKey: string;
  label: string;
  events: CalendarEvent[];
  /** Keyed by the id of the earlier event in the pair. */
  legs: Map<string, TravelLeg>;
};

function dayKey(date: Date): string {
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Pairs up consecutive timed events that both have a real physical location,
 * looks up real driving travel time between them, and flags any pair where
 * the calendar gap is shorter than travel time + a small buffer.
 */
export async function computeTravelLegs(events: CalendarEvent[]): Promise<TravelLeg[]> {
  const timed = events
    .filter((event) => !event.allDay && event.start && event.end)
    .sort((a, b) => a.start!.getTime() - b.start!.getTime());

  const candidatePairs: [CalendarEvent, CalendarEvent][] = [];
  for (let i = 0; i < timed.length - 1; i++) {
    const from = timed[i];
    const to = timed[i + 1];
    if (isPhysicalLocation(from.location) && isPhysicalLocation(to.location)) {
      candidatePairs.push([from, to]);
    }
  }

  const results = await Promise.all(
    candidatePairs.map(async ([from, to]) => {
      const availableMinutes = Math.round((to.start!.getTime() - from.end!.getTime()) / 60000);

      const travel = await getDrivingTravelTime(from.location!, to.location!, from.end!);
      if (!travel) return null;

      const neededMinutes = travel.minutes + TRAVEL_BUFFER_MINUTES;

      const leg: TravelLeg = {
        from,
        to,
        availableMinutes,
        neededMinutes,
        travelMinutes: travel.minutes,
        trafficAware: travel.trafficAware,
        isConflict: availableMinutes < neededMinutes,
      };
      return leg;
    })
  );

  return results.filter((leg): leg is TravelLeg => leg !== null);
}

/** Groups events by calendar day and attaches the travel leg starting at each event, for rendering. */
export function buildDayTimelines(events: CalendarEvent[], legs: TravelLeg[]): DayTimeline[] {
  const legsByFromId = new Map(legs.map((leg) => [leg.from.id, leg]));

  const sorted = [...events].sort((a, b) => {
    const aTime = a.start?.getTime() ?? 0;
    const bTime = b.start?.getTime() ?? 0;
    return aTime - bTime;
  });

  const days = new Map<string, DayTimeline>();
  for (const event of sorted) {
    if (!event.start) continue;
    const key = dayKey(event.start);
    if (!days.has(key)) {
      days.set(key, { dateKey: key, label: dayLabel(event.start), events: [], legs: new Map() });
    }
    const day = days.get(key)!;
    day.events.push(event);
    const leg = legsByFromId.get(event.id);
    if (leg) day.legs.set(event.id, leg);
  }

  return Array.from(days.values());
}
