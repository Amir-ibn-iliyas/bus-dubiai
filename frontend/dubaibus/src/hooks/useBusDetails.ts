/**
 * useBusDetails Hook
 *
 * Hook for fetching single bus details with stops
 */

import { useState, useEffect, useCallback } from "react";
import { initDatabase, getBusDetails as dbGetBusDetails } from "@/database";
import type { BusDetails, LoadingState } from "@/types";

interface UseBusDetailsReturn extends LoadingState {
  /** Bus details with directions and stops */
  bus: BusDetails | null;
  /** Refresh data */
  refresh: () => Promise<void>;
}

export function useBusDetails(busId: string): UseBusDetailsReturn {
  const [bus, setBus] = useState<BusDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bus details
  const fetchBusDetails = useCallback(async () => {
    if (!busId) {
      setError("No bus ID provided");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await initDatabase();
      const data = await dbGetBusDetails(busId);

      if (data) {
        setBus(data);
      } else {
        setError("Bus not found");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bus details");
      console.error("useBusDetails error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [busId]);

  // Load on mount or when busId changes
  useEffect(() => {
    fetchBusDetails();
  }, [fetchBusDetails]);

  return {
    bus,
    isLoading,
    error,
    refresh: fetchBusDetails,
  };
}
