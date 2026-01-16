/**
 * useMetroDetails Hook
 *
 * Hook for fetching single metro line details with stations
 */

import { useState, useEffect, useCallback } from "react";
import { initDatabase, getMetroDetails as dbGetMetroDetails } from "@/database";
import type { MetroDetails, LoadingState } from "@/types";

interface UseMetroDetailsReturn extends LoadingState {
  /** Metro line details with directions and stations */
  line: MetroDetails | null;
  /** Refresh data */
  refresh: () => Promise<void>;
}

export function useMetroDetails(lineId: string): UseMetroDetailsReturn {
  const [line, setLine] = useState<MetroDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch metro line details
  const fetchMetroDetails = useCallback(async () => {
    if (!lineId) {
      setError("No line ID provided");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await initDatabase();
      const data = await dbGetMetroDetails(lineId);

      if (data) {
        setLine(data);
      } else {
        setError("Metro line not found");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metro details");
      console.error("useMetroDetails error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [lineId]);

  // Load on mount or when lineId changes
  useEffect(() => {
    fetchMetroDetails();
  }, [fetchMetroDetails]);

  return {
    line,
    isLoading,
    error,
    refresh: fetchMetroDetails,
  };
}
