import React from "react";
import { CroissantMap } from "./CroissantMap";
import { Avatar } from "./Avatar";
import { PinsList } from "./PinsList";
import { CroissantSpot } from "./types";
import { loadSpots, saveSpots } from "./storage";

export const App: React.FC = () => {
  const [spots, setSpots] = React.useState<CroissantSpot[]>(() => loadSpots());
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);

  // Check if we're on mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function addSpot(lat: number, lng: number) {
    setSpots((prev) => {
      const next = [
        ...prev,
        {
          id: crypto.randomUUID(),
          lat,
          lng,
          createdAt: new Date().toISOString(),
        },
      ];
      saveSpots(next);
      return next;
    });
  }

  function updateSpot(updatedSpot: CroissantSpot) {
    setSpots((prev) => {
      const next = prev.map((spot) =>
        spot.id === updatedSpot.id ? updatedSpot : spot
      );
      saveSpots(next);
      return next;
    });
  }

  function removeSpot(id: string) {
    setSpots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSpots(next);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Backdrop for mobile only */}
      {isMobile && isDrawerOpen && (
        <button
          className="drawer-backdrop open"
          onClick={() => setIsDrawerOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsDrawerOpen(false);
            }
          }}
          aria-label="Close drawer"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        />
      )}

      <header
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          background: "#fff",
          zIndex: 1000,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Avatar />
        </div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          Add croissant spots. Data stored locally.
        </div>
      </header>
      <main
        style={{
          flex: 1,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <CroissantMap
            spots={spots}
            onAddSpot={addSpot}
            onRemoveSpot={removeSpot}
          />

          {/* Floating Hamburger Button */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="floating-hamburger"
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              backgroundColor: isDrawerOpen ? "#ff9f43" : "#fff",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "12px",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
              color: isDrawerOpen ? "white" : "#333",
              fontWeight: isDrawerOpen ? "500" : "normal",
              minWidth: "140px",
              justifyContent: "center",
              zIndex: 1000,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = isDrawerOpen
                ? "#ff8f23"
                : "#f8f8f8";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = isDrawerOpen
                ? "#ff8f23"
                : "#f8f8f8";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = isDrawerOpen
                ? "#ff9f43"
                : "#fff";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = isDrawerOpen
                ? "#ff9f43"
                : "#fff";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
            }}
            title={isDrawerOpen ? "Hide pins list" : "Show pins list"}
          >
            {/* Hamburger Icon */}
            <div className={`hamburger-icon ${isDrawerOpen ? "open" : ""}`}>
              <div
                className="hamburger-line"
                style={{
                  backgroundColor: isDrawerOpen ? "white" : "#333",
                }}
              />
              <div
                className="hamburger-line"
                style={{
                  backgroundColor: isDrawerOpen ? "white" : "#333",
                }}
              />
              <div
                className="hamburger-line"
                style={{
                  backgroundColor: isDrawerOpen ? "white" : "#333",
                }}
              />
            </div>
            <span>
              {isDrawerOpen ? "Hide" : "Show"} ({spots.length})
            </span>
          </button>
        </div>
        <div
          className={`drawer-container ${isDrawerOpen ? "open" : ""}`}
          style={{
            width: isDrawerOpen ? "350px" : "0px",
            borderLeft: isDrawerOpen ? "1px solid #eee" : "none",
            backgroundColor: "#fafafa",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
            zIndex: 100, // Lower z-index than floating button but above map
          }}
        >
          {isDrawerOpen && (
            <div
              style={{
                width: "350px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <PinsList
                spots={spots}
                onRemoveSpot={removeSpot}
                onUpdateSpot={updateSpot}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
