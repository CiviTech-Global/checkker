import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class ResignButton extends StatelessWidget {
  final VoidCallback onResign;

  const ResignButton({super.key, required this.onResign});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: () => _showConfirm(context),
      style: OutlinedButton.styleFrom(
        side: BorderSide(color: AppColors.accent.red),
        foregroundColor: AppColors.accent.red,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
      ),
      child: const Text('Resign', style: TextStyle(fontWeight: FontWeight.w600)),
    );
  }

  void _showConfirm(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.primary,
        title: Text('Resign?', style: TextStyle(color: AppColors.text.primary)),
        content: Text('Are you sure you want to resign?', style: TextStyle(color: AppColors.text.secondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: AppColors.text.primary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              onResign();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent.red),
            child: const Text('Resign'),
          ),
        ],
      ),
    );
  }
}
