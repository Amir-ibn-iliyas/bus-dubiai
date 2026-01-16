/**
 * JourneyTimeline Component
 *
 * Displays a vertical step-by-step path for a journey
 */

import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/common";
import { colors } from "@/constants";
import type { JourneyLeg } from "@/hooks/useJourneyDetails";

interface JourneyTimelineProps {
  legs: JourneyLeg[];
}

export function JourneyTimeline({ legs }: JourneyTimelineProps) {
  return (
    <View className="px-4 py-6">
      {legs.map((leg, index) => (
        <TimelineLeg
          key={`${leg.route_id}-${index}`}
          leg={leg}
          isFirst={index === 0}
          isLast={index === legs.length - 1}
        />
      ))}
    </View>
  );
}

function TimelineLeg({
  leg,
  isFirst,
  isLast,
}: {
  leg: JourneyLeg;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const legColor = leg.color ? `#${leg.color}` : colors.rta.orange;

  return (
    <View>
      {/* Start Stop */}
      <View className="flex-row">
        <View className="items-center mr-4 w-6">
          <View
            className="w-4 h-4 rounded-full border-2 bg-white"
            style={{ borderColor: isFirst ? colors.status.success : legColor }}
          />
          <View className="w-1 flex-1" style={{ backgroundColor: legColor }} />
        </View>
        <View className="pb-4 flex-1">
          <Text className="font-poppins-semibold text-text-primary text-base">
            {leg.from_stop_name}
          </Text>
          {isFirst && (
            <Text className="text-xs text-status-success font-poppins-medium">
              Start Journey
            </Text>
          )}
        </View>
      </View>

      {/* Connection / Transport Step */}
      <View className="flex-row">
        <View className="items-center mr-4 w-6">
          <View className="w-1 flex-1" style={{ backgroundColor: legColor }} />
        </View>
        <View className="pb-4 flex-1">
          <Card
            variant="flat"
            className="bg-gray-50 border-gray-100 border p-3"
          >
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                style={{ backgroundColor: `${legColor}20` }}
              >
                <Ionicons
                  name={leg.transport_type === "Bus" ? "bus" : "subway"}
                  size={20}
                  color={legColor}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="font-poppins-bold text-lg"
                  style={{ color: legColor }}
                >
                  {leg.transport_type === "Bus"
                    ? `Bus ${leg.route_name}`
                    : leg.route_name}
                </Text>
                <Text className="text-xs text-text-secondary font-poppins-medium">
                  {leg.direction}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setIsExpanded(!isExpanded)}
              className="mt-3 pt-3 border-t border-gray-200 flex-row justify-between items-center"
            >
              <Text className="text-sm text-rta-blue font-poppins-medium">
                {leg.stops.length} stops ({Math.round(leg.stops.length * 1.5)}{" "}
                mins)
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.rta.blue}
              />
            </Pressable>

            {isExpanded && (
              <View className="mt-2 pl-2">
                {leg.stops.slice(1, -1).map((stop, i) => (
                  <View
                    key={stop.stop_id}
                    className="flex-row items-center py-1"
                  >
                    <View className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-3" />
                    <Text
                      className="text-xs text-text-secondary flex-1"
                      numberOfLines={1}
                    >
                      {stop.stop_name}
                    </Text>
                  </View>
                ))}
                {leg.stops.length <= 2 && (
                  <Text className="text-xs text-text-muted italic">
                    No intermediate stops
                  </Text>
                )}
              </View>
            )}
          </Card>
        </View>
      </View>

      {/* End Stop / Transfer Point */}
      <View className="flex-row">
        <View className="items-center mr-4 w-6">
          {isLast ? (
            <View
              className="w-4 h-4 rounded-full border-2 bg-white"
              style={{ borderColor: colors.status.error }}
            />
          ) : (
            <View className="items-center justify-center">
              <View
                className="w-4 h-4 rounded-full border-2 bg-white relative z-10"
                style={{ borderColor: legColor }}
              />
              <View className="w-1 h-4 bg-gray-300" />
            </View>
          )}
        </View>
        <View className="pb-8 flex-1">
          <Text className="font-poppins-semibold text-text-primary text-base">
            {leg.to_stop_name}
          </Text>
          {isLast ? (
            <Text className="text-xs text-status-error font-poppins-medium">
              Final Destination
            </Text>
          ) : (
            <Text className="text-xs text-rta-orange font-poppins-semibold mt-1">
              Transfer point
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
