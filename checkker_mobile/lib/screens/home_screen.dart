import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/socket_provider.dart';
import '../theme/tokens.dart';
import '../widgets/ornament_divider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectedAsync = ref.watch(connectedProvider);
    final connected = connectedAsync.valueOrNull ?? false;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: AppGradients.velvet,
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // Offline banner
              if (!connected)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                    color: AppColors.accent.red.withValues(alpha: 0.15),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.cloud_off, size: 14, color: AppColors.accent.red),
                        const SizedBox(width: AppSpacing.xs),
                        Text('Offline \u2014 reconnecting...',
                          style: TextStyle(fontSize: 12, color: AppColors.accent.red, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),

              // Main content
              Center(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final screenWidth = constraints.maxWidth;
                    return SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    (!connected ? AppSpacing.xxl : AppSpacing.xl),
                    AppSpacing.md,
                    AppSpacing.xxl * 2,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: AppSizes.contentMaxWidth(screenWidth)),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Title
                        Container(
                          decoration: BoxDecoration(
                            boxShadow: AppShadows.gold,
                          ),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xs),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: AppGradients.ornateGold),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                            ),
                            child: Text('Checkker',
                              style: TextStyle(fontSize: 48, fontWeight: FontWeight.w800,
                                color: AppColors.bg.primary, letterSpacing: 4),
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          child: Image.asset(
                            'assets/logo.png',
                            width: 80,
                            height: 80,
                            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text('CHESS + POKER',
                          style: TextStyle(fontSize: AppTypography.md, color: AppColors.text.secondary, letterSpacing: 5)),
                        const SizedBox(height: AppSpacing.md),

                        const OrnamentDivider(),
                        const SizedBox(height: AppSpacing.md),

                        // Menu buttons
                        _MenuButton(label: 'Play Ranked', icon: Icons.emoji_events, onTap: () => context.push('/game/ranked')),
                        _MenuButton(label: 'Find an Opponent', icon: Icons.people, onTap: () => context.push('/game/casual')),
                        _MenuButton(label: 'Play with AI and improve', icon: Icons.smart_toy, onTap: () => context.push('/bot/difficulty')),
                        _MenuButton(label: 'Play on your network (LAN)', icon: Icons.wifi, onTap: () => context.push('/lan')),
                        _MenuButton(label: 'Tutorials and trainings', icon: Icons.school, onTap: () => context.push('/tutorial')),
                        _MenuButton(label: 'Puzzles', icon: Icons.extension, onTap: () => context.push('/puzzles')),
                        _MenuButton(label: 'Live rankings and leaderboard', icon: Icons.leaderboard, onTap: () => context.push('/leaderboard')),

                        const SizedBox(height: AppSpacing.xs),

                        // Wide spectate button
                        SizedBox(
                          width: double.infinity,
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: AppGradients.casinoGreen),
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: AppColors.accent.gold, width: 1.5),
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                onTap: () => context.push('/spectate'),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.visibility, size: 22, color: AppColors.text.primary),
                                      const SizedBox(width: AppSpacing.sm),
                                      Text('Watch Bot vs. Bot',
                                        style: TextStyle(color: AppColors.text.primary, fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
                  },
                ),
              ),

              // Profile circle - bottom left
              Positioned(
                bottom: AppSpacing.md,
                left: AppSpacing.md,
                child: _CircleButton(
                  icon: Icons.person,
                  color: AppColors.accent.goldBright,
                  borderColor: AppColors.accent.gold,
                  onTap: () => context.push('/profile'),
                ),
              ),

              // Donate circle - bottom right
              Positioned(
                bottom: AppSpacing.md,
                right: AppSpacing.md,
                child: _CircleButton(
                  icon: Icons.favorite,
                  color: AppColors.accent.red,
                  borderColor: AppColors.accent.red,
                  onTap: () => context.push('/donate'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _MenuButton({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: SizedBox(
        width: double.infinity,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.cardFace,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border.gold, width: 1.5),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.lg),
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md, horizontal: AppSpacing.md),
                child: Row(
                  children: [
                    SizedBox(
                      width: 36,
                      child: Icon(icon, size: 24, color: AppColors.text.dark),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(label,
                        style: TextStyle(color: AppColors.text.dark, fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color borderColor;
  final VoidCallback onTap;

  const _CircleButton({
    required this.icon,
    required this.color,
    required this.borderColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: AppColors.bg.secondary,
          shape: BoxShape.circle,
          border: Border.all(color: borderColor, width: 2),
          boxShadow: AppShadows.gold,
        ),
        child: Icon(icon, size: 24, color: color),
      ),
    );
  }
}
