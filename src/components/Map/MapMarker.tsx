import { memo } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { Bus } from 'lucide-react';

type UserLocationMarkerProps = {
  className?: string;
};

export const UserLocationMarker = memo(function UserLocationMarker({
  className = '',
}: UserLocationMarkerProps) {
  return (
    <div
      className={`relative flex h-8 w-8 items-center justify-center ${className}`}
      aria-hidden
    >
      <span className="absolute inset-0 rounded-full bg-[#fcd116]/35 animate-ping" />
      <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-[#0a0f1e] bg-[#fcd116] shadow-[0_0_12px_rgba(252,209,22,0.85)]" />
    </div>
  );
});

type JeepneyMarkerIconProps = {
  routeCode: string;
  color: string;
  bearing?: number;
  selected?: boolean;
};

export const JeepneyMarkerIcon = memo(function JeepneyMarkerIcon({
  routeCode,
  color,
  bearing = 0,
  selected = false,
}: JeepneyMarkerIconProps) {
  return (
    <div
      className={`jeepney-map-marker ${selected ? 'jeepney-map-marker--selected' : ''}`}
      style={{ transform: `rotate(${bearing}deg)` }}
    >
      <div
        className={`flex flex-col items-center rounded-xl border bg-white px-2 py-1 shadow-lg drop-shadow-md ${
          selected ? 'border-[#fcd116] ring-2 ring-[#fcd116]/50' : 'border-white/90'
        }`}
      >
        <Bus size={14} strokeWidth={2.5} color={color} aria-hidden />
        <span className="text-[10px] font-extrabold leading-none" style={{ color }}>
          {routeCode}
        </span>
      </div>
    </div>
  );
});

const USER_MARKER_HTML =
  '<div class="relative flex h-8 w-8 items-center justify-center" aria-hidden="true">' +
  '<span class="absolute inset-0 rounded-full bg-[#fcd116]/35 animate-ping"></span>' +
  '<span class="relative block h-3.5 w-3.5 rounded-full border-2 border-[#0a0f1e] bg-[#fcd116] shadow-[0_0_12px_rgba(252,209,22,0.85)]"></span>' +
  '</div>';

export function createUserLocationMarkerElement(): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = USER_MARKER_HTML;
  return wrap.firstElementChild as HTMLDivElement;
}

export function loadJeepneyMapImage(map: MapboxMap): Promise<void> {
  if (map.hasImage('jeepney')) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!map.hasImage('jeepney')) {
        map.addImage('jeepney', img, { sdf: true, pixelRatio: 2 });
      }
      resolve();
    };
    img.onerror = () => reject(new Error('Failed to load jeepney marker'));
    img.src = '/jeepney-marker.svg';
  });
}
