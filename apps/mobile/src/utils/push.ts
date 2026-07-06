/**
 * Push notification scaffolding.
 *
 * Real push delivery needs external credentials (an Expo project ID / FCM
 * service account), so for v1 this module only wires the plumbing:
 *
 * 1. If `expo-notifications` is installed and permissions are granted, it
 *    fetches the device push token.
 * 2. The token is handed to the caller, which registers it with the game
 *    server (`register_fcm_token` → User.fcmToken in the database).
 *
 * To enable real pushes later:
 *   npx expo install expo-notifications expo-device
 * and provide FCM credentials in app.json / the Expo dashboard. No further
 * client changes should be needed.
 */

let attempted = false;

export async function registerForPushNotifications(
  onToken: (token: string) => void
): Promise<boolean> {
  if (attempted) return false;
  attempted = true;
  try {
    // Dynamic require so the app works without the optional dependency.
     
    const Notifications = require("expo-notifications");
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return false;
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = typeof tokenData === "string" ? tokenData : tokenData?.data;
    if (token) {
      onToken(String(token));
      return true;
    }
    return false;
  } catch {
    // expo-notifications not installed (or unsupported platform) — push
    // stays disabled, in-app notifications still work.
    return false;
  }
}
