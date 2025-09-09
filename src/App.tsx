import React from "react";
import { CroissantMap, CroissantMapRef } from "./CroissantMap";
import { Avatar } from "./Avatar";
import { PinsList } from "./PinsList";
import { CroissantSpot } from "./types";
import { loadSpots, saveSpots } from "./storage";

export const App: React.FC = () => {
  const [spots, setSpots] = React.useState<CroissantSpot[]>(() => loadSpots());
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);
  const mapRef = React.useRef<CroissantMapRef>(null);
  const [theme, setTheme] = React.useState<string>(() =>
    localStorage.getItem("theme") || "light"
  );

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

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

  function navigateToSpot(lat: number, lng: number) {
    if (mapRef.current) {
      mapRef.current.navigateToSpot(lat, lng);
      // On mobile, close the drawer after navigation
      if (isMobile) {
        setIsDrawerOpen(false);
      }
    }
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
          aria-label="Close drawer"
        />
      )}

      <header
        className="app-header"
        style={{
          padding: "0.75rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          zIndex: 1000,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Avatar />
          <div
            style={{
              fontWeight: 600,
              letterSpacing: "0.5px",
              fontSize: "14px",
            }}
          >
            Croissant Atlas
          </div>
          <span
            className="badge"
            style={{ display: isMobile ? "none" : "inline-block" }}
          >
            Local Only
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
          }}
        >
          <div className="dark-toggle" title="Toggle dark mode">
            <label className="switch">
              <input
                type="checkbox"
                checked={theme === "dark"}
                onChange={() =>
                  setTheme(theme === "dark" ? "light" : "dark")
                }
                aria-label="Toggle dark mode"
              />
              <span className="slider" />
            </label>
          </div>
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
            ref={mapRef}
            spots={spots}
            onAddSpot={addSpot}
            onRemoveSpot={removeSpot}
            onUpdateSpot={updateSpot}
          />
          {/* Floating Hamburger Button */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="floating-hamburger btn"
            style={{
              position: "absolute",
              top: 20,
              right: 12, // small constant gap from the right edge (adjacent to drawer when open)
              background: isDrawerOpen ? "var(--accent)" : "var(--panel)",
              color: isDrawerOpen ? "#fff" : "var(--text)",
              border: isDrawerOpen ? 'none' : '1px solid var(--border)',
              borderRadius: "var(--radius)",
              padding: "12px 16px",
              boxShadow: "var(--shadow)",
              fontWeight: 500,
              zIndex: 1200,
              transition: 'background 140ms ease, color 140ms ease'
            }}
            title={isDrawerOpen ? "Hide pins list" : "Show pins list"}
          >
            {/* Hamburger Icon */}
            <div className={`hamburger-icon ${isDrawerOpen ? "open" : ""}`}>
              <div className="hamburger-line" />
              <div className="hamburger-line" />
              <div className="hamburger-line" />
            </div>
            <span>
              {isDrawerOpen ? "Hide" : "Show"} ({spots.length})
            </span>
          </button>
        </div>
        <div
          className={`drawer-container ${isDrawerOpen ? "open" : ""}`}
          style={{
            width: isDrawerOpen ? 350 : 0,
            borderLeft: isDrawerOpen ? '1px solid var(--border)' : 'none',
            background: "var(--panel)",
            backdropFilter: "blur(14px) saturate(160%)",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
            zIndex: 100,
          }}
        >
          {isDrawerOpen && (
            <div
              style={{
                width: 350,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <PinsList
                spots={spots}
                onRemoveSpot={removeSpot}
                onUpdateSpot={updateSpot}
                onNavigateToSpot={navigateToSpot}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
