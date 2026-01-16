/**
 * useBuses Hook
 *
 * Hook for fetching and searching buses from offline database
 */

import { useState, useEffect, useCallback } from "react";
import {
  initDatabase,
  getAllBuses,
  searchBuses as dbSearchBuses,
} from "@/database";
import type { BusRoute, LoadingState } from "@/types";

interface UseBusesReturn extends LoadingState {
  /** All bus routes */
  buses: BusRoute[];
  /** Search results */
  searchResults: BusRoute[];
  /** Search function */
  search: (query: string) => Promise<void>;
  /** Clear search */
  clearSearch: () => void;
  /** Refresh buses */
  refresh: () => Promise<void>;
}

export function useBuses(): UseBusesReturn {
  const [buses, setBuses] = useState<BusRoute[]>([]);
  const [searchResults, setSearchResults] = useState<BusRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all buses on mount
  const fetchBuses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Ensure database is initialized
      await initDatabase();
      const data = await getAllBuses();
      setBuses(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load buses");
      console.error("useBuses error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search buses
  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      await initDatabase();
      const results = await dbSearchBuses(query);
      setSearchResults(results);
    } catch (e) {
      console.error("Search error:", e);
      setSearchResults([]);
    }
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  // Load on mount
  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  return {
    buses,
    searchResults,
    isLoading,
    error,
    search,
    clearSearch,
    refresh: fetchBuses,
  };
}
