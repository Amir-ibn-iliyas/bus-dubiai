/**
 * DirectionTabs Component
 *
 * Toggle between Upward and Downward directions
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants";
import type { WithClassName } from "@/types";

interface DirectionTabsProps extends WithClassName {
  /** Currently selected direction (0=Upward, 1=Downward) */
  activeDirection: number;
  /** Change handler */
  onDirectionChange: (direction: number) => void;
  /** Labels for directions */
  labels?: [string, string];
}

export function DirectionTabs({
  activeDirection,
  onDirectionChange,
  labels = ["Upward", "Downward"],
  className = "",
}: DirectionTabsProps) {
  return (
    <View style={styles.container} className={className}>
      {/* Upward Tab */}
      <Pressable
        onPress={() => onDirectionChange(0)}
        style={[styles.tab, activeDirection === 0 && styles.tabActive]}
      >
        <Ionicons
          name="arrow-up"
          size={16}
          color={activeDirection === 0 ? colors.rta.orange : colors.text.muted}
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeDirection === 0 ? colors.rta.orange : colors.text.muted,
            },
          ]}
        >
          {labels[0]}
        </Text>
      </Pressable>

      {/* Downward Tab */}
      <Pressable
        onPress={() => onDirectionChange(1)}
        style={[styles.tab, activeDirection === 1 && styles.tabActive]}
      >
        <Ionicons
          name="arrow-down"
          size={16}
          color={activeDirection === 1 ? colors.rta.orange : colors.text.muted}
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeDirection === 1 ? colors.rta.orange : colors.text.muted,
            },
          ]}
        >
          {labels[1]}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    marginLeft: 8,
    fontWeight: "500",
  },
});
