// Address caching utility for reverse geocoding
import { FormattedAddress } from "./geocoding";

const CACHE_KEY = "croissant-address-cache-v1";
const CACHE_EXPIRY_DAYS = 30; // Cache addresses for 30 days

interface CachedAddress {
  address: FormattedAddress;
  timestamp: number;
  coordinates: string; // "lat,lng" format for easy lookup
}

interface AddressCache {
  [coordinateKey: string]: CachedAddress;
}

// Generate a cache key from coordinates (rounded to avoid precision issues)
function getCacheKey(lat: number, lng: number): string {
  // Round to 6 decimal places (~0.1m precision) to avoid cache misses from tiny coordinate differences
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// Check if a cached entry is still valid
function isCacheValid(cachedEntry: CachedAddress): boolean {
  const now = Date.now();
  const expiryTime =
    cachedEntry.timestamp + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return now < expiryTime;
}

// Load cache from localStorage
function loadCache(): AddressCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const cache = JSON.parse(raw) as AddressCache;

    // Clean expired entries
    const cleanedCache: AddressCache = {};
    Object.entries(cache).forEach(([key, value]) => {
      if (isCacheValid(value)) {
        cleanedCache[key] = value;
      }
    });

    return cleanedCache;
  } catch (error) {
    console.warn("Failed to load address cache:", error);
    return {};
  }
}

// Save cache to localStorage
function saveCache(cache: AddressCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn("Failed to save address cache:", error);
  }
}

// Get cached address if available
export function getCachedAddress(
  lat: number,
  lng: number
): FormattedAddress | null {
  const cache = loadCache();
  const key = getCacheKey(lat, lng);
  const cached = cache[key];

  if (cached && isCacheValid(cached)) {
    return cached.address;
  }

  return null;
}

// Cache an address
export function cacheAddress(
  lat: number,
  lng: number,
  address: FormattedAddress
): void {
  const cache = loadCache();
  const key = getCacheKey(lat, lng);

  cache[key] = {
    address,
    timestamp: Date.now(),
    coordinates: key,
  };

  saveCache(cache);
}

// Check if an address is cached (without retrieving it)
export function isAddressCached(lat: number, lng: number): boolean {
  return getCachedAddress(lat, lng) !== null;
}

// Clear old cache entries (useful for maintenance)
export function clearExpiredCache(): number {
  const cache = loadCache();
  const cleanedCache: AddressCache = {};
  let removedCount = 0;

  Object.entries(cache).forEach(([key, value]) => {
    if (isCacheValid(value)) {
      cleanedCache[key] = value;
    } else {
      removedCount++;
    }
  });

  saveCache(cleanedCache);
  return removedCount;
}

// Get cache statistics (useful for debugging)
export function getCacheStats(): {
  total: number;
  expired: number;
  size: string;
} {
  const cache = loadCache();
  const entries = Object.values(cache);
  const expired = entries.filter((entry) => !isCacheValid(entry)).length;
  const sizeInBytes = JSON.stringify(cache).length;
  const sizeInKB = (sizeInBytes / 1024).toFixed(2);

  return {
    total: entries.length,
    expired,
    size: `${sizeInKB} KB`,
  };
}
