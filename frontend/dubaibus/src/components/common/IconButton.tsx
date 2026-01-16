/**
 * IconButton Component
 *
 * Pressable icon button
 */

import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants";
import type { BaseComponentProps } from "@/types";

interface IconButtonProps extends BaseComponentProps {
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Icon size */
  size?: number;
  /** Icon color */
  color?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function IconButton({
  icon,
  size = 24,
  color = colors.rta.blue,
  disabled = false,
  onPress,
  className = "",
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`
        w-10 h-10 items-center justify-center rounded-full
        active:bg-gray-100
        ${disabled ? "opacity-50" : ""}
        ${className}
      `}
      hitSlop={8}
      testID={testID}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}
