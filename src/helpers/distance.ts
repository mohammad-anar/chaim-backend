import { NEIGHBORHOOD_CENTROIDS } from "../config/neighborhoodCentroids.js";

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
export const WALKING_SPEED_KMH = 4.5;

/**
 * Converts a distance in km to walking minutes using a fixed walking speed.
 */
export const kmToWalkingMinutes = (km: number): number => {
  if (km <= 0) return 0;
  const minutes = Math.round((km / WALKING_SPEED_KMH) * 60);
  return minutes === 0 ? 1 : minutes;
};

/**
 * Resolves the best available coordinates { lat, lng } for an apartment.
 * Priority:
 * 1. Explicit lat & lng
 * 2. Stored neighborhoodLat & neighborhoodLng
 * 3. Fallback to NEIGHBORHOOD_CENTROIDS by neighborhood or city name
 */
export const getApartmentCoordinates = (apt: {
  lat?: number | null;
  lng?: number | null;
  neighborhoodLat?: number | null;
  neighborhoodLng?: number | null;
  neighborhood?: string | null;
  city?: string | null;
}): { lat: number; lng: number } | null => {
  if (!apt) return null;

  if (
    apt.lat != null &&
    apt.lng != null &&
    !isNaN(Number(apt.lat)) &&
    !isNaN(Number(apt.lng))
  ) {
    return { lat: Number(apt.lat), lng: Number(apt.lng) };
  }

  if (
    apt.neighborhoodLat != null &&
    apt.neighborhoodLng != null &&
    !isNaN(Number(apt.neighborhoodLat)) &&
    !isNaN(Number(apt.neighborhoodLng))
  ) {
    return { lat: Number(apt.neighborhoodLat), lng: Number(apt.neighborhoodLng) };
  }

  const neighNorm = (apt.neighborhood || "").trim().toLowerCase();
  const cityNorm = (apt.city || "").trim().toLowerCase();

  const centroid =
    NEIGHBORHOOD_CENTROIDS[apt.neighborhood || ""] ??
    (neighNorm ? NEIGHBORHOOD_CENTROIDS[neighNorm] : undefined) ??
    NEIGHBORHOOD_CENTROIDS[apt.city || ""] ??
    (cityNorm ? NEIGHBORHOOD_CENTROIDS[cityNorm] : undefined) ??
    Object.entries(NEIGHBORHOOD_CENTROIDS).find(([k]) => {
      const kLower = k.toLowerCase();
      return (
        (neighNorm && (kLower === neighNorm || neighNorm.includes(kLower) || kLower.includes(neighNorm))) ||
        (cityNorm && (kLower === cityNorm || cityNorm.includes(kLower) || kLower.includes(cityNorm)))
      );
    })?.[1];

  if (centroid) {
    return { lat: centroid.lat, lng: centroid.lng };
  }

  return null;
};

/**
 * Returns the distance in kilometers from an apartment's coordinates to a given destination.
 * Returns null when the apartment has no resolvable coordinates.
 */
export const distanceKmToDestination = (
  apt: {
    lat?: number | null;
    lng?: number | null;
    neighborhoodLat?: number | null;
    neighborhoodLng?: number | null;
    neighborhood?: string | null;
    city?: string | null;
  },
  destLat: number,
  destLng: number,
): number | null => {
  const coords = getApartmentCoordinates(apt);
  if (!coords || isNaN(destLat) || isNaN(destLng)) return null;
  const km = calculateDistance(coords.lat, coords.lng, destLat, destLng);
  return Number(km.toFixed(2));
};

/**
 * Returns the walking minutes from an apartment's coordinates to a given destination.
 * Returns null when the apartment has no resolvable coordinates.
 */
export const walkingMinutesToDestination = (
  apt: {
    lat?: number | null;
    lng?: number | null;
    neighborhoodLat?: number | null;
    neighborhoodLng?: number | null;
    neighborhood?: string | null;
    city?: string | null;
  },
  destLat: number,
  destLng: number,
): number | null => {
  const km = distanceKmToDestination(apt, destLat, destLng);
  if (km == null) return null;
  return kmToWalkingMinutes(km);
};

/**
 * Returns the distance in kilometers from an apartment's coordinates to its neighborhood center.
 */
export const distanceKmToNeighborhood = (
  apt: {
    lat?: number | null;
    lng?: number | null;
    neighborhood?: string | null;
    neighborhoodLat?: number | null;
    neighborhoodLng?: number | null;
    city?: string | null;
  },
  centroids: Record<string, { lat: number; lng: number }> = NEIGHBORHOOD_CENTROIDS,
): number | null => {
  if (
    apt.lat != null &&
    apt.lng != null &&
    apt.neighborhoodLat != null &&
    apt.neighborhoodLng != null
  ) {
    const km = calculateDistance(Number(apt.lat), Number(apt.lng), Number(apt.neighborhoodLat), Number(apt.neighborhoodLng));
    return Number(km.toFixed(2));
  }

  const coords = getApartmentCoordinates(apt);
  if (!coords) return null;

  if (apt.neighborhood || apt.city) {
    const norm = (apt.neighborhood || apt.city || "").trim().toLowerCase();
    const match =
      centroids[apt.neighborhood || ""] ??
      centroids[norm] ??
      centroids[apt.city || ""] ??
      Object.entries(centroids).find(([k]) => k.trim().toLowerCase() === norm)?.[1];

    if (match) {
      const km = calculateDistance(coords.lat, coords.lng, match.lat, match.lng);
      return Number(km.toFixed(2));
    }
  }

  return null;
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
    city?: string | null;
  },
  centroids: Record<string, { lat: number; lng: number }> = NEIGHBORHOOD_CENTROIDS,
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
    const km = calculateDistance(Number(apt.lat), Number(apt.lng), Number(apt.neighborhoodLat), Number(apt.neighborhoodLng));
    return kmToWalkingMinutes(km);
  }

  // 3. Distance to neighborhood center centroid
  const km = distanceKmToNeighborhood(apt, centroids);
  if (km != null) {
    return kmToWalkingMinutes(km);
  }

  return null;
};


