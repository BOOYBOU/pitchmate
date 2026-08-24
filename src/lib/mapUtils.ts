import { MatchLocation } from '../types';

/**
 * Builds an accurate, reliable Google Maps navigation link using coordinates
 * or venue address as fallback.
 */
export function getMatchMapUrl(location: MatchLocation): string {
  if (location.googleMapsUrl && (location.googleMapsUrl.startsWith('http://') || location.googleMapsUrl.startsWith('https://'))) {
    return location.googleMapsUrl;
  }

  if (
    location.latitude != null &&
    location.longitude != null &&
    !isNaN(location.latitude) &&
    !isNaN(location.longitude)
  ) {
    // Generates exact pinpointed Google Maps search link with coordinates
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }

  const queryParts = [location.venueName, location.address, location.city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryParts || 'Soccer Pitch')}`;
}
