/**
 * Journey Planner Screen
 *
 * Search stops and find routes between them
 */

import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/layout";
import {
  Header,
  Input,
  Card,
  Button,
  EmptyState,
  LoadingSpinner,
} from "@/components/common";
import { RouteCard } from "@/components/journey";
import { useStopSearch, useJourneySearch } from "@/hooks";
import { colors, screenTitles, routes } from "@/constants";
import type { Stop } from "@/types";

type PickerMode = "from" | "to" | null;
type SearchMode = "All" | "Bus" | "Metro";

export default function JourneyScreen() {
  const router = useRouter();

  // Selected stops
  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);

  // Picker state
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [transportMode, setTransportMode] = useState<SearchMode>("All");

  // Stop search (for picker)
  const { results, search, clear, isLoading: isSearching } = useStopSearch();

  // Journey search (for finding routes)
  const {
    routes: foundRoutes,
    search: searchRoutes,
    clear: clearRoutes,
    isLoading: isSearchingRoutes,
    error: routeError,
  } = useJourneySearch();

  // Handle search input
  const handleSearch = useCallback(
    (text: string, modeOverride?: SearchMode) => {
      setSearchQuery(text);
      const mode = modeOverride || transportMode;
      if (text.trim().length >= 2) {
        search(text, mode === "All" ? undefined : mode);
      } else {
        clear();
      }
    },
    [search, clear, transportMode]
  );

  // Clear selection when transport mode changes
  const handleModeSelection = useCallback(
    (mode: SearchMode) => {
      setTransportMode(mode);
      setFromStop(null);
      setToStop(null);
      clearRoutes();
    },
    [clearRoutes]
  );

  // Handle stop selection
  const handleSelectStop = useCallback(
    (stop: Stop) => {
      if (pickerMode === "from") {
        setFromStop(stop);
      } else if (pickerMode === "to") {
        setToStop(stop);
      }
      setPickerMode(null);
      setSearchQuery("");
      clear();
      clearRoutes(); // Clear previous results when changing stops
    },
    [pickerMode, clear, clearRoutes]
  );

  // Open picker
  const openPicker = useCallback(
    (mode: PickerMode) => {
      setPickerMode(mode);
      setSearchQuery("");
      clear();
    },
    [clear]
  );

  // Close picker
  const closePicker = useCallback(() => {
    setPickerMode(null);
    setSearchQuery("");
    clear();
  }, [clear]);

  // Swap stops
  const swapStops = useCallback(() => {
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
    clearRoutes();
  }, [fromStop, toStop, clearRoutes]);

  // Handle find routes
  const handleFindRoutes = useCallback(() => {
    if (fromStop && toStop) {
      searchRoutes(fromStop, toStop);
    }
  }, [fromStop, toStop, searchRoutes]);

  // Handle route press - navigate to journey details
  const handleRoutePress = useCallback(
    (routeData: any) => {
      router.push({
        pathname: routes.journey.details,
        params: { routeData: JSON.stringify(routeData) },
      });
    },
    [router]
  );

  // Render stop picker modal
  if (pickerMode) {
    return (
      <ScreenContainer>
        <Header
          title={pickerMode === "from" ? "Select Origin" : "Select Destination"}
          showBack
          onBack={closePicker}
        />

        {/* Search Input */}
        <Input
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search stop or station..."
          showSearchIcon
          autoFocus
          className="mb-2"
        />

        {/* Search Results */}
        {isSearching ? (
          <LoadingSpinner message="Searching..." />
        ) : searchQuery.length < 2 ? (
          <View className="items-center py-8">
            <Ionicons
              name="search-outline"
              size={48}
              color={colors.text.muted}
            />
            <Text className="mt-4 text-text-secondary text-center">
              Type at least 2 characters to search
            </Text>
          </View>
        ) : results.length === 0 ? (
          <EmptyState
            icon="location-outline"
            title="No stops found"
            description={`No stops matching "${searchQuery}"`}
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.stop_id}
            renderItem={({ item }) => (
              <Pressable onPress={() => handleSelectStop(item)}>
                <Card variant="flat" className="mb-2">
                  <View className="flex-row items-center">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{
                        backgroundColor:
                          item.stop_id.includes(":") &&
                          !item.stop_id.match(/^[0-9]+$/)
                            ? `${colors.metro.red}15`
                            : `${colors.rta.orange}15`,
                      }}
                    >
                      <Ionicons
                        name={
                          item.stop_id.includes(":") &&
                          !item.stop_id.match(/^[0-9]+$/)
                            ? "subway"
                            : "bus"
                        }
                        size={20}
                        color={
                          item.stop_id.includes(":") &&
                          !item.stop_id.match(/^[0-9]+$/)
                            ? colors.metro.red
                            : colors.rta.orange
                        }
                      />
                    </View>
                    <Text
                      className="flex-1 text-text-primary font-poppins-medium"
                      numberOfLines={2}
                    >
                      {item.stop_name}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScreenContainer>
    );
  }

  // Main journey planner view
  return (
    <ScreenContainer>
      {/* Header */}
      <Header title={screenTitles.journey.index} showBack />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Ride Type Selector */}
        <View className="mb-6">
          <Text className="text-sm font-poppins-semibold text-text-secondary mb-3 px-1">
            SELECT RIDE TYPE
          </Text>
          <View className="flex-row gap-2">
            {(["All", "Bus", "Metro"] as SearchMode[]).map((mode) => {
              const isActive = transportMode === mode;
              const modeColor =
                mode === "Bus"
                  ? colors.rta.orange
                  : mode === "Metro"
                  ? colors.metro.red
                  : colors.rta.blue;

              return (
                <Pressable
                  key={mode}
                  onPress={() => handleModeSelection(mode)}
                  className={`flex-1 py-3 rounded-xl items-center justify-center border-2 ${
                    isActive ? "" : "border-gray-100 bg-white"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: modeColor, borderColor: modeColor }
                      : {}
                  }
                >
                  <Ionicons
                    name={
                      mode === "Bus"
                        ? "bus"
                        : mode === "Metro"
                        ? "subway"
                        : "options"
                    }
                    size={20}
                    color={isActive ? "white" : colors.text.muted}
                    className="mb-1"
                  />
                  <Text
                    className={`text-xs font-poppins-bold ${
                      isActive ? "text-white" : "text-text-muted"
                    }`}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {/* Stop Selection Card */}
        <Card variant="elevated" className="mb-4">
          {/* From Stop */}
          <Pressable
            onPress={() => openPicker("from")}
            className="flex-row items-center py-3"
          >
            <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3">
              <Ionicons name="ellipse" size={12} color="green" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-text-muted">FROM</Text>
              <Text
                className={`text-base ${
                  fromStop ? "text-text-primary" : "text-text-muted"
                }`}
                numberOfLines={1}
              >
                {fromStop?.stop_name || "Select origin stop"}
              </Text>
            </View>
          </Pressable>

          {/* Swap Button */}
          <View className="flex-row items-center">
            <View className="flex-1 h-px bg-gray-200" />
            <Pressable
              onPress={swapStops}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mx-2"
            >
              <Ionicons
                name="swap-vertical"
                size={20}
                color={colors.text.secondary}
              />
            </Pressable>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* To Stop */}
          <Pressable
            onPress={() => openPicker("to")}
            className="flex-row items-center py-3"
          >
            <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mr-3">
              <Ionicons name="location" size={16} color="red" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-text-muted">TO</Text>
              <Text
                className={`text-base ${
                  toStop ? "text-text-primary" : "text-text-muted"
                }`}
                numberOfLines={1}
              >
                {toStop?.stop_name || "Select destination stop"}
              </Text>
            </View>
          </Pressable>
        </Card>

        {/* Search Button */}
        <Button
          title="Find Routes"
          variant="primary"
          disabled={!fromStop || !toStop}
          loading={isSearchingRoutes}
          onPress={handleFindRoutes}
        />

        {/* Results Section */}
        {foundRoutes.length > 0 && (
          <View className="mt-6">
            <Text className="text-lg font-semibold text-rta-blue mb-3">
              Available Routes ({foundRoutes.length})
            </Text>
            {foundRoutes.map((route, index) => (
              <RouteCard
                key={`${route.route_id}-${index}`}
                route={route}
                onPress={() => handleRoutePress(route)}
              />
            ))}
          </View>
        )}

        {/* Error/No Results */}
        {routeError && !isSearchingRoutes && (
          <View className="mt-6">
            <EmptyState
              icon="bus-outline"
              title="No Direct Routes"
              description={routeError}
            />
          </View>
        )}

        {/* Info Text - show when no search done yet */}
        {foundRoutes.length === 0 && !routeError && !isSearchingRoutes && (
          <View className="mt-6 items-center">
            <Text className="text-sm text-text-muted text-center">
              Select your origin and destination stops{"\n"}
              to find available routes
            </Text>
          </View>
        )}

        {/* Bottom Padding */}
        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
