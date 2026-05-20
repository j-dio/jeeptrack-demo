# JeepTrack Cebu PWA Demo — Implementation Research Pack

## TL;DR
- **Build the stack as Vite + React + `mapbox-gl` v3 (direct, no wrapper) + Mapbox `navigation-night-v1` dark style + `vite-plugin-pwa` (generateSW) + Framer Motion for UI / GSAP only if you add scroll-driven sequences.** That combination gives you a sleek, installable, offline-tolerant transit app in one repo, and every piece below maps to a concrete config snippet or seed value Claude Code can drop in.
- **Seed the demo with 8 real Cebu jeepney routes you can actually animate** — 01K, 04B, 04C, 04I, 06B, 10H, 13B, 17B/17C — using the commutetour.com landmark sequences plus the 15 geocoded landmarks the subagent returned (Carbon 10.29124,123.89802; Ayala 10.31836,123.90515; SM 10.31111,123.91806; IT Park 10.33040,123.90740, etc.). **Note: route code "10B" is not a current Cebu route** — use 10F/10G/10H/10M instead.
- **For the "feels Cebuano" microcopy, do not invent phrases — use the four canonical jeepney words (`Lugar lang!`, `Bayad palihog`, `Para!`, `Sakay na!`) plus contextual one-liners (`Hapit na!`, `Puno na!`, `Trapik kaayo!`, `Naunsa man ni?`).** They map cleanly to ETA/arriving/full/stopped/congested states and any Cebuano will recognize them instantly.

---

## Key Findings

### 1. Cebu jeepney routes — what to seed the demo with
The richest current source is **commutetour.com's Cebu jeep route page**, which catalogues 47+ active route codes with ordered landmark/road lists for each direction. The site is structured exactly the way you'd want for seeding a transit graph: for every code it gives a forward stop list and a return stop list, plus the road names traversed.

**Route codes you asked about, verified against current sources:**

| Code | Verified status | Origin → Destination | Use in demo? |
|---|---|---|---|
| 04B | ✅ Active | Lahug ↔ Carbon (via Salinas Dr, Gorordo Ave, Escario, Osmeña Blvd) | **Yes — flagship route** |
| 04C | ✅ Active (per Sugbo.ph 2024 guide and Sinulog re-routing orders) | Lahug → F. Ramos → Junquera → Carbon | **Yes** |
| 04I | ✅ Active | Plaza Housing ↔ Carbon (via Mango Square, Jakosalem) | Yes |
| 10B | ❌ **Not a current code** — the 10-Pardo/Bulacao family is 10C/10F/10G/10H/10K/10M only | — | **Substitute 10H** (Bulacao ↔ SM) |
| 17B | ✅ Active | Apas ↔ Carbon (via IT Park, Gorordo, Osmeña) | **Yes — IT Park flagship** |
| 17C | ✅ Active | Apas ↔ Carbon (alternate routing) | Yes |

**The other "must-include" codes** for a representative Cebu demo (from the same commutetour.com index):
- **01K** Urgello → Colon → SM → Parkmall — covers the city's full north-south spine
- **06B** Guadalupe ↔ Carbon via V. Rama / Osmeña — high-frequency route
- **13B** Talamban ↔ Carbon — covers the north corridor past JY Square
- **03A** Mabolo ↔ Carbon — covers the port/Mabolo corridor
- **62B** Pit-os ↔ Carbon — long northern route

**Embedded maps:** commutetour.com pages have placeholder "Route Map" sections, but **no machine-readable GeoJSON or embedded Google Maps**. You'll need to manually digitize the path. The best free path-digitization workflow is OpenStreetMap's overpass-turbo + `osmnx` or just clicking through the road names in Google Maps Directions and exporting the polyline.

**Sample seed JSON for one route** (04B Lahug → Carbon, distilled from the commutetour.com stop list, with subagent-confirmed coordinates):

```json
{
  "code": "04B",
  "name": "Lahug – Carbon",
  "direction": "outbound",
  "color": "#FF6B35",
  "waypoints": [
    { "name": "JY Square Mall", "lng": 123.89816, "lat": 10.33065 },
    { "name": "Salinas Drive", "lng": 123.90100, "lat": 10.32700 },
    { "name": "UP Cebu", "lng": 123.89778, "lat": 10.31806 },
    { "name": "Gorordo Ave / Lahug Brgy Hall", "lng": 123.89791, "lat": 10.32424 },
    { "name": "Escario Central Mall", "lng": 123.89400, "lat": 10.31700 },
    { "name": "Cebu Provincial Capitol", "lng": 123.89076, "lat": 10.31670 },
    { "name": "Fuente Osmeña Circle", "lng": 123.89327, "lat": 10.30966 },
    { "name": "Osmeña Blvd / Colon", "lng": 123.89889, "lat": 10.29667 },
    { "name": "Carbon Public Market", "lng": 123.89802, "lat": 10.29124 }
  ]
}
```

**Geocoded landmark cheatsheet** (subagent-verified — use these as snap-to anchors):

| Landmark | lng, lat |
|---|---|
| Carbon Public Market | 123.89802, 10.29124 |
| Colon Obelisk | 123.90366, 10.29799 |
| Ayala Center Cebu | 123.90515, 10.31836 |
| SM City Cebu | 123.91806, 10.31111 |
| Cebu IT Park | 123.90740, 10.33040 |
| Fuente Osmeña Circle | 123.89327, 10.30966 |
| Cebu Provincial Capitol | 123.89076, 10.31670 |
| JY Square Mall | 123.89816, 10.33065 |
| UP Cebu (Lahug) | 123.89778, 10.31806 |
| Lahug Barangay Hall | 123.89791, 10.32424 |
| Guadalupe Church | 123.88250, 10.30500 |
| Cebu South Bus Terminal | 123.89321, 10.29802 |
| Cebu North Bus Terminal | 123.91750, 10.31180 |
| Apas (barangay centroid) | 123.90440, 10.33740 |
| Robinsons Galleria Cebu | 123.91026, 10.30484 |

---

### 2. Bisaya / Cebuano commuter microcopy — authentic mapping to app states

**The two non-negotiable jeepney words** every Cebu commuter uses daily (do NOT use Tagalog "Para po"):
- **`Lugar lang!`** — "Stop here, please" (signals the driver to pull over). The TalkBisaya Cebu phrasebook explicitly notes "Used universally on jeepneys" and italki/Southpole Hotel Cebu confirm Cebu drivers wait for `Lugar lang`, not `Para`.
- **`Bayad palihog`** — "Payment, please" — said as you pass fare forward to be handed down the cabin to the driver.

**Suggested mapping from app states to authentic microcopy:**

| App state | Bisaya phrase | English gloss | Tone |
|---|---|---|---|
| Jeep arriving in <1 min | **Hapit na!** | Almost there! | Neutral, friendly |
| Jeep arriving in 2–5 min | **Padulong na, huwat lang!** / **Anaa na, huwat lang!** | On its way, just wait! | Reassuring |
| Far away (>10 min) | **Layo pa, palihog huwat.** | Still far, please wait. | Patient |
| Jeep is full | **Puno na!** (corroborated by commuter dictionaries: *"Puno na ang jeep; mag-hulat nalang ta sa sunod"*) | It's full! | Resigned |
| Jeep stopped at landmark | **Naa sa [landmark]** | At [landmark] | Status |
| Jeep moving | **Padayon!** / **Larga na!** | Moving on / Drive on! | Active |
| Stuck in traffic | **Trapik kaayo!** / **Hugot ang dagan.** | Heavy traffic / Slow going. | Mild lament |
| Vehicle paused unexpectedly | **Naunsa man ni?** | What happened to this? | Confused (good loading-state copy) |
| User taps "stop here" | **Lugar lang!** | Stop here, please | Action |
| User pays fare | **Bayad palihog** | Payment, please | Action |
| Successful action | **Salamat kaayo!** | Thanks a lot! | Warm |
| Error / "I'm lost" | **Nalibog ko!** | I'm confused/lost! | Self-aware humor |
| Empty state ("no jeeps found") | **Wala pa'y sakyanan diri, oy.** | No rides here yet. | Casual |
| "Last trip" warning | **Last trip na ni, dali!** | This is the last trip, hurry! | Urgent |
| Boarding | **Sakay na ta!** | Let's ride! | Cheerful |
| Switching directions | **Balik ta!** | Let's head back! | Action |
| Driver greeting | **Manong, asa ni padulong?** | Driver, where's this headed? | Polite (use "Manong" not Tagalog "po/opo") |

**Cultural rule to enforce in copy:** Cebuano has NO `po`/`opo`. Politeness is signaled by `lang` (softener: "Tubig lang, palihog" is softer than "Tubig, palihog") and by `Manong`/`Manang` (older brother/sister) for strangers — per TalkBisaya's traveler guide. Use `lang` liberally in tooltip and toast copy and it will read as "actually Cebuano" instead of "Tagalog with Cebu words pasted in."

---

### 3. Mapbox dark map — exact style URL, version, and React gotchas

**Recommended style URL for a sleek transit/navigation dark map:**

```
mapbox://styles/mapbox/navigation-night-v1
```

This is Mapbox's purpose-built dark style for "guidance while navigating a route" — Lost Creek Designs' Mapbox styles cheatsheet describes the navigation-night style as "designed for guidance while navigating a route" with two variants (day and night).

**Alternative options:**
- `mapbox://styles/mapbox/dark-v11` — the general-purpose dark style, more minimal, better for "data visualization on top of a muted map" (per Mapbox's own Dark Map style product page: *"Mapbox Dark and Mapbox Light are subtle, full-featured maps designed to provide geographic context while highlighting the data on your analytics dashboard"*).
- `mapbox://styles/mapbox/standard` with `config.lightPreset = 'night'` — the new v3 3D Standard style supports a `lightPreset` of `dawn | day | dusk | night` that changes the lighting in real time. Heavier (3D buildings, terrain) but stunning if you can afford the GPU.

**For a jeepney tracker, use `navigation-night-v1`** — the road hierarchy is tuned for vehicle tracking and the road labels are legible.

**Mapbox GL JS version (2025):** Use **`mapbox-gl` ≥ 3.0** (latest at time of writing is 3.24.0 per npm). v3 requires WebGL2 (universal in modern browsers) and unlocks the Standard 3D style, light presets, and a proper ESM build (`mapbox-gl/esm`).

**React integration — pick ONE of two patterns:**

**Pattern A (recommended for a small demo): use `mapbox-gl` directly with a `useRef` + `useEffect`.** Mapbox's own engineering blog argues this is the right default: *"Thankfully Mapbox GL JS works well without a wrapper abstraction. It's pretty easy for third-party libraries to work alongside React!"* You get the full native API and zero wrapper overhead.

**Pattern B: use `react-map-gl` v8.x** (from vis.gl, the official React wrapper). As of v8.1 (Oct 2025) it imports as `react-map-gl/mapbox` and works with mapbox-gl ≥ 3.5; the v7 rewrite cut the bundle from 219 KB to ~57 KB. Use this if you want a declarative `<Map>` component with `<Marker>` and `<Source>` children.

**Gotchas (real ones, learned the hard way):**

1. **React StrictMode double-mounts the map.** In dev, `useEffect` runs twice, which means `new mapboxgl.Map(...)` runs twice and you get two map instances stacked on top of each other (and you're billed for two map loads). Fix: store the map in a `useRef` and guard `if (mapRef.current) return;` before initializing. Or use react-map-gl's `<Map reuseMaps>` prop, which is **specifically required** because, per the vis.gl docs, *"as of v2.0, mapbox-gl generates a billable event every time a Map object is initialized."*
2. **Forgetting the CSS import.** You MUST `import 'mapbox-gl/dist/mapbox-gl.css'` in your entry file or controls and popups will render unstyled.
3. **Container needs explicit height.** The map div must have `height: 100%` (or fixed px) on a parent that also has height — otherwise it renders at 0px and you'll think the token is wrong.
4. **Token security.** Never commit the token. Use `VITE_MAPBOX_TOKEN` in `.env`, gitignore `.env`, and create a separate URL-restricted token for production. Anyone can scrape the token from the bundle — Mapbox URL restrictions are your only real defense.
5. **Re-rendering markers kills performance.** If you re-create `<Marker>` components on every viewport change (50+ markers), use `useMemo` to memoize the marker list — per the vis.gl tips-and-tricks doc, this is the single most common React+Mapbox perf bug.

---

### 4. Realistic jeepney movement simulation — the playbook

The canonical Mapbox approach is documented in their own examples and blog. Combine these four techniques:

**a) Path as a GeoJSON LineString, animated point as a separate GeoJSON Point source.** Mapbox's official "Animate a point along a route" example uses Turf.js to interpolate.

**b) Smooth interpolation between waypoints with `@turf/along` + total distance.** Mapbox's cinematic route animation blog gives the exact recipe:

```js
import * as turf from '@turf/turf';
const path = turf.lineString(routeCoordinates);
const pathDistance = turf.length(path); // km
// inside requestAnimationFrame loop:
const animationPhase = (now - startTime) / durationMs; // 0..1
const point = turf.along(path, pathDistance * animationPhase);
map.getSource('jeep').setData(point);
```

**c) Rotate marker to direction of travel with `@turf/bearing`.** Compute bearing between the previous and current point each frame and bind it to the icon's `icon-rotate` paint property:

```js
const bearing = turf.bearing(turf.point(prev), turf.point(curr));
point.features[0].properties.bearing = bearing;
// in the symbol layer:
layout: { 'icon-rotate': ['get', 'bearing'], 'icon-rotation-alignment': 'map' }
```

**d) Simulate traffic congestion (variable speed) via a per-segment speed multiplier.** Three production-quality patterns:

1. **Tag each segment of your LineString with a `congestion` weight (0.3 = heavy traffic, 1.0 = free flow), then advance the animation by `speedKmh * congestion * dt` instead of a constant.** This is what real navigation SDKs do — Mapbox's own "Animated 3D model along a route" example uses a per-segment `distances` array (`segmentLength`, `segmentRatio`) and you just inject a speed multiplier per segment.
2. **Add Perlin noise to instantaneous speed** to make it feel organic (`speed = baseSpeed * (0.7 + 0.3 * noise(t))`).
3. **Use Glenn Fiedler's fixed-timestep pattern** ("Fix Your Timestep!") with an accumulator so the simulation is deterministic regardless of frame rate. The advanced rAF guide on fsjs.dev gives a clean implementation: fixed 1/60s physics tick + interpolated render state. Important on mobile where frame rates vary.

**e) Use `requestAnimationFrame`, NOT `setInterval`.** rAF pauses when the tab is hidden, syncs to the browser's repaint cycle, and lets you cancel cleanly with `cancelAnimationFrame`. Use `performance.now()` for the time delta, never `Date.now()`.

**f) Smoothing with LERP.** Mapbox's cinematic-routes blog notes that following the leading edge directly causes jitter on sharp turns; lerp the camera and the marker position toward the target each frame:
```js
const lerp = (a, b, t) => a + (b - a) * t;
currentLat = lerp(currentLat, targetLat, 0.15);
```

**Bottom line for the demo:** GeoJSON LineString for the route + GeoJSON Point source for the jeep marker + Turf for `along`+`bearing` + rAF loop with per-segment speed multiplier + lerp smoothing. About 80 lines of code.

---

### 5. GSAP vs Framer Motion — pick Framer Motion for this app

For a Vite + React PWA with map UI, bottom sheets, route cards, and spinners, **Framer Motion (now branded "Motion") is the right default**, with GSAP as an optional add-on for one or two specific scenes.

**Why Framer Motion wins for this specific app:**

| Use case | Winner | Why |
|---|---|---|
| Bottom sheet slide-up (Apple Maps / Google Maps style) | **Framer Motion** | `motion.div` + `drag="y"` + `dragConstraints` + `dragElastic` gives you a draggable sheet with snap points in ~30 lines. AnimatePresence handles enter/exit. |
| Route card list transitions | **Framer Motion** | `layout` prop + `AnimatePresence` is purpose-built for list reorder / add / remove. |
| Map overlay UI fades, marker pulse | **Framer Motion** | Declarative `animate` / `whileHover` / `whileTap` co-locates animation with state. |
| Loading spinners | **Either** (or just CSS) | Both fine; Framer Motion's `repeat: Infinity` is the simplest. |
| Scroll-driven cinematic intro / timeline-sequenced storytelling | **GSAP (+ ScrollTrigger)** | Only add this if you want a marketing-style scroll narrative. The Codolve and Annnimate comparisons both conclude: *"Start with Framer Motion. Add GSAP when you need scroll-triggered sequences or complex timelines."* |
| 50+ simultaneously animated elements (e.g., many jeeps moving) | **GSAP** | Per the UAV Development benchmarks, Framer Motion drops to ~45 fps with many concurrent transforms while GSAP stays at 60 fps. But for jeep markers, animate them via Mapbox GL's GeoJSON source updates, not via DOM — so this point is moot. |

**Compatibility with Vite + React (2025):**
- **Framer Motion**: zero issues with Vite. The full `motion` component is ~34 KB minified+gzipped per motion.dev's official bundle-size guide (reducible to ~4.6 KB by switching to `LazyMotion` + the `m` component). MIT licensed.
- **GSAP**: zero Vite issues; use the `@gsap/react` package and its `useGSAP` hook for proper StrictMode cleanup. **As of April 30, 2025, following Webflow's October 2024 acquisition, GSAP is 100% free for commercial use — including all formerly paid Club GSAP plugins (MorphSVG, SplitText, ScrollSmoother, etc.).** Per Webflow's announcement: *"GSAP is now 100% free to all users—Webflow customer or not... We're also expanding the standard license to cover commercial use."* This removes the historical licensing friction.

**My concrete recommendation:** install `framer-motion` (or `motion`, its rebranded successor on motion.dev), use it for the bottom sheet, route picker carousel, and toast animations. Only add `gsap` + `@gsap/react` if you decide to do a scrollytelling intro or want SplitText for heading reveals — both are now free.

---

### 6. PWA on Vite + React (2025) — config that actually installs on iOS

**Plugin choice:** `vite-plugin-pwa` is the de-facto standard. From v0.17 it requires Vite ≥ 5 and from v0.16 Node ≥ 16. It wraps Workbox 7 and handles manifest generation, SW registration, and runtime caching.

**Minimum working config for a map PWA:**

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon.png'],
      manifest: {
        name: 'JeepTrack Cebu',
        short_name: 'JeepTrack',
        description: 'Real-time-ish jeepney tracker for Cebu City',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        lang: 'en',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Mapbox tile API
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mapbox-api',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/(events|api)\.tiles\.mapbox\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/api\/routes\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'route-data', cacheableResponse: { statuses: [0, 200] } }
          }
        ]
      },
      devOptions: { enabled: true }
    })
  ]
});
```

**Why this caching split:** map tiles are immutable per zoom/x/y so they get `CacheFirst` with a 30-day TTL. Style and sprite JSON change occasionally so they get `StaleWhileRevalidate`. Your own route GeoJSON files get `StaleWhileRevalidate` so a returning user sees instant content but gets fresh data in the background. This matches the published Google Maps PWA pattern: *"Google Maps employs a stale-while-revalidate strategy for map tiles, ensuring that users receive fast responses while keeping the cache updated."*

**Mapbox-specific caveat:** Mapbox's terms permit client-side caching for offline use but **the public CDN cache cannot be invalidated** — the Mapbox docs explicitly state the CDN cache cannot be broken, and the device cache TTL for vector tiles is 12 hours by default. Your service worker cache extends that, but if Mapbox updates a style you may see stale tiles until the cache expires. Acceptable for a demo.

**iOS Safari "Add to Home Screen" — the must-do checklist (2025):**

iOS PWA support has improved significantly since iOS 16.4 (push notifications) but still has quirks. Make sure your `<head>` contains:

```html
<!-- iOS will use this if manifest icons fail to load in time -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<!-- Tells iOS to launch in standalone mode -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<!-- Status bar appearance -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<!-- Title under the icon on Home Screen -->
<meta name="apple-mobile-web-app-title" content="JeepTrack" />
<!-- Viewport (already standard but critical) -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**Critical iOS gotchas — verified against firt.dev, web.dev, and the MagicBell 2026 iOS limits guide:**

1. **No automatic install prompt on Safari.** Users must tap Share → "Add to Home Screen" manually. Add an onboarding screen that shows them this; do **not** rely on `beforeinstallprompt` (it's not supported on iOS).
2. **`apple-touch-icon` overrides manifest icons on older iOS.** firt.dev explicitly notes: *"Before iOS 15.4, icons for PWAs can only be set by the non-standard `<link>` element with rel=apple-touch-icon. If you still have that element, it overrides your manifest icons declaration."* Ship both.
3. **Safari does NOT generate splash screens from the manifest** the way Android does — you must provide static `apple-touch-startup-image` `<link>` tags per device size, or accept a white flash on launch. Use `pwa-asset-generator` (the npm tool) to spit out the full matrix.
4. **`100vh` includes Safari's bottom bar** and causes layout jumps. Use `100dvh` or the `-webkit-fill-available` fallback for the map container.
5. **iOS 17.4 in the EU disabled standalone PWA mode briefly** — Apple reversed this after pushback, so PWAs work in the EU again, but stay alert if your audience is European.
6. **Don't use deprecated meta tags AS A FALLBACK** if the manifest fails — web.dev warns this can give an inferior, confusing install experience.
7. **Service workers on iOS cache aggressively.** Force an update check on app open: `navigator.serviceWorker.getRegistration().then(r => r?.update())`.

**Mapbox-offline reality check:** A jeepney tracker realistically can't be "fully offline" — Mapbox GL JS tiles require network. You CAN cache the visible Cebu metro at a few zoom levels so a returning user sees the map instantly even on flaky 3G. For true offline, you'd need to switch to MapLibre + self-hosted PMTiles, which is a bigger architectural choice than a demo warrants.

---

## Details

### Routes seed file structure recommendation

Build a single `routes.json` with this shape — Claude Code can generate the rest:

```ts
type Route = {
  code: string;             // "04B"
  name: string;             // "Lahug – Carbon"
  color: string;            // hex for the polyline
  directions: {
    outbound: Waypoint[];
    inbound: Waypoint[];
  };
  fare: { min: number; perKm: number };
  type: 'traditional' | 'modern';
};
```

**Current LTFRB fare (effective March 19, 2026):** traditional jeep ₱14 minimum + ₱2.00/km after 4 km; modern jeep ₱17 minimum + ₱2.30/km. This is per LTFRB Chair Vigor Mendoza II's March 17, 2026 announcement reported by the Philippine News Agency: *"The LTFRB has approved a PHP1 increase in the minimum fare of traditional jeepneys (from PHP13 to PHP14)... while modern jeepneys will have a PHP2 increase in the minimum fare (from PHP15 to PHP17) plus PHP2.30 for every succeeding kilometer."* Show these values in the route card UI for authenticity. (The older ₱13 / ₱15 minimums you may still see on commutetour.com reflect the Oct 8, 2023 schedule — out of date as of March 19, 2026.)

### Microcopy file recommendation

Create `src/i18n/bisaya.ts` with `Record<AppState, BisayaPhrase>` and use Bisaya as the default; let users toggle to English. This is a Cebu app — Bisaya-first is the differentiator.

### Mapbox React minimal initialization (Pattern A)

```tsx
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export function CebuMap() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !container.current) return; // StrictMode guard
    map.current = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [123.8854, 10.3157], // Cebu City
      zoom: 12.5,
      pitch: 30
    });
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  return <div ref={container} style={{ width: '100%', height: '100dvh' }} />;
}
```

---

## Recommendations

**Phase 1 — Day 1 (skeleton):**
1. `npm create vite@latest jeeptrack-cebu -- --template react-ts`
2. Install: `mapbox-gl @turf/turf framer-motion vite-plugin-pwa workbox-window`
3. Drop in the `vite.config.ts` and `CebuMap` snippets above.
4. Hardcode **one** route (04B) with the 9 waypoints I gave you. Animate one jeep along it with the Turf `along` + `bearing` + rAF pattern.
5. Confirm the app installs to your iPhone via Share → Add to Home Screen and opens in standalone mode.

**Phase 2 — Day 2 (the demo):**
1. Add 7 more routes (01K, 04C, 04I, 06B, 10H, 13B, 17B) from commutetour.com's stop lists. Use Google Maps to digitize 8–12 waypoints per route.
2. Add a Framer Motion bottom sheet with route picker + ETA card showing the Bisaya status phrases.
3. Add traffic congestion: tag 2–3 segments of Osmeña Blvd and Colon with `congestion: 0.4` and watch the jeeps slow down.
4. Run Lighthouse PWA audit and resolve any orange flags (almost always missing icon sizes or missing `theme_color`).

**Phase 3 — Polish:**
1. Generate iOS splash images with `pwa-asset-generator` from a single 1024x1024 SVG.
2. Add a "How to install" onboarding modal that detects iOS Safari and shows the Share-icon instructions (Chrome on Android gets the native install banner for free).
3. If you want the wow factor: switch to `mapbox://styles/mapbox/standard` with `lightPreset: 'night'` and 3D buildings turned on, but profile on a mid-range Android first.

**Benchmarks that would change these recommendations:**
- If your demo needs **true offline** (no network at all): swap Mapbox GL → MapLibre + self-hosted PMTiles of Cebu only, ~50–100 MB precached. Bigger lift.
- If you'll animate **30+ jeeps simultaneously**: keep the marker layer as a single GeoJSON source with all jeeps as features (one Mapbox layer, not 30 DOM markers). Mapbox handles thousands of features in a single source effortlessly.
- If your audience is primarily **commuters on data caps**: switch the map tile cache to `CacheFirst` (already configured) and pre-warm the cache for Cebu metro on first launch.

---

## Caveats

- **commutetour.com's route lists are crowd-maintained and may lag actual on-the-ground routes.** Sinulog and other festivals trigger LTFRB re-routings several times a year. For a demo it's fine; for a production app, partner with LTFRB-7 or the Cebu City Traffic Management.
- **"10B" appears in some older lists but is not in any current 2024–2025 source** I could find. The subagent confirmed it's not in Sugbo.ph (June 2024), Laruy-laruy sa Sugbo, or the cebujeepneys.weebly reference list. Use 10F/10G/10H/10M instead, or treat "10B" as a fictional demo route if you specifically need that code.
- **Fares change frequently** — the March 2026 increase is the third in 30 months. Store fare values in a config file, not hardcoded in components.
- **Mapbox v3 + the Standard style is dazzling but heavy on mid-range Android.** Test on a real device, not just your laptop. The classic `navigation-night-v1` is much lighter and recommended for the default.
- **The "embedded Google Maps" on commutetour.com are placeholders** in the page structure — there's no machine-readable path data to scrape. Plan to manually digitize each route from the road-name list, which takes 5–10 min per route in Google Maps' "Add directions" tool.
- **Bisaya microcopy validation: have a native Cebuano speaker review the final strings before launch.** Tone and verb conjugation vary by context, and what reads as friendly to me may read as terse to a Cebuano commuter. The mappings above are conservative — every phrase listed is corroborated by at least two independent sources (TalkBisaya, italki, Southpole Hotel Cebu, bisayacebuano.com).
- **Mapbox pricing:** GL JS v3 bills per map load. For a demo this is free (50,000 map loads/month free tier as of writing), but if this ever goes public, switch to `react-map-gl`'s `reuseMaps` prop to avoid re-billing on mount/unmount cycles.
- **iOS Safari PWAs do not get true background sync, background push processing, or app shortcuts** — accept this as a constraint, don't fight it. If you need any of those, the right tool is a native iOS app, not a PWA.