import 'dart:async';
import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class MoveErrorToast extends StatefulWidget {
  final String? message;
  final VoidCallback onDismiss;

  const MoveErrorToast({super.key, this.message, required this.onDismiss});

  @override
  State<MoveErrorToast> createState() => _MoveErrorToastState();
}

class _MoveErrorToastState extends State<MoveErrorToast> {
  Timer? _timer;

  @override
  void didUpdateWidget(MoveErrorToast oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.message != null && widget.message != oldWidget.message) {
      _timer?.cancel();
      _timer = Timer(const Duration(seconds: 3), widget.onDismiss);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.message == null) return const SizedBox.shrink();

    return Positioned(
      bottom: 100,
      left: AppSpacing.lg,
      right: AppSpacing.lg,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.accent.red,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Text(
          widget.message!,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
