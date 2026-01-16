/**
 * Metro Details Screen
 *
 * Shows metro line details with upward/downward stations
 */

import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/layout";
import { Header, Card, LoadingSpinner, EmptyState } from "@/components/common";
import { DirectionTabs } from "@/components/bus";
import { StationsList } from "@/components/metro";
import { useMetroDetails } from "@/hooks";
import { getMetroLineColor } from "@/utils";

export default function MetroDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { line, isLoading, error } = useMetroDetails(id || "");
  const [activeDirection, setActiveDirection] = useState(0);

  // Loading state
  if (isLoading) {
    return (
      <ScreenContainer>
        <Header title="Metro Line" showBack />
        <LoadingSpinner message="Loading line details..." />
      </ScreenContainer>
    );
  }

  // Error state
  if (error || !line) {
    return (
      <ScreenContainer>
        <Header title="Metro Line" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Line Not Found"
          description={error || `Could not find metro line "${id}"`}
        />
      </ScreenContainer>
    );
  }

  // Get line color and current direction
  const lineColor = getMetroLineColor(line.line_name);
  const currentDirection =
    line.directions[activeDirection] || line.directions[0];
  const stations = currentDirection?.stops || [];

  return (
    <ScreenContainer>
      {/* Header */}
      <Header title={line.line_name} showBack />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Line Info Card */}
        <Card variant="elevated" className="mb-4" padded={false}>
          {/* Color Bar */}
          <View
            className="h-2 rounded-t-card"
            style={{ backgroundColor: lineColor }}
          />

          <View className="p-4">
            <View className="flex-row items-center">
              <View
                className="w-14 h-14 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: `${lineColor}20` }}
              >
                <Ionicons name="subway" size={28} color={lineColor} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-2xl font-bold"
                  style={{ color: lineColor }}
                >
                  {line.line_name}
                </Text>
                {line.line_name_ar && (
                  <Text className="text-sm text-text-secondary mt-1">
                    {line.line_name_ar}
                  </Text>
                )}
              </View>
            </View>

            {/* Route Summary */}
            {currentDirection && (
              <View className="mt-4 pt-4 border-t border-gray-100">
                <View className="flex-row items-center">
                  <Ionicons name="location" size={16} color={lineColor} />
                  <Text className="ml-2 text-sm text-text-secondary">
                    {currentDirection.from}
                  </Text>
                </View>
                <View className="flex-row items-center mt-2">
                  <Ionicons name="navigate" size={16} color={lineColor} />
                  <Text className="ml-2 text-sm text-text-secondary">
                    {currentDirection.to}
                  </Text>
                </View>
                <Text className="mt-2 text-xs text-text-muted">
                  {stations.length} stations
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Direction Tabs */}
        {line.directions.length > 1 && (
          <DirectionTabs
            activeDirection={activeDirection}
            onDirectionChange={setActiveDirection}
            className="mb-4"
          />
        )}

        {/* Stations List */}
        <Card variant="flat" className="mb-6">
          <StationsList
            stations={stations}
            directionName={currentDirection?.direction_name}
            showHeader
            lineColor={lineColor}
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
