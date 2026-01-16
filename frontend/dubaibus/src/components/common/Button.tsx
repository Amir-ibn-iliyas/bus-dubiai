/**
 * Button Component
 *
 * Reusable button with variants: primary, secondary, outline
 */

import { Text, Pressable, ActivityIndicator } from "react-native";
import type { BaseComponentProps } from "@/types";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends BaseComponentProps {
  /** Button text */
  title: string;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Show loading spinner */
  loading?: boolean;
  /** Disable button */
  disabled?: boolean;
  /** Left icon component */
  leftIcon?: React.ReactNode;
  /** Right icon component */
  rightIcon?: React.ReactNode;
}

// Variant styles using Tailwind classes
const variantStyles: Record<
  ButtonVariant,
  { container: string; text: string }
> = {
  primary: {
    container: "bg-rta-orange active:bg-rta-orange-dark",
    text: "text-white",
  },
  secondary: {
    container: "bg-rta-blue active:bg-rta-blue-dark",
    text: "text-white",
  },
  outline: {
    container:
      "bg-transparent border-2 border-rta-orange active:bg-rta-orange/10",
    text: "text-rta-orange",
  },
};

// Size styles
const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: "py-2 px-4", text: "text-sm" },
  md: { container: "py-3 px-6", text: "text-base" },
  lg: { container: "py-4 px-8", text: "text-lg" },
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onPress,
  className = "",
  testID,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  const containerClass = `
    flex-row items-center justify-center rounded-button
    ${variantStyle.container}
    ${sizeStyle.container}
    ${isDisabled ? "opacity-50" : ""}
    ${className}
  `;

  const textClass = `
    font-semibold
    ${variantStyle.text}
    ${sizeStyle.text}
  `;

  return (
    <Pressable
      className={containerClass}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" ? "#F7941D" : "#FFFFFF"}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text className={textClass}>{title}</Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </Pressable>
  );
}
