# JeepTrack Cebu

Mobile-first PWA demo — simulated real-time jeepney tracking for Cebu City (Math 10 pitch, UP Cebu).

## Stack

- Vite + React + TypeScript
- Mapbox GL JS v3 (`navigation-night-v1`)
- Framer Motion, Turf.js, vite-plugin-pwa

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment file and add your Mapbox token:

```bash
cp .env.example .env
```

Set `VITE_MAPBOX_TOKEN` from [Mapbox account](https://account.mapbox.com/) (public token with URL restrictions recommended).

3. Run locally:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Deploy (Vercel)

1. Push to GitHub and import in Vercel, or use `vercel` CLI.
2. Add environment variable `VITE_MAPBOX_TOKEN` in project settings.
3. Deploy — [`vercel.json`](vercel.json) handles SPA routing.

## Install on iPhone (demo)

1. Open the deployed URL in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Launch **JeepTrack** from the home screen (standalone, no Safari chrome).

Use `100dvh` layout so the map fills the screen above the iOS home indicator.

## Demo features

- 6 routes, 20 simulated jeepneys
- Passenger mode: route filters, bottom sheet, Bisaya status copy, fare estimates
- Driver mode: Route 04C, trip controls, off-route simulation toast
- Geolocation with Fuente Osmeña fallback

## Presentation checklist

- [ ] Mapbox token set in `.env` / Vercel
- [ ] `npm run build` passes
- [ ] iPhone PWA installed and opened fullscreen
- [ ] Live jeepneys visible; tap one for detail
- [ ] Route chip filter works
- [ ] Driver Mode → Start Trip → Simulate off-route toast
