/**
 * StationsList Component
 *
 * List of metro stations with timeline view
 */

import { View, Text } from "react-native";
import { StationItem } from "./StationItem";
import { colors } from "@/constants";
import type { Stop, WithClassName } from "@/types";

interface StationsListProps extends WithClassName {
  /** Array of stations */
  stations: Stop[];
  /** Direction name for header */
  directionName?: string;
  /** Show header */
  showHeader?: boolean;
  /** Line color */
  lineColor?: string;
}

export function StationsList({
  stations,
  directionName,
  showHeader = true,
  lineColor = colors.rta.orange,
  className = "",
}: StationsListProps) {
  if (stations.length === 0) {
    return (
      <View className="py-4 items-center">
        <Text className="text-text-muted">No stations available</Text>
      </View>
    );
  }

  return (
    <View className={className}>
      {/* Header */}
      {showHeader && directionName && (
        <View className="flex-row items-center mb-3">
          <Text className="text-lg font-semibold" style={{ color: lineColor }}>
            {directionName}
          </Text>
          <Text className="ml-2 text-sm text-text-secondary">
            ({stations.length} stations)
          </Text>
        </View>
      )}

      {/* Stations List */}
      {stations.map((station, index) => (
        <StationItem
          key={station.stop_id}
          station={station}
          index={index}
          total={stations.length}
          isFirst={index === 0}
          isLast={index === stations.length - 1}
          lineColor={lineColor}
        />
      ))}
    </View>
  );
}
