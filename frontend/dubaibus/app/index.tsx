/**
 * Home Screen
 *
 * Main entry point with Bus and Metro buttons
 */

import { View, Text, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/layout";
import { Card } from "@/components/common";
import { colors, routes, screenTitles } from "@/constants";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="items-center pt-8 pb-6">
        {/* Logo/Title */}
        <View className="flex-row items-center">
          <Text className="text-3xl font-bold text-rta-blue">
            {screenTitles.home}
          </Text>
        </View>
        <Text className="text-sm text-text-secondary mt-2">
          Bus & Metro Routes
        </Text>
      </View>

      {/* Main Buttons */}
      <View className="flex-row gap-4 mt-4">
        {/* Bus Button */}
        <Pressable
          className="flex-1"
          onPress={() => router.push(routes.bus.index)}
        >
          <Card variant="elevated" className="items-center py-8">
            <View className="w-20 h-20 rounded-full bg-rta-orange/10 items-center justify-center mb-4">
              <Ionicons name="bus" size={40} color={colors.rta.orange} />
            </View>
            <Text className="text-xl font-semibold text-rta-blue">BUS</Text>
            <Text className="text-sm text-text-secondary mt-1">
              Schedules & Routes
            </Text>
          </Card>
        </Pressable>

        {/* Metro Button */}
        <Pressable
          className="flex-1"
          onPress={() => router.push(routes.metro.index)}
        >
          <Card variant="elevated" className="items-center py-8">
            <View className="w-20 h-20 rounded-full bg-rta-blue/10 items-center justify-center mb-4">
              <Ionicons name="subway" size={40} color={colors.rta.blue} />
            </View>
            <Text className="text-xl font-semibold text-rta-blue">METRO</Text>
            <Text className="text-sm text-text-secondary mt-1">
              Lines & Stations
            </Text>
          </Card>
        </Pressable>
      </View>

      {/* Quick Info */}
      <View className="mt-8">
        <Text className="text-lg font-semibold text-rta-blue mb-3">
          Quick Access
        </Text>

        {/* Journey Planner Button */}
        <Pressable onPress={() => router.push(routes.journey.index)}>
          <Card variant="elevated" className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-rta-orange/10 items-center justify-center mr-4">
              <Ionicons name="navigate" size={24} color={colors.rta.orange} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-text-primary">
                Journey Planner
              </Text>
              <Text className="text-sm text-text-secondary">
                Find routes between stops
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.text.muted}
            />
          </Card>
        </Pressable>
      </View>

      {/* Footer Info */}
      <View className="flex-1 justify-end pb-8">
        <Text className="text-center text-xs text-text-muted">
          Offline Mode • No Internet Required
        </Text>
      </View>
    </ScreenContainer>
  );
}
