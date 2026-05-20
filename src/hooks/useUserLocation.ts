import { useEffect, useState } from 'react';
import { FUENTE_FALLBACK } from '../data/routes';
import type { UserLocation } from '../types';

const FALLBACK: UserLocation = {
  lng: FUENTE_FALLBACK[0],
  lat: FUENTE_FALLBACK[1],
  source: 'fallback',
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>(FALLBACK);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const timeout = window.setTimeout(() => {
      setLocation((prev) => (prev.source === 'gps' ? prev : FALLBACK));
    }, 10_000);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          source: 'gps',
        });
      },
      () => setLocation(FALLBACK),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
    );

    return () => {
      clearTimeout(timeout);
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return location;
}
