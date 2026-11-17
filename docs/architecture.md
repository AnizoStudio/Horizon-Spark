# Horizon Spark — Core Engine & Game Architecture
**Studio:** ANIZO (AnizoStudio)

## 1. Visual & Structural Identity
- **Perspective:** 2D side-scrolling exploration stages connected via an interactive node-based world map.
- **Art Direction:** High-contrast black silhouette foreground (terrain, ruins, structures) paired with vibrant atmospheric skies and warm amber light beams (#F59E0B).
- **Core Loop:** Select sector node on World Map -> Traverse 2D terrain & solve environmental puzzles -> Restore the dormant Beacon -> Unlock adjacent map nodes.

## 2. Directory Structure
- `index.html` — Main entry point & mobile viewport wrapper.
- `src/core/` — Game loop, canvas scaler, scene state manager, touch/keyboard input.
- `src/systems/` — Silhouette & dynamic lighting renderer, 2D physics, audio, local storage save system.
- `src/entities/` — Player controller, beacons, interactive triggers, obstacles.
- `src/ui/` — Node-based world map, minimal touch HUD, ANIZO splash screen.
- `assets/data/` — JSON level definitions and world map node graphs.
