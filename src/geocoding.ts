// Nominatim reverse geocoding utility
import { getCachedAddress, cacheAddress } from "./addressCache";

interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResponse {
  place_id: string;
  licence: string;
  osm_type: string;
  osm_id: string;
  lat: string;
  lon: string;
  place_rank: string;
  category: string;
  type: string;
  importance: string;
  addresstype: string;
  display_name: string;
  name?: string;
  address: NominatimAddress;
  boundingbox: string[];
}

export interface FormattedAddress {
  displayName: string;
  shortAddress: string;
  fullAddress: string;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<FormattedAddress> {
  // Check cache first
  const cachedResult = getCachedAddress(lat, lng);
  if (cachedResult) {
    console.log(
      `Using cached address for ${lat.toFixed(6)}, ${lng.toFixed(6)}`
    );
    return cachedResult;
  }

  try {
    console.log(`Fetching address for ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: NominatimResponse = await response.json();

    // Format the address in a user-friendly way
    const address = data.address;
    const parts: string[] = [];

    // Build short address (street + city)
    if (address.house_number && address.road) {
      parts.push(`${address.house_number} ${address.road}`);
    } else if (address.road) {
      parts.push(address.road);
    }

    // Add locality
    const locality =
      address.city || address.town || address.village || address.suburb;
    if (locality) {
      parts.push(locality);
    }

    // Add country for international context
    if (address.country) {
      parts.push(address.country);
    }

    const shortAddress = parts.join(", ") || "Unknown location";

    const formattedAddress: FormattedAddress = {
      displayName: data.display_name,
      shortAddress,
      fullAddress: data.display_name,
    };

    // Cache the result
    cacheAddress(lat, lng, formattedAddress);

    return formattedAddress;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    const fallbackAddress: FormattedAddress = {
      displayName: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      shortAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      fullAddress: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    };

    // Don't cache error results, but could cache them with a shorter expiry if desired
    return fallbackAddress;
  }
}
