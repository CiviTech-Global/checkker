import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/tokens";

interface ResignButtonProps {
  onResign: () => void;
}

export default function ResignButton({ onResign }: ResignButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setShowConfirm(true)}>
        <Text style={styles.text}>Resign</Text>
      </TouchableOpacity>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.scrim}>
          <View style={styles.dialog}>
            <Text style={styles.title}>Resign?</Text>
            <Text style={styles.body}>Are you sure you want to resign?</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resignBtn}
                onPress={() => { setShowConfirm(false); onResign(); }}
              >
                <Text style={styles.resignText}>Resign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accent.red + "22",
    borderWidth: 1,
    borderColor: colors.accent.red,
    alignSelf: "center",
  },
  text: { color: colors.accent.red, fontSize: 14, fontWeight: "600" },
  scrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center" },
  dialog: { backgroundColor: colors.bg.primary, borderRadius: radius.lg, padding: spacing.lg, width: 280, gap: spacing.md },
  title: { color: colors.text.primary, fontSize: 18, fontWeight: "700", textAlign: "center" },
  body: { color: colors.text.secondary, fontSize: 14, textAlign: "center" },
  actions: { flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.bg.secondary },
  cancelText: { color: colors.text.primary, fontSize: 14, fontWeight: "600" },
  resignBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.accent.red },
  resignText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
