/**
 * BusCard Component
 *
 * Displays a single bus route card
 */

import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/common";
import { colors } from "@/constants";
import type { BusRoute, WithClassName, WithOnPress } from "@/types";

interface BusCardProps extends WithClassName, WithOnPress {
  /** Bus route data */
  bus: BusRoute;
}

export function BusCard({ bus, onPress, className = "" }: BusCardProps) {
  return (
    <Card variant="elevated" onPress={onPress} className={`mb-3 ${className}`}>
      <View className="flex-row items-center">
        {/* Bus Icon */}
        <View className="w-12 h-12 rounded-full bg-rta-orange/10 items-center justify-center mr-3">
          <Ionicons name="bus" size={24} color={colors.rta.orange} />
        </View>

        {/* Bus Info */}
        <View className="flex-1">
          {/* Bus Number */}
          <Text className="text-lg font-semibold text-rta-blue">
            Bus {bus.bus_number}
          </Text>

          {/* Route Name */}
          <Text className="text-sm text-text-secondary mt-1" numberOfLines={1}>
            {bus.route_name}
          </Text>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </View>
    </Card>
  );
}
