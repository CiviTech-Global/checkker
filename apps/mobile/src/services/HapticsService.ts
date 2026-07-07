import * as Haptics from "expo-haptics";
import { appSettings } from "./SettingsService";

class HapticsServiceClass {
  private get enabled() {
    return appSettings.settings.hapticEnabled;
  }

  async impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
    if (!this.enabled) return;
    try {
      await Haptics.impactAsync(style);
    } catch {
      // Ignore unsupported platforms or missing native module.
    }
  }

  async notification(type: Haptics.NotificationFeedbackType) {
    if (!this.enabled) return;
    try {
      await Haptics.notificationAsync(type);
    } catch {
      // Ignore.
    }
  }

  async selection() {
    if (!this.enabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignore.
    }
  }

  /** Card selection / hand tap. */
  cardTap() {
    return this.impact(Haptics.ImpactFeedbackStyle.Light);
  }

  /** Piece or square tap. */
  pieceTap() {
    return this.impact(Haptics.ImpactFeedbackStyle.Light);
  }

  /** Move confirmation. */
  moveConfirm() {
    return this.impact(Haptics.ImpactFeedbackStyle.Medium);
  }

  /** Capture event. */
  capture() {
    return this.impact(Haptics.ImpactFeedbackStyle.Heavy);
  }

  /** Check / checkmate. */
  check() {
    return this.notification(Haptics.NotificationFeedbackType.Warning);
  }

  /** Victory. */
  win() {
    return this.notification(Haptics.NotificationFeedbackType.Success);
  }

  /** Loss / error. */
  loss() {
    return this.notification(Haptics.NotificationFeedbackType.Error);
  }
}

export const haptics = new HapticsServiceClass();
