import 'package:flutter/material.dart';

import '../models/game.dart';
import '../theme/tokens.dart';

class ChatPanel extends StatefulWidget {
  final List<ChatMessage> messages;
  final ValueChanged<String> onSend;
  final bool expanded;
  final VoidCallback onToggle;

  const ChatPanel({
    super.key,
    required this.messages,
    required this.onSend,
    this.expanded = false,
    required this.onToggle,
  });

  @override
  State<ChatPanel> createState() => _ChatPanelState();
}

class _ChatPanelState extends State<ChatPanel> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    widget.onSend(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.expanded) {
      return GestureDetector(
        onTap: widget.onToggle,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
          decoration: BoxDecoration(
            color: AppColors.bg.secondary,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.border.subtle),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.chat_bubble_outline, size: 14, color: AppColors.text.muted),
              const SizedBox(width: 4),
              Text('Chat', style: TextStyle(fontSize: 12, color: AppColors.text.muted)),
              if (widget.messages.isNotEmpty) ...[
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: AppColors.accent.gold,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${widget.messages.length}',
                    style: const TextStyle(fontSize: 10, color: Colors.black, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return Container(
      width: double.infinity,
      constraints: BoxConstraints(maxHeight: (MediaQuery.of(context).size.height * 0.25).clamp(120, 240)),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border.subtle),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          GestureDetector(
            onTap: widget.onToggle,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: AppColors.border.subtle)),
              ),
              child: Row(
                children: [
                  Text('Chat', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.text.primary)),
                  const Spacer(),
                  Icon(Icons.close, size: 14, color: AppColors.text.muted),
                ],
              ),
            ),
          ),
          // Messages
          Flexible(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(AppSpacing.xs),
              itemCount: widget.messages.length,
              itemBuilder: (context, i) {
                final msg = widget.messages[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: '${msg.senderName}: ',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: msg.senderName == 'System' ? AppColors.accent.gold : AppColors.text.secondary,
                          ),
                        ),
                        TextSpan(
                          text: msg.text,
                          style: TextStyle(fontSize: 12, color: AppColors.text.primary),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          // Input
          Container(
            padding: const EdgeInsets.all(AppSpacing.xs),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.border.subtle)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: TextStyle(fontSize: 12, color: AppColors.text.primary),
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      hintStyle: TextStyle(fontSize: 12, color: AppColors.text.muted),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        borderSide: BorderSide(color: AppColors.border.subtle),
                      ),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: AppSpacing.xxs),
                SizedBox(
                  width: 48,
                  height: 48,
                  child: IconButton(
                    onPressed: _send,
                    icon: Icon(Icons.send, size: 20, color: AppColors.accent.gold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
