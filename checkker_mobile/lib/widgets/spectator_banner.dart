import 'dart:async';
import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class SpectatorBanner extends StatefulWidget {
  final String? comment;
  final VoidCallback onDismiss;

  const SpectatorBanner({super.key, this.comment, required this.onDismiss});

  @override
  State<SpectatorBanner> createState() => _SpectatorBannerState();
}

class _SpectatorBannerState extends State<SpectatorBanner> {
  Timer? _timer;

  @override
  void didUpdateWidget(SpectatorBanner oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.comment != null && widget.comment != oldWidget.comment) {
      _timer?.cancel();
      _timer = Timer(const Duration(seconds: 6), widget.onDismiss);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.comment == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(maxWidth: 480),
      decoration: BoxDecoration(
        color: AppColors.accent.primary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.accent.primary),
      ),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs, horizontal: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.visibility, size: 12, color: AppColors.accent.goldBright),
              const SizedBox(width: 4),
              Text(
                'ANNOUNCER:',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accent.goldBright,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            widget.comment!,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.text.primary,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}
