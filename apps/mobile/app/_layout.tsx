import { useCallback } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-router";
import { typography } from "../src/theme/tokens";

// NOTE: To enable premium Playfair Display font, install @expo-google-fonts/playfair-display
// and uncomment the useFonts block below. For now we use system serif fallback.
// import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_800ExtraBold } from "@expo-google-fonts/playfair-display";

export default function RootLayout() {
  // Uncomment when font package is installed:
  // const [fontsLoaded] = useFonts({
  //   PlayfairDisplay_700Bold,
  //   PlayfairDisplay_800ExtraBold,
  // });
  // if (fontsLoaded) {
  //   typography.fontFamily.display = "PlayfairDisplay_700Bold";
  // }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0b1a12" },
        }}
      />
    </>
  );
}
