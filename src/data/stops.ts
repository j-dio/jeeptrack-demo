import type { Waypoint } from '../types';
import { ROUTES } from './routes';

export type RouteStop = {
  name: string;
  lng: number;
  lat: number;
  bisayaLabel: string;
};

const STOP_LABELS: Record<string, string> = {
  'JY Square': 'JY Square',
  'Salinas Dr': 'Salinas Drive',
  'Gorordo Ave': 'Gorordo Ave',
  Capitol: 'Kapitolyo',
  'Fuente Osmeña': 'Fuente Circle',
  Colon: 'Colon Street',
  Carbon: 'Carbon Merkado',
  'UP Cebu': 'UP Cebu',
  'F. Ramos St': 'F. Ramos',
  'Junquera St': 'Junquera',
  Apas: 'Apas',
  'IT Park': 'IT Park Gate 1',
  Ayala: 'Ayala Sentro',
  'Osmeña Blvd': 'Osmeña Blvd',
  Bulacao: 'Bulacao',
  'V. Rama Ave': 'V. Rama',
  'V. Rama': 'V. Rama',
  'SM City Cebu': 'SM Syudad',
  Talamban: 'Talamban',
  Guadalupe: 'Guadalupe',
};

function toStop(wp: Waypoint): RouteStop {
  return {
    name: wp.name,
    lng: wp.lng,
    lat: wp.lat,
    bisayaLabel: STOP_LABELS[wp.name] ?? wp.name,
  };
}

export const STOPS_BY_ROUTE: Record<string, RouteStop[]> = Object.fromEntries(
  ROUTES.map((route) => [route.code, route.waypoints.map(toStop)]),
);
