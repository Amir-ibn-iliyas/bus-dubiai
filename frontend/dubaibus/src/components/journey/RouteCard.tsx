/**
 * RouteCard Component
 *
 * Displays a found route in journey results
 */

import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/common";
import { colors } from "@/constants";
import type { WithClassName, WithOnPress } from "@/types";
import type { FoundRoute } from "@/database";

interface RouteCardProps extends WithClassName, WithOnPress {
  /** Route data */
  route: FoundRoute;
}

export function RouteCard({ route, onPress, className = "" }: RouteCardProps) {
  const isBus = route.transport_type === "Bus";
  const iconName = isBus ? "bus" : "subway";
  const iconColor = route.color ? `#${route.color}` : colors.rta.orange;
  const isTransfer = route.type === "transfer";

  return (
    <Card variant="elevated" onPress={onPress} className={`mb-3 ${className}`}>
      <View className="flex-row items-center">
        {/* Transport Icon */}
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>

        {/* Route Info */}
        <View className="flex-1">
          {/* Route Name */}
          <View className="flex-row items-center">
            <Text
              className="text-lg font-semibold"
              style={{ color: iconColor }}
            >
              {isTransfer
                ? route.route_name
                : isBus
                ? `Bus ${route.route_name}`
                : route.route_name}
            </Text>
            <View
              className={`ml-2 px-2 py-0.5 rounded ${
                isTransfer ? "bg-orange-100" : "bg-green-100"
              }`}
            >
              <Text
                className={`text-xs ${
                  isTransfer ? "text-orange-700" : "text-green-700"
                }`}
              >
                {isTransfer ? "1 Transfer" : "Direct"}
              </Text>
            </View>
          </View>

          {/* Direction / Transfer Info */}
          <Text className="text-sm text-text-secondary mt-1" numberOfLines={1}>
            {route.direction}
          </Text>

          {/* Stops Info */}
          {!isTransfer && (
            <Text className="text-xs text-text-muted mt-1">
              {route.stops_between} stops
            </Text>
          )}
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </View>
    </Card>
  );
}
