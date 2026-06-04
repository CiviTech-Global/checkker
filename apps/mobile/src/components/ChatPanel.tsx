import React, { useRef, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import type { ChatMessage, Color } from "@checkker/shared";
import { colors, spacing, glassStyle, radius } from "../theme/tokens";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  playerColor: Color;
  playerId?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

const QUICK_CHATS = ["GG", "Good move!", "Thinking..."];

export default function ChatPanel({ messages, onSend, playerId, collapsed, onToggle }: ChatPanelProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  if (collapsed) {
    return (
      <TouchableOpacity style={styles.collapsedBar} onPress={onToggle}>
        <Text style={styles.collapsedText}>Chat ({messages.length})</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat</Text>
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <Text style={styles.emptyText}>No messages yet</Text>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === playerId;
          return (
            <View key={msg.id} style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              {!isMine && <Text style={styles.senderName}>{msg.senderName}</Text>}
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.quickRow}>
        {QUICK_CHATS.map((qc) => (
          <TouchableOpacity key={qc} style={styles.quickBtn} onPress={() => onSend(qc)}>
            <Text style={styles.quickText}>{qc}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.muted}
          maxLength={200}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendText}>{"\u27A4"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...glassStyle,
    borderRadius: radius.md,
    padding: spacing.xs,
    maxHeight: 220,
  },
  title: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  messageList: {
    flex: 1,
    minHeight: 60,
    maxHeight: 120,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 10,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(26,138,74,0.25)",
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,168,67,0.1)",
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  senderName: {
    color: colors.text.muted,
    fontSize: 9,
    marginBottom: 1,
  },
  messageText: {
    color: colors.text.primary,
    fontSize: 12,
  },
  quickRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  quickBtn: {
    backgroundColor: "rgba(212,168,67,0.08)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  quickText: {
    color: colors.text.secondary,
    fontSize: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: colors.text.primary,
    fontSize: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  collapsedBar: {
    ...glassStyle,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  collapsedText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});
