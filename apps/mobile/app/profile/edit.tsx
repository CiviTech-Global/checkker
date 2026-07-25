import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radius, glassStyle } from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";
import { useProfileApi } from "../../src/hooks/useProfileApi";
import type { MyProfile, UpdateProfileRequest, PrivacyFlags } from "@checkker/shared";

const MAX_BIO = 280;

export default function EditProfileScreen() {
  const router = useRouter();
  const { sessionToken } = useSocket();
  const api = useProfileApi(sessionToken);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyFlags>({});

  useEffect(() => {
    api
      .getMyProfile()
      .then((p) => {
        setProfile(p);
        setDisplayName(p.profile.displayName ?? "");
        setBio(p.profile.bio ?? "");
        setCountry(p.profile.country ?? "");
        setPrivacy(p.profile.privacyFlags ?? {});
      })
      .catch((err) => Alert.alert("Error", err.message))
      .finally(() => setLoading(false));
  }, [api]);

  const save = async () => {
    setSaving(true);
    try {
      const input: UpdateProfileRequest = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        country: country.trim().toUpperCase() || undefined,
        privacyFlags: privacy,
      };
      await api.updateProfile(input);
      router.back();
    } catch (err: any) {
      Alert.alert("Save failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePrivacy = (key: keyof PrivacyFlags) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      <View style={[styles.card, glassStyle]}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="How you appear to others"
          placeholderTextColor={colors.text.muted}
          maxLength={32}
          accessibilityLabel="Display name"
          accessibilityHint="Enter the name other players see"
        />
      </View>

      <View style={[styles.card, glassStyle]}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell others about yourself"
          placeholderTextColor={colors.text.muted}
          multiline
          maxLength={MAX_BIO}
          accessibilityLabel="Bio"
          accessibilityHint="Enter a short bio up to 280 characters"
        />
        <Text style={styles.counter}>
          {bio.length}/{MAX_BIO}
        </Text>
      </View>

      <View style={[styles.card, glassStyle]}>
        <Text style={styles.label}>Country (2-letter code)</Text>
        <TextInput
          style={styles.input}
          value={country}
          onChangeText={(t) => setCountry(t.toUpperCase())}
          placeholder="US"
          placeholderTextColor={colors.text.muted}
          maxLength={2}
          accessibilityLabel="Country code"
          accessibilityHint="Enter a 2-letter country code such as US"
        />
      </View>

      <View style={[styles.card, glassStyle]}>
        <Text style={styles.label}>Privacy</Text>
        {(
          [
            ["showRecentGames", "Show recent games on public profile"],
            ["showRank", "Show rank on public profile"],
            ["showCountry", "Show country on public profile"],
            ["showSocialLinks", "Show social links on public profile"],
            ["allowFriendRequests", "Allow friend requests"],
          ] as [keyof PrivacyFlags, string][]
        ).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={styles.row}
            onPress={() => togglePrivacy(key)}
            accessibilityLabel={label}
            accessibilityRole="switch"
            accessibilityState={{ checked: !!privacy[key] }}
          >
            <Text style={styles.rowLabel}>{label}</Text>
            <View style={[styles.toggle, privacy[key] ? styles.toggleOn : null]}>
              <View style={[styles.knob, privacy[key] ? styles.knobOn : null]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving} accessibilityLabel="Save changes" accessibilityRole="button">
        {saving ? (
          <ActivityIndicator color={colors.bg.primary} />
        ) : (
          <Text style={styles.saveText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.bg.primary,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  label: {
    color: colors.text.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  input: {
    color: colors.text.primary,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingVertical: spacing.sm,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  counter: {
    color: colors.text.muted,
    fontSize: 12,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    color: colors.text.primary,
    fontSize: 14,
    flex: 1,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border.subtle,
    padding: 2,
  },
  toggleOn: {
    backgroundColor: colors.accent.primary,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg.primary,
  },
  knobOn: {
    marginLeft: 20,
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveText: {
    color: colors.bg.primary,
    fontWeight: "700",
    fontSize: 16,
  },
});
