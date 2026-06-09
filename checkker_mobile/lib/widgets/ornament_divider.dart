import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class OrnamentDivider extends StatelessWidget {
  const OrnamentDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Container(height: 1, color: AppColors.border.gold)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          child: Icon(Icons.diamond, size: 10, color: AppColors.accent.gold),
        ),
        Expanded(child: Container(height: 1, color: AppColors.border.gold)),
      ],
    );
  }
}
