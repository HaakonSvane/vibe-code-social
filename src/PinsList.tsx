import React, { useEffect, useState, useCallback, useMemo } from "react";
import { CroissantSpot } from "./types";
import { reverseGeocode } from "./geocoding";
import { isAddressCached } from "./addressCache";

interface PinsListProps {
  spots: CroissantSpot[];
  onRemoveSpot: (id: string) => void;
  onUpdateSpot?: (updatedSpot: CroissantSpot) => void;
}

export const PinsList: React.FC<PinsListProps> = ({
  spots,
  onRemoveSpot,
  onUpdateSpot,
}) => {
  const [spotsWithAddresses, setSpotsWithAddresses] =
    useState<CroissantSpot[]>(spots);
  const [loadingAddresses, setLoadingAddresses] = useState<Set<string>>(
    new Set()
  );
  const [fetchedSpots, setFetchedSpots] = useState<Set<string>>(new Set());

  // Handle cached address loading
  const handleCachedAddress = useCallback(
    async (spot: CroissantSpot) => {
      const address = await reverseGeocode(spot.lat, spot.lng);
      const updatedSpot = { ...spot, address };

      setSpotsWithAddresses((prev) => {
        const updated = prev.map((s) => (s.id === spot.id ? updatedSpot : s));
        return updated;
      });

      // Notify parent component of the update
      if (onUpdateSpot) {
        onUpdateSpot(updatedSpot);
      }
    },
    [onUpdateSpot]
  );

  // Memoize spots that need addresses to prevent unnecessary recalculations
  const spotsNeedingAddresses = useMemo(() => {
    return spots.filter((spot) => {
      // Skip if we already have an address
      if (spot.address) return false;

      // Skip if we're currently loading this spot
      if (loadingAddresses.has(spot.id)) return false;

      // Skip if we've already attempted to fetch this spot in this session
      if (fetchedSpots.has(spot.id)) return false;

      // Skip if we have a cached address for these coordinates
      if (isAddressCached(spot.lat, spot.lng)) {
        // Fetch from cache immediately
        handleCachedAddress(spot);
        setFetchedSpots((prev) => new Set([...prev, spot.id]));
        return false;
      }

      return true;
    });
  }, [spots, loadingAddresses, fetchedSpots, handleCachedAddress]);

  // Debounced fetch function to prevent rapid successive calls
  const fetchAddresses = useCallback(async (spotsToFetch: CroissantSpot[]) => {
    if (spotsToFetch.length === 0) return;

    console.log(`Fetching addresses for ${spotsToFetch.length} spots`);

    // Set loading state for these spots
    setLoadingAddresses(
      (prev) => new Set([...prev, ...spotsToFetch.map((s) => s.id)])
    );

    // Mark these spots as being processed
    setFetchedSpots(
      (prev) => new Set([...prev, ...spotsToFetch.map((s) => s.id)])
    );

    // Fetch addresses sequentially to be respectful to the API
    for (const spot of spotsToFetch) {
      try {
        // Add a small delay between requests to be respectful to the API
        const currentIndex = spotsToFetch.indexOf(spot);
        if (currentIndex > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const address = await reverseGeocode(spot.lat, spot.lng);

        const updatedSpot = { ...spot, address };

        setSpotsWithAddresses((prev) => {
          const spotIndex = prev.findIndex((s) => s.id === spot.id);
          if (spotIndex === -1) return prev;

          const updated = [...prev];
          updated[spotIndex] = updatedSpot;
          return updated;
        });

        // Notify parent component of the update
        if (onUpdateSpot) {
          onUpdateSpot(updatedSpot);
        }
      } catch (error) {
        console.error(`Failed to fetch address for spot ${spot.id}:`, error);
      } finally {
        // Remove from loading state
        setLoadingAddresses((prev) => {
          const newSet = new Set(prev);
          newSet.delete(spot.id);
          return newSet;
        });
      }
    }
  }, []);

  // Effect to handle new spots that need addresses
  useEffect(() => {
    // Update spots with addresses state when spots change
    setSpotsWithAddresses(spots);

    // Fetch addresses for new spots
    if (spotsNeedingAddresses.length > 0) {
      // Use a timeout to debounce rapid changes
      const timeoutId = setTimeout(() => {
        fetchAddresses(spotsNeedingAddresses);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [
    spots,
    spotsNeedingAddresses,
    fetchAddresses,
    onUpdateSpot,
    handleCachedAddress,
  ]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (spots.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "#666",
          fontStyle: "italic",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        🥐 No croissant spots yet! Click on the map to add your first one.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f9f9f9",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          color: "#333",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        🥐 My Croissant Spots ({spots.length})
      </h3>

      <div
        className="pins-list-scroll"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: "4px",
          minHeight: 0, // Important for flex child to shrink
        }}
      >
        {spotsWithAddresses.map((spot) => (
          <div
            key={spot.id}
            style={{
              backgroundColor: "white",
              padding: "16px",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              border: "1px solid #e0e0e0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#333",
                    marginBottom: "4px",
                    fontSize: "14px",
                  }}
                >
                  📍{" "}
                  {loadingAddresses.has(spot.id) ? (
                    <span style={{ color: "#666", fontStyle: "italic" }}>
                      Loading address...
                    </span>
                  ) : (
                    spot.address?.shortAddress ||
                    `${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}`
                  )}
                </div>

                {spot.address && !loadingAddresses.has(spot.id) && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginBottom: "8px",
                      lineHeight: "1.4",
                    }}
                  >
                    {spot.address.fullAddress}
                  </div>
                )}

                <div
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    display: "flex",
                    gap: "16px",
                  }}
                >
                  <span>📅 {formatDate(spot.createdAt)}</span>
                  <span>
                    🌍 {spot.lat.toFixed(6)}, {spot.lng.toFixed(6)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onRemoveSpot(spot.id)}
                style={{
                  backgroundColor: "#ff6b6b",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  cursor: "pointer",
                  marginLeft: "12px",
                  height: "fit-content",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#ff5252";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = "#ff5252";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#ff6b6b";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor = "#ff6b6b";
                }}
                title="Remove this croissant spot"
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
