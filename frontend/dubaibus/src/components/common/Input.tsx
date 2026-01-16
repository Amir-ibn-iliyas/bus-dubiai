/**
 * Input Component
 *
 * Reusable text input with search icon option
 */

import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants";
import type { WithClassName } from "@/types";

interface InputProps extends WithClassName {
  /** Input value */
  value: string;
  /** Change handler */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Show search icon */
  showSearchIcon?: boolean;
  /** On submit handler */
  onSubmit?: () => void;
  /** Auto focus */
  autoFocus?: boolean;
  /** Keyboard type */
  keyboardType?: "default" | "numeric" | "email-address";
  /** Test ID */
  testID?: string;
}

export function Input({
  value,
  onChangeText,
  placeholder = "Search...",
  showSearchIcon = false,
  onSubmit,
  autoFocus = false,
  keyboardType = "default",
  className = "",
  testID,
}: InputProps) {
  const handleClear = () => {
    onChangeText("");
  };

  return (
    <View
      className={`
        flex-row items-center
        bg-white border-2 border-gray-200 rounded-input
        px-4
        focus-within:border-rta-orange
        ${className}
      `}
    >
      {/* Search Icon */}
      {showSearchIcon && (
        <Ionicons
          name="search"
          size={20}
          color={colors.text.muted}
          style={{ marginRight: 8 }}
        />
      )}

      {/* Text Input */}
      <TextInput
        className="flex-1 py-3 text-base text-text-primary"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        testID={testID}
      />

      {/* Clear Button */}
      {value.length > 0 && (
        <Pressable onPress={handleClear} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={colors.text.muted} />
        </Pressable>
      )}
    </View>
  );
}
