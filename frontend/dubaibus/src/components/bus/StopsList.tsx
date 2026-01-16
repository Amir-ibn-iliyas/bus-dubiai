/**
 * StopsList Component
 *
 * List of stops with timeline view
 */

import { View, Text, FlatList } from "react-native";
import { StopItem } from "./StopItem";
import type { Stop, WithClassName } from "@/types";

interface StopsListProps extends WithClassName {
  /** Array of stops */
  stops: Stop[];
  /** Direction name for header */
  directionName?: string;
  /** Show header */
  showHeader?: boolean;
}

export function StopsList({
  stops,
  directionName,
  showHeader = true,
  className = "",
}: StopsListProps) {
  if (stops.length === 0) {
    return (
      <View className="py-4 items-center">
        <Text className="text-text-muted">No stops available</Text>
      </View>
    );
  }

  return (
    <View className={className}>
      {/* Header */}
      {showHeader && directionName && (
        <View className="flex-row items-center mb-3">
          <Text className="text-lg font-semibold text-rta-blue">
            {directionName}
          </Text>
          <Text className="ml-2 text-sm text-text-secondary">
            ({stops.length} stops)
          </Text>
        </View>
      )}

      {/* Stops List */}
      {stops.map((stop, index) => (
        <StopItem
          key={stop.stop_id}
          stop={stop}
          index={index}
          total={stops.length}
          isFirst={index === 0}
          isLast={index === stops.length - 1}
        />
      ))}
    </View>
  );
}
