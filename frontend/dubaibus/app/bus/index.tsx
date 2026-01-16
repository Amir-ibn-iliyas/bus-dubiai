/**
 * Bus Screen
 *
 * Search buses + Popular buses list + Journey Planner button
 */

import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/layout";
import {
  Header,
  Input,
  Card,
  LoadingSpinner,
  EmptyState,
} from "@/components/common";
import { BusCard } from "@/components/bus";
import { useBuses } from "@/hooks";
import { colors, routes, screenTitles } from "@/constants";
import type { BusRoute } from "@/types";

export default function BusScreen() {
  const router = useRouter();
  const { buses, searchResults, search, clearSearch, isLoading } = useBuses();
  const [searchQuery, setSearchQuery] = useState("");

  // Handle search input
  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.trim()) {
        search(text);
      } else {
        clearSearch();
      }
    },
    [search, clearSearch]
  );

  // Handle bus press
  const handleBusPress = useCallback(
    (bus: BusRoute) => {
      router.push(routes.bus.details(bus.bus_number));
    },
    [router]
  );

  // Determine which list to show
  const displayBuses = searchQuery.trim() ? searchResults : buses.slice(0, 20);
  const showSearchResults = searchQuery.trim().length > 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <Header title={screenTitles.bus.index} showBack />

      {/* Search Input */}
      <Input
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="Enter bus number (e.g., 8, F55A)"
        showSearchIcon
        keyboardType="default"
        className="mb-4"
      />

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
              Find routes between stops
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
        {showSearchResults ? "Search Results" : "Popular Buses"}
      </Text>

      {/* Loading State */}
      {isLoading ? (
        <LoadingSpinner message="Loading buses..." />
      ) : displayBuses.length === 0 ? (
        <EmptyState
          icon={showSearchResults ? "search-outline" : "bus-outline"}
          title={showSearchResults ? "No buses found" : "No buses available"}
          description={
            showSearchResults
              ? `No buses matching "${searchQuery}"`
              : "Please check the database"
          }
        />
      ) : (
        /* Bus List */
        <FlatList
          data={displayBuses}
          keyExtractor={(item) => item.route_id}
          renderItem={({ item }) => (
            <BusCard bus={item} onPress={() => handleBusPress(item)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </ScreenContainer>
  );
}
