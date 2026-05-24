import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gambit</Text>
      <Text style={styles.subtitle}>Chess + Poker</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/game/queue")}
      >
        <Text style={styles.buttonText}>Play Ranked</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondary]}
        onPress={() => router.push("/game/casual")}
      >
        <Text style={styles.buttonText}>Play Casual</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#e0e0e0",
  },
  subtitle: {
    fontSize: 18,
    color: "#b0b0b0",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#4a4a8a",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    width: 240,
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "#2a2a4a",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
