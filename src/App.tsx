import React from "react";
import { CroissantMap } from "./CroissantMap";
import { Avatar } from "./Avatar";
import { PinsList } from "./PinsList";
import { CroissantSpot } from "./types";
import { loadSpots, saveSpots } from "./storage";

export const App: React.FC = () => {
  const [spots, setSpots] = React.useState<CroissantSpot[]>(() => loadSpots());

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

  function removeSpot(id: string) {
    setSpots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSpots(next);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
        <Avatar />
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
        <div style={{ flex: 1, display: "flex" }}>
          <CroissantMap
            spots={spots}
            onAddSpot={addSpot}
            onRemoveSpot={removeSpot}
          />
        </div>
        <div
          style={{
            width: "350px",
            borderLeft: "1px solid #eee",
            backgroundColor: "#fafafa",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PinsList spots={spots} onRemoveSpot={removeSpot} />
        </div>
      </main>
    </div>
  );
};
