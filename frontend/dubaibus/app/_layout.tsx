import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { initDatabase } from "../src/database";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import * as SplashScreen from "expo-splash-screen";

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  // Load Poppins fonts
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize database (lazy - will init on first use)
        // We do a check here to warm it up
        await initDatabase();
        setAppReady(true);
      } catch (e) {
        console.warn("App init warning (DB):", e);
        setAppReady(true); // Continue anyway
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (fontsLoaded && appReady) {
      // Hide splash screen after a tiny delay for visual smoothness
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, appReady]);

  // Show loading while initializing or if fonts fail
  if (!fontsLoaded || !appReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActivityIndicator size="large" color="#F7941D" />
        <Text
          style={{
            marginTop: 16,
            color: "#003366",
            fontSize: 16,
            fontWeight: "500",
          }}
        >
          Initializing RTA Transit...
        </Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  // Font loading error
  if (fontError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5F5F5",
        }}
      >
        <Text style={{ color: "#666666", fontSize: 16 }}>
          Failed to load fonts
        </Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F5F5F5" },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}
