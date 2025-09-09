# The Hitchhikers Guide to Vibe Coding
Welcome to Connascence's first Code Social of the year.

In this Code Social, you will be testing out the latest and greatest AI-tech that is enabled for us developers in Bouvet.
We will be coding using Agent mode (VS Code or any preffered IDE that supports it) to prototype a fullstack application of your liking.

Depending on how far you come, we will progressively add more and more to the stack, until it hopefully resembles a something we are used to from work.

# How do I procede from here?
After you have been assigned a pairing, your task is to create any full-stack application you'd like. You may use gen AI to help iron out an idea you have, or head into the `./app-ideas` directory for a set of ideas to get you started. The ideas mainly serve as a guideline, and you (and your AI partner) may of course modify them to you and your parntner(s) likings.

## AI tips and tricks
After messing around with agent mode for a couple of months, experiences learned on the way that might help you get better results are found in `./ai-tips.md`. Note that this is tested on VS Code only. Most commonly used IDE's (Visual Studio, Rider) support AI chat, but all features mentioned in this post have not been tested.

---

## Croissant Map App

Implements requirements in `context.md`:

1. React + TypeScript frontend (Vite setup).
2. Leaflet map with OpenStreetMap tiles. Click to add croissant spots (orange circles). Right-click a circle to remove. When 3+ points exist, a translucent convex hull polygon highlights the overall area.
3. User avatar component (upload image; persists in localStorage) with default croissant icon.
4. Map data (tiles) from OpenStreetMap. User-added spots persisted locally only.

### Quick start
```bash
npm install
npm run dev
```

Open the local URL (e.g. http://localhost:5173). Add spots by clicking the map.

### Notes
- Respect OpenStreetMap tile usage policy for production traffic.
- Convex hull uses a simple Graham scan implementation; adequate for small sets.
- No backend yet; future enhancement could sync spots to a server.
