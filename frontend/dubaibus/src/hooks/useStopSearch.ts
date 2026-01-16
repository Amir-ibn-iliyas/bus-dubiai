/**
 * useStopSearch Hook
 *
 * Hook for searching stops by name
 */

import { useState, useCallback } from "react";
import { initDatabase, searchStops as dbSearchStops } from "@/database";
import type { Stop, LoadingState } from "@/types";

interface UseStopSearchReturn extends LoadingState {
  /** Search results */
  results: Stop[];
  /** Search function */
  search: (query: string, transportType?: "Bus" | "Metro") => Promise<void>;
  /** Clear results */
  clear: () => void;
}

export function useStopSearch(): UseStopSearchReturn {
  const [results, setResults] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search stops
  const search = useCallback(
    async (query: string, transportType?: "Bus" | "Metro") => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        await initDatabase();
        const data = await dbSearchStops(query, transportType);
        setResults(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
        console.error("useStopSearch error:", e);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Clear results
  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clear,
  };
}
