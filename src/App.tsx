import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheet, useLastUpdatedSec, type SheetSnap } from './components/BottomSheet/BottomSheet';
import { RouteChipBar } from './components/BottomSheet/RouteChip';
import { DriverHUD } from './components/DriverMode/DriverHUD';
import { DriverTopBar } from './components/DriverMode/DriverTopBar';
import { CebuMap } from './components/Map/CebuMap';
import { ModeToggle } from './components/UI/ModeToggle';
import { Spinner } from './components/UI/Spinner';
import { Toast } from './components/UI/Toast';
import { DRIVER_ROUTE_CODE, ROUTES } from './data/routes';
import { useDriverSimulation } from './hooks/useDriverSimulation';
import { computeJeepneyViews, jeepToView, useJeepneyViews } from './hooks/useJeepneys';
import { useRouteGeometries } from './hooks/useRouteGeometries';
import { useSimulation } from './hooks/useSimulation';
import { useUserLocation } from './hooks/useUserLocation';
import type { DriverMapState, MapController, MapRenderOptions } from './map/mapController';
import type { AppMode, MicrocopyKey } from './types';

export default function App() {
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
  const driverSim = useDriverSimulation(driverGeometry, mode === 'driver');

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

  const driverMode = mode === 'driver';

  const mapRenderOptions: MapRenderOptions = useMemo(
    () => ({
      visibleRoutes,
      selectedJeepId,
      driverMode,
      driverState: null,
      userLocation,
      pulsePhase: 0,
    }),
    [visibleRoutes, selectedJeepId, driverMode, userLocation],
  );

  useEffect(() => {
    setMapRenderOptions(mapRenderOptions);
  }, [mapRenderOptions, setMapRenderOptions]);

  useEffect(() => {
    if (!driverMode) {
      driverMapStateRef.current = null;
      return;
    }
    let raf = 0;
    const tick = () => {
      driverSim.syncMapStateRef(driverMapStateRef);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [driverMode, driverSim]);

  /** First tap: select + half sheet. Second tap on same jeep: open detail. */
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

  const showSpinner = routesLoading || !mapReady;

  return (
    <div className="app-shell">
      {showSpinner && <Spinner />}

      {!routesLoading && (
        <CebuMap
          geometries={geometries}
          mapControllerRef={mapControllerRef}
          mapRenderOptions={mapRenderOptions}
          onJeepSelect={handleJeepPress}
          onMapReady={() => setMapReady(true)}
        />
      )}

      {mapReady && !routesLoading && (
        <>
          {driverMode ? (
            <DriverTopBar />
          ) : (
            <header className="top-bar">
              <div className="logo">
                <span className="logo-mark">JT</span>
                <span className="logo-text">JeepTrack</span>
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
