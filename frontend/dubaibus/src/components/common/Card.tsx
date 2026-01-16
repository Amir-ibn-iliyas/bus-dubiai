/**
 * Card Component
 *
 * Reusable card with variants: elevated, neumorphic, flat
 */

import { View, Pressable } from "react-native";
import type { WithChildren, WithClassName, WithOnPress } from "@/types";

type CardVariant = "elevated" | "neumorphic" | "flat";

interface CardProps extends WithChildren, WithClassName, WithOnPress {
  /** Card variant */
  variant?: CardVariant;
  /** Add padding inside card */
  padded?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// Variant styles
const variantStyles: Record<CardVariant, string> = {
  elevated: "bg-white rounded-card shadow-md",
  neumorphic: "bg-white rounded-card shadow-lg",
  flat: "bg-white rounded-card border border-gray-100",
};

export function Card({
  children,
  variant = "elevated",
  padded = true,
  onPress,
  className = "",
  testID,
}: CardProps) {
  const paddingClass = padded ? "p-4" : "";
  const baseClass = `${variantStyles[variant]} ${paddingClass} ${className}`;

  // If pressable, wrap in Pressable
  if (onPress) {
    return (
      <Pressable
        className={`${baseClass} active:opacity-90`}
        onPress={onPress}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseClass} testID={testID}>
      {children}
    </View>
  );
}
