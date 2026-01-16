/**
 * MetroLineCard Component
 *
 * Displays a metro line with color indicator
 */

import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/common";
import { colors } from "@/constants";
import { getMetroLineColor } from "@/utils";
import type { MetroLine, WithClassName, WithOnPress } from "@/types";

interface MetroLineCardProps extends WithClassName, WithOnPress {
  /** Metro line data */
  line: MetroLine;
}

export function MetroLineCard({
  line,
  onPress,
  className = "",
}: MetroLineCardProps) {
  const lineColor = getMetroLineColor(line.line_name);

  return (
    <Card
      variant="elevated"
      onPress={onPress}
      className={`mb-3 ${className}`}
      padded={false}
    >
      <View className="flex-row items-center">
        {/* Color Bar */}
        <View
          className="w-2 self-stretch rounded-l-card"
          style={{ backgroundColor: lineColor }}
        />

        <View className="flex-1 p-4 flex-row items-center">
          {/* Metro Icon */}
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${lineColor}20` }}
          >
            <Ionicons name="subway" size={24} color={lineColor} />
          </View>

          {/* Line Info */}
          <View className="flex-1">
            {/* Line Name */}
            <Text
              className="text-lg font-semibold"
              style={{ color: lineColor }}
            >
              {line.line_name}
            </Text>

            {/* Terminals */}
            <Text
              className="text-sm text-text-secondary mt-1"
              numberOfLines={1}
            >
              {line.from_station} ↔ {line.to_station}
            </Text>

            {/* Station Count */}
            <Text className="text-xs text-text-muted mt-1">
              {line.total_stations} stations
            </Text>
          </View>

          {/* Chevron */}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.muted}
          />
        </View>
      </View>
    </Card>
  );
}
