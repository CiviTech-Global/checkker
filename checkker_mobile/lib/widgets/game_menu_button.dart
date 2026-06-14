import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class GameMenuButton extends StatelessWidget {
  final VoidCallback onGoHome;
  final VoidCallback? onUndo;
  final bool isBotGame;

  const GameMenuButton({
    super.key,
    required this.onGoHome,
    this.onUndo,
    this.isBotGame = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: const Color(0x14A855F7), border: Border.all(color: AppColors.border.gold), borderRadius: BorderRadius.circular(AppRadius.md)),
      child: IconButton(
        icon: Icon(Icons.menu, color: AppColors.text.primary, size: 18),
        onPressed: () => _showMenu(context),
        constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
        padding: EdgeInsets.zero,
      ),
    );
  }

  void _showMenu(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.secondary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: BorderSide(color: AppColors.border.gold),
        ),
        title: Text('Menu', style: TextStyle(color: AppColors.text.primary), textAlign: TextAlign.center),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _MenuItem(
              label: 'Home',
              onTap: () {
                Navigator.pop(ctx);
                _confirmLeave(context);
              },
            ),
            if (isBotGame && onUndo != null) ...[
              const SizedBox(height: AppSpacing.xs),
              _MenuItem(
                label: 'Undo Move',
                onTap: () {
                  Navigator.pop(ctx);
                  onUndo!();
                },
              ),
            ],
            const SizedBox(height: AppSpacing.xs),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel', style: TextStyle(color: AppColors.text.muted)),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmLeave(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.primary,
        title: Text('Leave Game', style: TextStyle(color: AppColors.text.primary)),
        content: Text("You'll forfeit the current game. Are you sure?",
            style: TextStyle(color: AppColors.text.secondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: AppColors.text.primary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              onGoHome();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent.red),
            child: const Text('Leave'),
          ),
        ],
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _MenuItem({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.06),
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm, horizontal: AppSpacing.md),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.text.primary, fontSize: 14),
          ),
        ),
      ),
    );
  }
}
