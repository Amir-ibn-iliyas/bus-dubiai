/**
 * useJourneySearch Hook
 *
 * Hook for finding routes between two stops
 */

import { useState, useCallback } from "react";
import {
  initDatabase,
  findDirectRoutes,
  findTransferRoutes,
  type FoundRoute,
} from "@/database";
import type { Stop, LoadingState } from "@/types";

interface UseJourneySearchReturn extends LoadingState {
  /** Found routes */
  routes: FoundRoute[];
  /** Search function */
  search: (fromStop: Stop, toStop: Stop) => Promise<void>;
  /** Clear results */
  clear: () => void;
}

export function useJourneySearch(): UseJourneySearchReturn {
  const [routes, setRoutes] = useState<FoundRoute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search for routes
  const search = useCallback(async (fromStop: Stop, toStop: Stop) => {
    if (!fromStop || !toStop) {
      setError("Please select both stops");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await initDatabase();

      // 1. Try finding direct routes first
      let directResults = await findDirectRoutes(
        fromStop.stop_id,
        toStop.stop_id
      );

      if (directResults.length > 0) {
        setRoutes(directResults);
      } else {
        // 2. If no direct routes, look for transfer routes
        let transferResults = await findTransferRoutes(
          fromStop.stop_id,
          toStop.stop_id
        );
        setRoutes(transferResults);

        if (transferResults.length === 0) {
          setError("No routes found between these stops");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to search routes");
      console.error("useJourneySearch error:", e);
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear results
  const clear = useCallback(() => {
    setRoutes([]);
    setError(null);
  }, []);

  return {
    routes,
    isLoading,
    error,
    search,
    clear,
  };
}
