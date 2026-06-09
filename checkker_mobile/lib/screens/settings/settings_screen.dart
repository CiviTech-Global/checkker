import 'package:flutter/material.dart';

import '../../services/settings_service.dart';
import '../../services/sound_service.dart';
import '../../theme/tokens.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _settings = SettingsService();
  final _sound = SoundService();

  @override
  Widget build(BuildContext context) {
    final settings = _settings.settings;

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          _buildSectionTitle('Audio & Feedback'),
          _buildSwitchTile(
            icon: Icons.volume_up,
            title: 'Sound Effects',
            subtitle: 'Play sounds for moves, captures, and game events',
            value: settings.soundEnabled,
            onChanged: (value) async {
              await _settings.setSoundEnabled(value);
              _sound.enabled = value;
              if (value) _sound.playMove();
              setState(() {});
            },
          ),
          _buildSwitchTile(
            icon: Icons.vibration,
            title: 'Haptic Feedback',
            subtitle: 'Vibrate on card selection and moves',
            value: settings.hapticEnabled,
            onChanged: (value) async {
              await _settings.setHapticEnabled(value);
              setState(() {});
            },
          ),
          _buildSwitchTile(
            icon: Icons.animation,
            title: 'Reduced Motion',
            subtitle: 'Minimize animations for accessibility',
            value: settings.reducedMotion,
            onChanged: (value) async {
              await _settings.setReducedMotion(value);
              setState(() {});
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          _buildSectionTitle('Appearance'),
          _buildThemeSelector(
            icon: Icons.grid_on,
            title: 'Board Theme',
            value: settings.boardTheme,
            options: const ['classic', 'emerald', 'dark'],
            onChanged: (value) async {
              await _settings.setBoardTheme(value);
              setState(() {});
            },
          ),
          _buildThemeSelector(
            icon: Icons.category,
            title: 'Piece Theme',
            value: settings.pieceTheme,
            options: const ['default', 'neo', 'wood'],
            onChanged: (value) async {
              await _settings.setPieceTheme(value);
              setState(() {});
            },
          ),
          _buildThemeSelector(
            icon: Icons.style,
            title: 'Card Back',
            value: settings.cardBack,
            options: const ['default', 'royal_flush', 'midnight'],
            onChanged: (value) async {
              await _settings.setCardBack(value);
              setState(() {});
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          _buildSectionTitle('About'),
          ListTile(
            leading: Icon(Icons.info_outline, color: AppColors.accent.gold),
            title: Text('Version', style: TextStyle(color: AppColors.text.primary)),
            subtitle: Text('1.0.0', style: TextStyle(color: AppColors.text.muted)),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(
        left: AppSpacing.md,
        bottom: AppSpacing.sm,
        top: AppSpacing.md,
      ),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          color: AppColors.accent.gold,
          fontSize: AppTypography.xs,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  Widget _buildSwitchTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: SwitchListTile(
        secondary: Icon(icon, color: AppColors.accent.gold),
        title: Text(title, style: TextStyle(color: AppColors.text.primary)),
        subtitle: Text(subtitle, style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.sm)),
        value: value,
        onChanged: onChanged,
        activeThumbColor: AppColors.accent.gold,
        inactiveThumbColor: AppColors.text.muted,
      ),
    );
  }

  Widget _buildThemeSelector({
    required IconData icon,
    required String title,
    required String value,
    required List<String> options,
    required ValueChanged<String> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.accent.gold, size: 20),
              const SizedBox(width: AppSpacing.md),
              Text(title, style: TextStyle(color: AppColors.text.primary)),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.xs,
            children: options.map((option) {
              final isSelected = option == value;
              return ChoiceChip(
                label: Text(
                  option[0].toUpperCase() + option.substring(1),
                  style: TextStyle(
                    color: isSelected ? AppColors.text.dark : AppColors.text.primary,
                  ),
                ),
                selected: isSelected,
                onSelected: (_) => onChanged(option),
                selectedColor: AppColors.accent.gold,
                backgroundColor: AppColors.bg.tertiary,
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
