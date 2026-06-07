import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from "react-native";
import { colors, spacing, glassStyle, radius } from "../theme/tokens";
import Icon from "./Icon";

interface GameMenuButtonProps {
  onGoHome: () => void;
  onUndo?: () => void;
  isBotGame: boolean;
}

export default function GameMenuButton({ onGoHome, onUndo, isBotGame }: GameMenuButtonProps) {
  const [visible, setVisible] = useState(false);

  const handleHome = () => {
    setVisible(false);
    Alert.alert("Leave Game", "You'll forfeit the current game. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: onGoHome },
    ]);
  };

  const handleUndo = () => {
    setVisible(false);
    onUndo?.();
  };

  return (
    <>
      <TouchableOpacity style={styles.menuBtn} onPress={() => setVisible(true)}>
        <Icon name="menu" size={18} color={colors.text.primary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Menu</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleHome}>
              <Text style={styles.menuItemText}>Home</Text>
            </TouchableOpacity>

            {isBotGame && onUndo && (
              <TouchableOpacity style={styles.menuItem} onPress={handleUndo}>
                <Text style={styles.menuItemText}>Undo Move</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.menuItem, styles.menuItemDisabled]}>
              <Text style={[styles.menuItemText, styles.menuItemTextDisabled]}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelItem} onPress={() => setVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    ...glassStyle,
    borderRadius: radius.md,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    color: colors.text.primary,
    fontSize: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: 240,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  menuTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  menuItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  menuItemText: {
    color: colors.text.primary,
    fontSize: 14,
    textAlign: "center",
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuItemTextDisabled: {
    color: colors.text.muted,
  },
  cancelItem: {
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelText: {
    color: colors.text.muted,
    fontSize: 14,
    textAlign: "center",
  },
});
