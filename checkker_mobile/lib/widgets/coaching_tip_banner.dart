import 'dart:async';
import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class CoachingTipBanner extends StatefulWidget {
  final String? tip;
  final VoidCallback onDismiss;

  const CoachingTipBanner({super.key, this.tip, required this.onDismiss});

  @override
  State<CoachingTipBanner> createState() => _CoachingTipBannerState();
}

class _CoachingTipBannerState extends State<CoachingTipBanner> {
  Timer? _timer;

  @override
  void didUpdateWidget(CoachingTipBanner oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.tip != null && widget.tip != oldWidget.tip) {
      _timer?.cancel();
      _timer = Timer(const Duration(seconds: 8), widget.onDismiss);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tip == null) return const SizedBox.shrink();

    final screenWidth = MediaQuery.of(context).size.width;
    return Container(
      width: double.infinity,
      constraints: BoxConstraints(maxWidth: AppSizes.contentMaxWidth(screenWidth)),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border.gold),
        boxShadow: AppShadows.gold,
      ),
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lightbulb, size: 16, color: AppColors.accent.gold),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  'COACH',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.accent.gold,
                    letterSpacing: 1,
                  ),
                ),
              ),
              GestureDetector(
                onTap: widget.onDismiss,
                child: Icon(Icons.close, size: 14, color: AppColors.text.muted),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            widget.tip!,
            style: TextStyle(fontSize: 13, color: AppColors.text.primary, height: 1.4),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
