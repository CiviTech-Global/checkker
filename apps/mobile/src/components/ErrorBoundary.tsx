import { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, typography, radius } from "../theme/tokens";
import { recordError } from "../utils/analytics";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Top-level React error boundary: reports the crash and offers a reset. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    recordError(error, { componentStack: info.componentStack ?? undefined });
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          {this.state.error.message || "An unexpected error occurred."}
        </Text>
        <Pressable style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.size.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  buttonText: {
    fontSize: typography.size.body,
    fontWeight: "600",
    color: colors.text.primary,
  },
});
