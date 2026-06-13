import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../services/music_service.dart';
import '../../services/settings_service.dart';
import '../../services/socket_service.dart';
import '../../services/sound_service.dart';
import '../../services/wallet_service.dart';
import '../../theme/tokens.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _settings = SettingsService();
  final _sound = SoundService();
  final _music = MusicService();

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
            icon: Icons.music_note,
            title: 'Background Music',
            subtitle: 'Ambient music while you play',
            value: settings.musicEnabled,
            onChanged: (value) async {
              await _settings.setMusicEnabled(value);
              await _music.sync(enabled: value, volume: settings.musicVolume);
              setState(() {});
            },
          ),
          if (settings.musicEnabled)
            Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.xs),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: AppColors.bg.secondary,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Row(
                children: [
                  Icon(Icons.volume_down, color: AppColors.accent.gold, size: 20),
                  Expanded(
                    child: Slider(
                      value: settings.musicVolume,
                      onChanged: (value) async {
                        await _settings.setMusicVolume(value);
                        await _music.setVolume(value);
                        setState(() {});
                      },
                      activeColor: AppColors.accent.gold,
                      inactiveColor: AppColors.bg.tertiary,
                    ),
                  ),
                  Icon(Icons.volume_up, color: AppColors.accent.gold, size: 20),
                ],
              ),
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
          _buildSectionTitle('Network'),
          Container(
            margin: const EdgeInsets.only(bottom: AppSpacing.xs),
            decoration: BoxDecoration(
              color: AppColors.bg.secondary,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: ListTile(
              leading: Icon(Icons.dns, color: AppColors.accent.gold),
              title: Text('Game Server', style: TextStyle(color: AppColors.text.primary)),
              subtitle: Text(
                settings.serverUrl.isEmpty
                    ? 'Default (${SocketService.defaultServerUrl})'
                    : settings.serverUrl,
                style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.sm),
              ),
              trailing: Icon(Icons.edit, color: AppColors.text.muted, size: 18),
              onTap: _editServerUrl,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          _buildSectionTitle('Account'),
          Container(
            margin: const EdgeInsets.only(bottom: AppSpacing.xs),
            decoration: BoxDecoration(
              color: AppColors.bg.secondary,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: ListTile(
              leading: Icon(Icons.logout, color: AppColors.accent.gold),
              title: Text('Log Out', style: TextStyle(color: AppColors.text.primary)),
              subtitle: Text(
                'Disconnect your wallet from this device',
                style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.sm),
              ),
              onTap: _confirmLogout,
            ),
          ),
          Container(
            margin: const EdgeInsets.only(bottom: AppSpacing.xs),
            decoration: BoxDecoration(
              color: AppColors.bg.secondary,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: ListTile(
              leading: Icon(Icons.delete_forever, color: AppColors.accent.red),
              title: Text('Clear Local Data', style: TextStyle(color: AppColors.accent.red)),
              subtitle: Text(
                'Erase settings, streaks, and wallet session on this device',
                style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.sm),
              ),
              onTap: _confirmClearData,
            ),
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

  Future<void> _confirmLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.secondary,
        title: Text('Log Out', style: TextStyle(color: AppColors.text.primary)),
        content: Text(
          'Disconnect your wallet from this device? You can reconnect anytime.',
          style: TextStyle(color: AppColors.text.secondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text('Log Out', style: TextStyle(color: AppColors.accent.gold)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    SocketService().logout();
    await WalletService().disconnect();
    if (mounted) context.go('/auth/connect');
  }

  Future<void> _editServerUrl() async {
    final controller = TextEditingController(text: _settings.settings.serverUrl);
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.secondary,
        title: Text('Game Server', style: TextStyle(color: AppColors.text.primary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter the server address shown on the host machine, e.g.\n'
              'http://192.168.1.20:3001\n\nLeave blank to use the default.',
              style: TextStyle(color: AppColors.text.secondary, fontSize: AppTypography.sm),
            ),
            const SizedBox(height: AppSpacing.md),
            TextField(
              controller: controller,
              autofocus: true,
              keyboardType: TextInputType.url,
              style: TextStyle(color: AppColors.text.primary),
              decoration: InputDecoration(
                hintText: SocketService.defaultServerUrl,
                hintStyle: TextStyle(color: AppColors.text.muted),
                enabledBorder: OutlineInputBorder(
                  borderSide: BorderSide(color: AppColors.border.subtle),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: BorderSide(color: AppColors.accent.gold),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
            child: Text('Save & Reconnect', style: TextStyle(color: AppColors.accent.gold)),
          ),
        ],
      ),
    );
    if (result == null || !mounted) return;
    await _settings.setServerUrl(result);
    SocketService().connectTo(result);
    if (mounted) {
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.isEmpty
              ? 'Reconnecting to default server...'
              : 'Reconnecting to $result...'),
        ),
      );
    }
  }

  Future<void> _confirmClearData() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.secondary,
        title: Text('Clear Local Data', style: TextStyle(color: AppColors.accent.red)),
        content: Text(
          'This erases all locally stored settings, puzzle streaks, and your '
          'wallet session on this device. This cannot be undone.',
          style: TextStyle(color: AppColors.text.secondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text('Clear Data', style: TextStyle(color: AppColors.accent.red)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await _music.stop();
    SocketService().logout();
    await _settings.clearAllData();
    await WalletService().disconnect();
    if (mounted) {
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Local data cleared')),
      );
    }
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
