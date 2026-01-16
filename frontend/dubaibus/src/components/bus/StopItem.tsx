/**
 * StopItem Component
 *
 * Single stop in a timeline view
 */

import { View, Text } from "react-native";
import { colors } from "@/constants";
import type { Stop, WithClassName } from "@/types";

interface StopItemProps extends WithClassName {
  /** Stop data */
  stop: Stop;
  /** Position in list */
  index: number;
  /** Total stops */
  total: number;
  /** Is first stop */
  isFirst?: boolean;
  /** Is last stop */
  isLast?: boolean;
}

export function StopItem({
  stop,
  index,
  total,
  isFirst = false,
  isLast = false,
  className = "",
}: StopItemProps) {
  return (
    <View className={`flex-row items-stretch ${className}`}>
      {/* Timeline */}
      <View className="w-8 items-center">
        {/* Top Line */}
        {!isFirst && <View className="w-0.5 h-3 bg-rta-orange" />}

        {/* Dot */}
        <View
          className={`
            w-3 h-3 rounded-full 
            ${isFirst || isLast ? "bg-rta-orange" : "bg-rta-orange/50"}
            ${isFirst || isLast ? "w-4 h-4" : ""}
          `}
        />

        {/* Bottom Line */}
        {!isLast && (
          <View className="w-0.5 flex-1 bg-rta-orange/30 min-h-[16px]" />
        )}
      </View>

      {/* Stop Info */}
      <View className="flex-1 pb-4">
        <Text
          className={`
            text-base
            ${
              isFirst || isLast
                ? "font-semibold text-text-primary"
                : "text-text-secondary"
            }
          `}
          numberOfLines={2}
        >
          {stop.stop_name}
        </Text>

        {/* Stop number indicator */}
        {(isFirst || isLast) && (
          <Text className="text-xs text-text-muted mt-1">
            {isFirst ? "First Stop" : "Last Stop"}
          </Text>
        )}
      </View>
    </View>
  );
}
