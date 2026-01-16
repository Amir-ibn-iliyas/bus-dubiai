/**
 * ScreenContainer Component
 *
 * Wraps all screens with consistent padding and safe area
 */

import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { WithChildren, WithClassName } from "@/types";

interface ScreenContainerProps extends WithChildren, WithClassName {
  /** Use SafeAreaView edges */
  safeArea?: boolean;
  /** Add horizontal padding */
  padded?: boolean;
}

export function ScreenContainer({
  children,
  className = "",
  safeArea = true,
  padded = true,
}: ScreenContainerProps) {
  const paddingClass = padded ? "px-5" : "";
  const baseClass = `flex-1 bg-background-primary ${paddingClass} ${className}`;

  if (safeArea) {
    return (
      <SafeAreaView className={baseClass} edges={["top", "left", "right"]}>
        {children}
      </SafeAreaView>
    );
  }

  return <View className={baseClass}>{children}</View>;
}
