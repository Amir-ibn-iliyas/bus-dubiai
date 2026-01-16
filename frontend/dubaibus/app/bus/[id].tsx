/**
 * Bus Details Screen
 *
 * Shows bus route details with upward/downward stops
 */

import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/layout";
import { Header, Card, LoadingSpinner, EmptyState } from "@/components/common";
import { DirectionTabs, StopsList } from "@/components/bus";
import { useBusDetails } from "@/hooks";
import { colors } from "@/constants";

export default function BusDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bus, isLoading, error } = useBusDetails(id || "");
  const [activeDirection, setActiveDirection] = useState(0);

  // Loading state
  if (isLoading) {
    return (
      <ScreenContainer>
        <Header title="Bus Details" showBack />
        <LoadingSpinner message="Loading bus details..." />
      </ScreenContainer>
    );
  }

  // Error state
  if (error || !bus) {
    return (
      <ScreenContainer>
        <Header title="Bus Details" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Bus Not Found"
          description={error || `Could not find bus "${id}"`}
        />
      </ScreenContainer>
    );
  }

  // Get current direction data
  const currentDirection = bus.directions[activeDirection] || bus.directions[0];
  const stops = currentDirection?.stops || [];

  return (
    <ScreenContainer>
      {/* Header */}
      <Header title={`Bus ${bus.bus_number}`} showBack />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Bus Info Card */}
        <Card variant="elevated" className="mb-4">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-rta-orange/10 items-center justify-center mr-4">
              <Ionicons name="bus" size={28} color={colors.rta.orange} />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-rta-blue">
                Bus {bus.bus_number}
              </Text>
              <Text
                className="text-sm text-text-secondary mt-1"
                numberOfLines={2}
              >
                {bus.route_name}
              </Text>
            </View>
          </View>

          {/* Route Summary */}
          {currentDirection && (
            <View className="mt-4 pt-4 border-t border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="location" size={16} color={colors.rta.orange} />
                <Text className="ml-2 text-sm text-text-secondary">
                  {currentDirection.from}
                </Text>
              </View>
              <View className="flex-row items-center mt-2">
                <Ionicons name="navigate" size={16} color={colors.rta.blue} />
                <Text className="ml-2 text-sm text-text-secondary">
                  {currentDirection.to}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Direction Tabs */}
        {bus.directions.length > 1 && (
          <DirectionTabs
            activeDirection={activeDirection}
            onDirectionChange={setActiveDirection}
            className="mb-4"
          />
        )}

        {/* Stops List */}
        <Card variant="flat" className="mb-6">
          <StopsList
            stops={stops}
            directionName={currentDirection?.direction_name}
            showHeader
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
