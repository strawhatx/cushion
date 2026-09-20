export type TravelTimeResult = {
  minutes: number;
  trafficAware: boolean;
};

type DistanceMatrixElement = {
  status: string;
  duration?: { value: number };
  duration_in_traffic?: { value: number };
};

type DistanceMatrixResponse = {
  status: string;
  rows?: { elements: DistanceMatrixElement[] }[];
};

/**
 * Real driving travel time between two addresses, traffic-aware when the
 * departure time is in the future. Returns null whenever the trip can't be
 * resolved (bad/ungeocodable address, API error, etc.) so callers can skip
 * the conflict check for that leg instead of erroring.
 */
export async function getDrivingTravelTime(
  origin: string,
  destination: string,
  departureTime: Date
): Promise<TravelTimeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("[travel-time] GOOGLE_MAPS_API_KEY is not set");
    return null;
  }

  // Distance Matrix rejects departure times in the past; "now" is the floor.
  const departureSeconds = Math.max(
    Math.floor(departureTime.getTime() / 1000),
    Math.floor(Date.now() / 1000)
  );

  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: "driving",
    units: "imperial",
    departure_time: String(departureSeconds),
    traffic_model: "best_guess",
    key: apiKey,
  });

  let response: Response;
  try {
    response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
      { cache: "no-store" }
    );
  } catch (error) {
    console.error("[travel-time] request failed", error);
    return null;
  }

  if (!response.ok) {
    console.error("[travel-time] non-OK response", response.status);
    return null;
  }

  const data = (await response.json()) as DistanceMatrixResponse;
  if (data.status !== "OK") {
    console.error("[travel-time] API status", data.status);
    return null;
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    // Most commonly NOT_FOUND / ZERO_RESULTS for an address that can't be geocoded.
    return null;
  }

  const seconds = element.duration_in_traffic?.value ?? element.duration?.value;
  if (seconds == null) return null;

  return {
    minutes: Math.ceil(seconds / 60),
    trafficAware: element.duration_in_traffic != null,
  };
}
