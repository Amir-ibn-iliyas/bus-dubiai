/**
 * useMetroLines Hook
 *
 * Hook for fetching all metro lines from offline database
 */

import { useState, useEffect, useCallback } from "react";
import { initDatabase, getAllMetroLines } from "@/database";
import type { MetroLine, LoadingState } from "@/types";

interface UseMetroLinesReturn extends LoadingState {
  /** All metro lines */
  lines: MetroLine[];
  /** Refresh data */
  refresh: () => Promise<void>;
}

export function useMetroLines(): UseMetroLinesReturn {
  const [lines, setLines] = useState<MetroLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all metro lines
  const fetchLines = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await initDatabase();
      const data = await getAllMetroLines();
      setLines(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metro lines");
      console.error("useMetroLines error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  return {
    lines,
    isLoading,
    error,
    refresh: fetchLines,
  };
}
