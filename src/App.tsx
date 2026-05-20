import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheet, useLastUpdatedSec, type SheetSnap } from './components/BottomSheet/BottomSheet';
import { RouteChipBar } from './components/BottomSheet/RouteChip';
import { DriverHUD } from './components/DriverMode/DriverHUD';
import { DriverTopBar } from './components/DriverMode/DriverTopBar';
import { Onboarding, readOnboardingSeen, markOnboardingSeen } from './components/Onboarding/Onboarding';
import { ModeToggle } from './components/UI/ModeToggle';
import { Spinner } from './components/UI/Spinner';
import { Toast } from './components/UI/Toast';
import { DRIVER_ROUTE_CODE, ROUTES } from './data/routes';
import { useDriverSimulation } from './hooks/useDriverSimulation';
import { computeJeepneyViews, jeepToView, useJeepneyViews } from './hooks/useJeepneys';
import { useRouteGeometries } from './hooks/useRouteGeometries';
import { useSimulation } from './hooks/useSimulation';
import { useUserLocation } from './hooks/useUserLocation';
import type { DriverMapState, MapController } from './map/mapController';
import type { AppMode, MicrocopyKey } from './types';

const CebuMap = lazy(() =>
  import('./components/Map/CebuMap').then((m) => ({ default: m.CebuMap })),
);

export default function App() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(readOnboardingSeen);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mode, setMode] = useState<AppMode>('passenger');
  const [mapReady, setMapReady] = useState(false);
  const [routeFilter, setRouteFilter] = useState<string | 'all'>('all');
  const [selectedJeepId, setSelectedJeepId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');
  const [toastKey, setToastKey] = useState<MicrocopyKey | null>(null);

  const mapControllerRef = useRef<MapController | null>(null);
  const driverMapStateRef = useRef<DriverMapState | null>(null);

  const { geometries, geometryByCode, isLoading: routesLoading } = useRouteGeometries();

  const { jeepneysUI, getJeepneys, setMapRenderOptions } = useSimulation(
    mapControllerRef,
    driverMapStateRef,
    geometries,
    geometryByCode,
  );

  const userLocation = useUserLocation();
  const lastUpdatedSec = useLastUpdatedSec(jeepneysUI);

  const driverGeometry = geometryByCode[DRIVER_ROUTE_CODE];
  const driverMode = mode === 'driver';
  const driverSim = useDriverSimulation(driverGeometry, driverMode, driverMapStateRef);

  const jeepViews = useJeepneyViews(jeepneysUI, geometryByCode, userLocation, routeFilter);

  const sheetJeeps = useMemo(() => {
    if (!selectedJeepId || jeepViews.some((j) => j.id === selectedJeepId)) return jeepViews;
    const allViews = computeJeepneyViews(jeepneysUI, geometryByCode, userLocation, 'all');
    const found = allViews.find((j) => j.id === selectedJeepId);
    if (!found) {
      const jeep =
        jeepneysUI.find((j) => j.id === selectedJeepId) ??
        getJeepneys().find((j) => j.id === selectedJeepId);
      if (!jeep) return jeepViews;
      return [jeepToView(jeep, geometryByCode, userLocation), ...jeepViews];
    }
    return [found, ...jeepViews];
  }, [jeepViews, selectedJeepId, jeepneysUI, geometryByCode, userLocation, getJeepneys]);

  const visibleRoutes = useMemo(() => {
    if (routeFilter === 'all') return 'all' as const;
    return new Set([routeFilter]);
  }, [routeFilter]);

  useEffect(() => {
    setMapRenderOptions({
      visibleRoutes,
      selectedJeepId,
      driverMode,
      driverState: null,
      userLocation,
      pulsePhase: 0,
    });
  }, [visibleRoutes, selectedJeepId, driverMode, userLocation, setMapRenderOptions]);

  const handleJeepPress = useCallback(
    (id: string | null) => {
      if (id === null) {
        setSelectedJeepId(null);
        setSheetSnap('half');
        return;
      }
      if (selectedJeepId === id && sheetSnap !== 'full') {
        setSheetSnap('full');
        return;
      }
      setSelectedJeepId(id);
      setSheetSnap('half');
    },
    [selectedJeepId, sheetSnap],
  );

  useEffect(() => {
    if (!selectedJeepId || driverMode) return;
    const jeep =
      jeepneysUI.find((j) => j.id === selectedJeepId) ??
      getJeepneys().find((j) => j.id === selectedJeepId);
    if (!jeep) return;
    mapControllerRef.current?.flyToJeep(jeep.lng, jeep.lat);
  }, [selectedJeepId, driverMode, jeepneysUI, getJeepneys]);

  useEffect(() => {
    if (driverSim.driverUI.isOffRoute) setToastKey('off_route');
  }, [driverSim.driverUI.isOffRoute]);

  useEffect(() => {
    if (mode === 'driver') {
      setRouteFilter(DRIVER_ROUTE_CODE);
      setSelectedJeepId(null);
    }
  }, [mode]);

  if (!import.meta.env.VITE_MAPBOX_TOKEN) {
    return (
      <div className="app-shell token-missing">
        <h1>Mapbox token required</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env</code> and set{' '}
          <code>VITE_MAPBOX_TOKEN</code>.
        </p>
      </div>
    );
  }

  if (!hasSeenOnboarding || showOnboarding) {
    return (
      <div className="app-shell">
        <Onboarding
          onComplete={() => {
            markOnboardingSeen();
            setHasSeenOnboarding(true);
            setShowOnboarding(false);
          }}
        />
      </div>
    );
  }

  const showSpinner = routesLoading || !mapReady;
  const mountMap = !routesLoading;

  return (
    <div className="app-shell">
      {showSpinner && <Spinner />}

      {mountMap && (
        <Suspense fallback={null}>
          <CebuMap
            geometries={geometries}
            mapControllerRef={mapControllerRef}
            driverMode={driverMode}
            onJeepSelect={handleJeepPress}
            onMapReady={() => setMapReady(true)}
          />
        </Suspense>
      )}

      {mapReady && !routesLoading && (
        <>
          {driverMode ? (
            <DriverTopBar onShowIntro={() => setShowOnboarding(true)} />
          ) : (
            <header className="top-bar">
              <div className="top-bar-row">
                <div className="logo">
                  <img
                    src="/jt-logo.svg"
                    alt=""
                    className="logo-img"
                    width={160}
                    height={48}
                    decoding="async"
                    aria-hidden
                  />
                  <span className="logo-text" aria-label="JeepTrack">
                    <span className="logo-text-jeep">Jeep</span>
                    <span className="logo-text-track">Track</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="intro-btn"
                  onClick={() => setShowOnboarding(true)}
                  aria-label="View intro and install help"
                >
                  Intro
                </button>
              </div>
              <RouteChipBar routes={ROUTES} active={routeFilter} onSelect={setRouteFilter} />
            </header>
          )}

          {!driverMode && (
            <BottomSheet
              nearbyCount={jeepViews.length}
              jeeps={sheetJeeps}
              selectedId={selectedJeepId}
              onSelectJeep={handleJeepPress}
              snap={sheetSnap}
              onSnapChange={setSheetSnap}
              lastUpdatedSec={lastUpdatedSec}
            />
          )}

          {driverMode && (
            <DriverHUD
              driver={driverSim.driverUI}
              onToggleTrip={() => driverSim.setTripActive((v) => !v)}
              onSimulateOffRoute={() => {
                driverSim.simulateOffRoute();
                setToastKey('off_route');
              }}
            />
          )}

          <ModeToggle
            mode={mode}
            onToggle={() => setMode((m) => (m === 'passenger' ? 'driver' : 'passenger'))}
          />

          <Toast messageKey={toastKey} onDismiss={() => setToastKey(null)} />
        </>
      )}
    </div>
  );
}
