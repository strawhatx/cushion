export type TravelTimeResult = {
  minutes: number;
};

type Coordinates = [lon: number, lat: number];

// Free-tier ORS geocoding has no documented per-key limit, but addresses repeat
// a lot across a week of meetings (same office, same client site), so cache
// resolved coordinates for the life of the server process.
const geocodeCache = new Map<string, Coordinates | null>();

async function geocode(address: string): Promise<Coordinates | null> {
  const cacheKey = address.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)!;

  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) {
    console.error("[travel-time] OPENROUTESERVICE_API_KEY is not set");
    return null;
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    text: address,
    size: "1",
  });

  let coordinates: Coordinates | null = null;
  try {
    const response = await fetch(`https://api.openrouteservice.org/geocode/search?${params.toString()}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      const first = data.features?.[0];
      if (first?.geometry?.coordinates) {
        coordinates = first.geometry.coordinates as Coordinates;
      }
    } else {
      console.error("[travel-time] geocoding failed", response.status, await response.text());
    }
  } catch (error) {
    console.error("[travel-time] geocoding request failed", error);
  }

  geocodeCache.set(cacheKey, coordinates);
  return coordinates;
}

/**
 * Real driving travel time between two addresses, via OpenRouteService
 * (geocode both addresses, then a 2x2 matrix request for the driving leg).
 * Returns null whenever the trip can't be resolved (bad/ungeocodable address,
 * API error, etc.) so callers can skip the conflict check for that leg
 * instead of erroring.
 *
 * Note: unlike Google's Distance Matrix, ORS's free routing profiles don't
 * model live/time-of-day traffic — this is a typical-conditions estimate.
 */
export async function getDrivingTravelTime(origin: string, destination: string): Promise<TravelTimeResult | null> {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) {
    console.error("[travel-time] OPENROUTESERVICE_API_KEY is not set");
    return null;
  }

  const [originCoords, destinationCoords] = await Promise.all([geocode(origin), geocode(destination)]);
  if (!originCoords || !destinationCoords) return null;

  let response: Response;
  try {
    response = await fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations: [originCoords, destinationCoords],
        sources: [0],
        destinations: [1],
        metrics: ["duration"],
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[travel-time] matrix request failed", error);
    return null;
  }

  if (!response.ok) {
    console.error("[travel-time] matrix non-OK response", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const seconds = data.durations?.[0]?.[0];
  if (typeof seconds !== "number") return null;

  return { minutes: Math.ceil(seconds / 60) };
}
