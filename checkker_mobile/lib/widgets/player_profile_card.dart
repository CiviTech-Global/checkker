import 'package:flutter/material.dart';

import '../models/avatar.dart';
import '../theme/tokens.dart';

class PlayerProfileCard extends StatelessWidget {
  final String name;
  final int? rating;
  final String? avatarId;
  final bool isActive;

  const PlayerProfileCard({
    super.key,
    required this.name,
    this.rating,
    this.avatarId,
    this.isActive = false,
  });

  @override
  Widget build(BuildContext context) {
    final avatar = avatarId != null ? getAvatar(avatarId!) : null;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Avatar circle
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.bg.secondary,
            border: Border.all(
              color: isActive ? AppColors.accent.gold : AppColors.border.subtle,
              width: isActive ? 2 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            avatar?.symbol ?? '?',
            style: const TextStyle(fontSize: 16),
          ),
        ),
        const SizedBox(width: AppSpacing.xs),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.text.primary,
              ),
            ),
            if (rating != null)
              Text(
                '$rating',
                style: TextStyle(fontSize: 11, color: AppColors.text.muted),
              ),
          ],
        ),
      ],
    );
  }
}
