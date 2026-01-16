/**
 * LoadingSpinner Component
 *
 * Centered loading indicator with optional message
 */

import { View, Text, ActivityIndicator } from "react-native";
import { colors } from "@/constants";
import type { WithClassName } from "@/types";

interface LoadingSpinnerProps extends WithClassName {
  /** Loading message */
  message?: string;
  /** Spinner size */
  size?: "small" | "large";
  /** Spinner color */
  color?: string;
  /** Full screen overlay */
  fullScreen?: boolean;
}

export function LoadingSpinner({
  message,
  size = "large",
  color = colors.rta.orange,
  fullScreen = false,
  className = "",
}: LoadingSpinnerProps) {
  const containerClass = fullScreen
    ? "absolute inset-0 items-center justify-center bg-white/80"
    : `items-center justify-center py-8 ${className}`;

  return (
    <View className={containerClass}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="mt-3 text-base text-text-secondary">{message}</Text>
      )}
    </View>
  );
}
