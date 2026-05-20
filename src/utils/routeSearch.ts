import type { Route } from '../types';

export type SearchResult = {
  route: Route;
  matchedText: string;
  score: number;
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function searchRoutes(query: string, routes: Route[]): SearchResult[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const route of routes) {
    const codeNorm = normalize(route.code);
    const nameNorm = normalize(route.name);
    let score = 0;
    let matchedText = route.code;

    if (codeNorm === q) {
      score = 100;
      matchedText = route.code;
    } else if (codeNorm.startsWith(q)) {
      score = 90;
      matchedText = route.code;
    } else if (nameNorm.startsWith(q)) {
      score = 70;
      matchedText = route.name;
    } else if (nameNorm.includes(q)) {
      score = 60;
      matchedText = route.name;
    } else {
      for (const wp of route.waypoints) {
        const wpNorm = normalize(wp.name);
        if (wpNorm.includes(q)) {
          score = wpNorm.startsWith(q) ? 50 : 40;
          matchedText = `${wp.name} — ${route.code}`;
          break;
        }
      }
    }

    if (score > 0) {
      results.push({ route, matchedText, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
