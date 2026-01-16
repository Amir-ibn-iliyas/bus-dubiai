/**
 * Metro Screen
 *
 * Shows all metro lines + Journey Planner button
 */

import { useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/layout";
import { Header, Card, LoadingSpinner, EmptyState } from "@/components/common";
import { MetroLineCard } from "@/components/metro";
import { useMetroLines } from "@/hooks";
import { colors, routes, screenTitles } from "@/constants";
import type { MetroLine } from "@/types";

export default function MetroScreen() {
  const router = useRouter();
  const { lines, isLoading, error } = useMetroLines();

  // Handle line press
  const handleLinePress = useCallback(
    (line: MetroLine) => {
      router.push(routes.metro.details(line.line_id));
    },
    [router]
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <Header title={screenTitles.metro.index} showBack />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Journey Planner Button */}
        <Pressable
          onPress={() => router.push(routes.journey.index)}
          className="mb-4"
        >
          <Card
            variant="flat"
            className="flex-row items-center border-rta-orange"
          >
            <View className="w-10 h-10 rounded-full bg-rta-orange/10 items-center justify-center mr-3">
              <Ionicons name="navigate" size={20} color={colors.rta.orange} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-rta-orange">
                Journey Planner
              </Text>
              <Text className="text-xs text-text-secondary">
                Find routes between stations
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.rta.orange}
            />
          </Card>
        </Pressable>

        {/* Section Title */}
        <Text className="text-lg font-semibold text-rta-blue mb-3">
          Metro Lines
        </Text>

        {/* Loading State */}
        {isLoading ? (
          <LoadingSpinner message="Loading metro lines..." />
        ) : error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Error Loading Lines"
            description={error}
          />
        ) : lines.length === 0 ? (
          <EmptyState
            icon="subway-outline"
            title="No Metro Lines"
            description="No metro lines available"
          />
        ) : (
          /* Metro Lines List */
          lines.map((line) => (
            <MetroLineCard
              key={line.line_id}
              line={line}
              onPress={() => handleLinePress(line)}
            />
          ))
        )}

        {/* Bottom Padding */}
        <View className="h-6" />
      </ScrollView>
    </ScreenContainer>
  );
}
