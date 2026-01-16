import { Stack } from "expo-router";

export default function BusLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F5F5" },
        animation: "slide_from_right",
      }}
    />
  );
}
