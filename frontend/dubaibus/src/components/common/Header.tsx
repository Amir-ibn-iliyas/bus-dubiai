/**
 * Header Component
 *
 * Screen header with title and optional back button
 */

import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants";
import type { WithClassName } from "@/types";

interface HeaderProps extends WithClassName {
  /** Header title */
  title: string;
  /** Show back button */
  showBack?: boolean;
  /** Custom back action */
  onBack?: () => void;
  /** Right side component */
  rightComponent?: React.ReactNode;
}

export function Header({
  title,
  showBack = false,
  onBack,
  rightComponent,
  className = "",
}: HeaderProps) {
  // Only use router if we need the back button and no custom onBack provided
  let handleBack = onBack;

  // We need to call useRouter conditionally safe way
  const router = useRouter();

  if (!handleBack && showBack) {
    handleBack = () => router.back();
  }

  return (
    <View className={`flex-row items-center justify-between py-4 ${className}`}>
      {/* Left: Back button or spacer */}
      <View className="w-12">
        {showBack && handleBack && (
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-full active:bg-gray-100"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={colors.rta.blue} />
          </Pressable>
        )}
      </View>

      {/* Center: Title */}
      <Text
        className="flex-1 text-center text-xl font-semibold text-rta-blue"
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Right: Custom component or spacer */}
      <View className="w-12 items-end">{rightComponent}</View>
    </View>
  );
}
