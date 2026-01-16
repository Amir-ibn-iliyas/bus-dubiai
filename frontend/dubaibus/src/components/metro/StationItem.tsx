/**
 * StationItem Component
 *
 * Single station in a timeline view
 */

import { View, Text } from "react-native";
import { colors } from "@/constants";
import type { Stop, WithClassName } from "@/types";

interface StationItemProps extends WithClassName {
  /** Station data */
  station: Stop;
  /** Position in list */
  index: number;
  /** Total stations */
  total: number;
  /** Is first station */
  isFirst?: boolean;
  /** Is last station */
  isLast?: boolean;
  /** Line color */
  lineColor?: string;
}

export function StationItem({
  station,
  index,
  total,
  isFirst = false,
  isLast = false,
  lineColor = colors.rta.orange,
  className = "",
}: StationItemProps) {
  return (
    <View className={`flex-row items-stretch ${className}`}>
      {/* Timeline */}
      <View className="w-8 items-center">
        {/* Top Line */}
        {!isFirst && (
          <View className="w-0.5 h-3" style={{ backgroundColor: lineColor }} />
        )}

        {/* Dot */}
        <View
          className={`
            rounded-full border-2
            ${isFirst || isLast ? "w-4 h-4" : "w-3 h-3"}
          `}
          style={{
            borderColor: lineColor,
            backgroundColor: isFirst || isLast ? lineColor : "white",
          }}
        />

        {/* Bottom Line */}
        {!isLast && (
          <View
            className="w-0.5 flex-1 min-h-[16px]"
            style={{ backgroundColor: `${lineColor}50` }}
          />
        )}
      </View>

      {/* Station Info */}
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
          {station.stop_name}
        </Text>

        {/* Station indicator */}
        {(isFirst || isLast) && (
          <Text className="text-xs text-text-muted mt-1">
            {isFirst ? "Terminal" : "Terminal"}
          </Text>
        )}
      </View>
    </View>
  );
}
