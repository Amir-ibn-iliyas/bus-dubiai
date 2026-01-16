/**
 * EmptyState Component
 *
 * Shows when no data is available
 */

import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants";
import type { WithClassName } from "@/types";

interface EmptyStateProps extends WithClassName {
  /** Icon name from Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
}

export function EmptyState({
  icon = "search-outline",
  title,
  description,
  className = "",
}: EmptyStateProps) {
  return (
    <View className={`items-center justify-center py-12 ${className}`}>
      <Ionicons name={icon} size={64} color={colors.text.muted} />
      <Text className="mt-4 text-lg font-semibold text-text-primary">
        {title}
      </Text>
      {description && (
        <Text className="mt-2 text-base text-text-secondary text-center px-8">
          {description}
        </Text>
      )}
    </View>
  );
}
