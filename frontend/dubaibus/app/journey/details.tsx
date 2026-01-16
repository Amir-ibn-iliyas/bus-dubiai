/**
 * Journey Details Screen
 *
 * Displays the step-by-step path for a selected journey
 */

import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/layout";
import { Header, Card, LoadingSpinner, EmptyState } from "@/components/common";
import { JourneyTimeline } from "@/components/journey";
import { useJourneyDetails } from "@/hooks";
import { colors, screenTitles } from "@/constants";
import type { FoundRoute } from "@/database";

export default function JourneyDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse the route from params
  // Note: We'll pass the whole object as a JSON string to avoid missing fields
  let route: FoundRoute | null = null;
  try {
    if (params.routeData) {
      route = JSON.parse(params.routeData as string);
    }
  } catch (e) {
    console.error("Error parsing route data:", e);
  }

  const { legs, isLoading, error } = useJourneyDetails(route);

  // Loading State
  if (isLoading) {
    return (
      <ScreenContainer>
        <Header title={screenTitles.journey.details} showBack />
        <LoadingSpinner message="Calculating your path..." />
      </ScreenContainer>
    );
  }

  // Error State
  if (error || !route || legs.length === 0) {
    return (
      <ScreenContainer>
        <Header title={screenTitles.journey.details} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Path Not Found"
          description={
            error || "Could not calculate the specific stops for this journey."
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title={screenTitles.journey.details} showBack />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Quick Summary Card */}
        <Card variant="elevated" className="m-4 mb-2">
          {/* From Stop */}
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3">
              <Ionicons name="location" size={16} color="green" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-text-muted font-poppins-medium uppercase">
                Origin
              </Text>
              <Text
                className="font-poppins-semibold text-text-primary text-base"
                numberOfLines={1}
              >
                {legs[0]?.from_stop_name ||
                  route.from_stop ||
                  "Loading origin..."}
              </Text>
            </View>
          </View>

          {/* Connection Line */}
          <View className="flex-row items-center my-1 ml-4 border-l-2 border-dashed border-gray-200 h-6">
            <View className="absolute left-4 px-3 py-0.5 bg-rta-blue/10 rounded-full">
              <Text className="text-[10px] font-poppins-bold text-rta-blue uppercase">
                {route.stops_between} stops total
              </Text>
            </View>
          </View>

          {/* To Stop */}
          <View className="flex-row items-center mt-3">
            <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mr-3">
              <Ionicons name="flag" size={16} color="red" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-text-muted font-poppins-medium uppercase">
                Destination
              </Text>
              <Text
                className="font-poppins-semibold text-text-primary text-base"
                numberOfLines={1}
              >
                {legs[legs.length - 1]?.to_stop_name ||
                  route.to_stop ||
                  "Your Destination"}
              </Text>
            </View>
          </View>
        </Card>

        {/* The Timeline */}
        <JourneyTimeline legs={legs} />

        <View className="h-10" />
      </ScrollView>
    </ScreenContainer>
  );
}
