import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Route } from '../../types';
import { searchRoutes, type SearchResult } from '../../utils/routeSearch';

type RouteSearchProps = {
  routes: Route[];
  onSelect: (code: string) => void;
  compact?: boolean;
};

export function RouteSearch({ routes, onSelect, compact }: RouteSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setResults(searchRoutes(query, routes));
    }, 150);
    return () => clearTimeout(timer);
  }, [query, routes]);

  useEffect(() => {
    if (compact) inputRef.current?.focus();
  }, [compact]);

  function handleSelect(code: string) {
    setQuery('');
    setResults([]);
    onSelect(code);
  }

  if (compact) {
    return (
      <div className="header-search">
        <Search size={16} className="header-search-icon" aria-hidden />
        <input
          ref={inputRef}
          className="header-search-input"
          type="search"
          placeholder="Search route or landmark…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          aria-label="Search routes"
        />
        {results.length > 0 && (
          <ul className="header-search-results" role="listbox">
            {results.map(({ route, matchedText }) => (
              <li key={route.code}>
                <button
                  type="button"
                  className="header-search-result"
                  onClick={() => handleSelect(route.code)}
                  role="option"
                  aria-selected="false"
                >
                  <span className="header-search-result-dot" style={{ background: route.color }} />
                  <span className="header-search-result-text">{matchedText}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="onboarding-search-interactive">
      <div className="onboarding-search-inputrow">
        <span className="onboarding-search-icon" aria-hidden>
          <Search size={20} strokeWidth={2.25} />
        </span>
        <div className="onboarding-search-fieldwrap">
          <input
            ref={inputRef}
            className="onboarding-search-input"
            type="search"
            placeholder="Try Carbon, JY Square, Fuente…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            aria-label="Search routes by landmark or code"
          />
        </div>
      </div>
      {results.length > 0 && (
        <ul className="onboarding-search-results" role="listbox">
          {results.map(({ route, matchedText }) => (
            <li key={route.code}>
              <button
                type="button"
                className="onboarding-search-result"
                onClick={() => handleSelect(route.code)}
                role="option"
                aria-selected="false"
              >
                <span className="onboarding-search-result-dot" style={{ background: route.color }} />
                <span className="onboarding-search-result-text">{matchedText}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
