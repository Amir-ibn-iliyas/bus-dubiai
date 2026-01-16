/**
 * useJourneyDetails Hook
 *
 * Hook for fetching detailed stop path for a found route
 */

import { useState, useEffect, useCallback } from "react";
import { initDatabase, getJourneyLegStops, type FoundRoute } from "@/database";
import type { Stop, LoadingState } from "@/types";

export interface JourneyLeg {
  route_id: string;
  route_name: string;
  transport_type: "Bus" | "Metro";
  color: string;
  stops: Stop[];
  direction: string;
  from_stop_name: string;
  to_stop_name: string;
}

interface UseJourneyDetailsReturn extends LoadingState {
  legs: JourneyLeg[];
  refresh: () => Promise<void>;
}

export function useJourneyDetails(
  route: FoundRoute | null
): UseJourneyDetailsReturn {
  const [legs, setLegs] = useState<JourneyLeg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!route) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await initDatabase();

      const newLegs: JourneyLeg[] = [];

      // Fetch first/main leg
      const leg1Stops = await getJourneyLegStops(
        route.pattern_id,
        route.from_seq,
        route.to_seq
      );

      newLegs.push({
        route_id: route.route_id,
        route_name:
          route.type === "transfer"
            ? route.route_name.split(" ➔ ")[0]
            : route.route_name,
        transport_type: route.transport_type,
        color: route.color,
        stops: leg1Stops,
        direction: route.direction.split(" via ")[0], // Simplify direction
        from_stop_name: leg1Stops[0]?.stop_name || route.from_stop,
        to_stop_name:
          leg1Stops[leg1Stops.length - 1]?.stop_name ||
          (route.type === "transfer"
            ? route.transfer_stop_name!
            : route.to_stop),
      });

      // Fetch second leg if transfer
      if (route.type === "transfer" && route.leg2_pattern_id !== undefined) {
        const leg2Stops = await getJourneyLegStops(
          route.leg2_pattern_id,
          route.leg2_from_seq!,
          route.leg2_to_seq!
        );

        newLegs.push({
          route_id: route.leg2_route_id!,
          route_name: route.leg2_name!,
          transport_type:
            route.leg2_color === "E21836" || route.leg2_color === "4CAF50"
              ? "Metro"
              : "Bus", // Heuristic if not explicitly stored
          color: route.leg2_color!,
          stops: leg2Stops,
          direction: `To ${leg2Stops[leg2Stops.length - 1]?.stop_name}`,
          from_stop_name: leg2Stops[0]?.stop_name || route.transfer_stop_name!,
          to_stop_name:
            leg2Stops[leg2Stops.length - 1]?.stop_name || route.to_stop,
        });
      }

      setLegs(newLegs);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load journey details"
      );
      console.error("useJourneyDetails error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [route]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    legs,
    isLoading,
    error,
    refresh: fetchDetails,
  };
}
