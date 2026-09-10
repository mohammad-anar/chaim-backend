/**
 * Calculates the distance between two coordinates in kilometers using the Haversine formula.
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Average walking speed used across all distance calculations (km/h). */
const WALKING_SPEED_KMH = 4.5;

/**
 * Converts a distance in km to walking minutes using a fixed walking speed.
 */
export const kmToWalkingMinutes = (km: number): number =>
  Math.round((km / WALKING_SPEED_KMH) * 60);

/**
 * Returns the walking minutes from an apartment's coordinates to a given destination.
 * Returns null when the apartment has no lat/lng stored.
 */
export const walkingMinutesToDestination = (
  apt: { lat?: number | null; lng?: number | null },
  destLat: number,
  destLng: number,
): number | null => {
  if (apt.lat == null || apt.lng == null) return null;
  const km = calculateDistance(apt.lat, apt.lng, destLat, destLng);
  return kmToWalkingMinutes(km);
};

/**
 * Returns the walking minutes from an apartment's coordinates to its neighborhood center.
 * Priority:
 * 1. Directly stored neighborhoodWalkingMinutes
 * 2. Calculated from stored neighborhoodLat & neighborhoodLng
 * 3. Fallback to NEIGHBORHOOD_CENTROIDS map (case-insensitive)
 * Returns null if no coordinates or time could be determined.
 */
export const walkingMinutesToNeighborhood = (
  apt: {
    lat?: number | null;
    lng?: number | null;
    neighborhood?: string | null;
    neighborhoodLat?: number | null;
    neighborhoodLng?: number | null;
    neighborhoodWalkingMinutes?: number | null;
  },
  centroids?: Record<string, { lat: number; lng: number }>,
): number | null => {
  // 1. Explicit walking minutes directly set
  if (apt.neighborhoodWalkingMinutes != null && !isNaN(Number(apt.neighborhoodWalkingMinutes))) {
    return Number(apt.neighborhoodWalkingMinutes);
  }

  // 2. Owner / Frontend supplied neighborhood coordinates
  if (
    apt.lat != null &&
    apt.lng != null &&
    apt.neighborhoodLat != null &&
    apt.neighborhoodLng != null
  ) {
    const km = calculateDistance(apt.lat, apt.lng, apt.neighborhoodLat, apt.neighborhoodLng);
    return kmToWalkingMinutes(km);
  }

  // 3. Fallback to predefined centroids map
  if (apt.lat != null && apt.lng != null && apt.neighborhood && centroids) {
    const norm = apt.neighborhood.trim().toLowerCase();
    const match =
      centroids[apt.neighborhood] ??
      centroids[norm] ??
      Object.entries(centroids).find(([k]) => k.trim().toLowerCase() === norm)?.[1];

    if (match) {
      const km = calculateDistance(apt.lat, apt.lng, match.lat, match.lng);
      return kmToWalkingMinutes(km);
    }
  }

  return null;
};
