import React, { useEffect, useState } from "react";
import { CroissantSpot } from "./types";
import { reverseGeocode } from "./geocoding";

interface PinsListProps {
  spots: CroissantSpot[];
  onRemoveSpot: (id: string) => void;
}

export const PinsList: React.FC<PinsListProps> = ({ spots, onRemoveSpot }) => {
  const [spotsWithAddresses, setSpotsWithAddresses] =
    useState<CroissantSpot[]>(spots);
  const [loadingAddresses, setLoadingAddresses] = useState<Set<string>>(
    new Set()
  );

  // Fetch addresses for spots that don't have them
  useEffect(() => {
    const fetchAddresses = async () => {
      const spotsNeedingAddresses = spots.filter((spot) => !spot.address);

      if (spotsNeedingAddresses.length === 0) {
        setSpotsWithAddresses(spots);
        return;
      }

      // Set loading state for these spots
      setLoadingAddresses(new Set(spotsNeedingAddresses.map((s) => s.id)));

      // Fetch addresses sequentially to be respectful to the API
      const updatedSpots = [...spots];

      for (const spot of spotsNeedingAddresses) {
        try {
          // Add a small delay between requests to be respectful to the API
          const currentIndex = spotsNeedingAddresses.indexOf(spot);
          if (currentIndex > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          const address = await reverseGeocode(spot.lat, spot.lng);
          const spotIndex = updatedSpots.findIndex((s) => s.id === spot.id);
          if (spotIndex !== -1) {
            updatedSpots[spotIndex] = { ...spot, address };
          }
        } catch (error) {
          console.error(`Failed to fetch address for spot ${spot.id}:`, error);
        }

        // Remove from loading state
        setLoadingAddresses((prev) => {
          const newSet = new Set(prev);
          newSet.delete(spot.id);
          return newSet;
        });
      }

      setSpotsWithAddresses(updatedSpots);
    };

    fetchAddresses();
  }, [spots]);

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
