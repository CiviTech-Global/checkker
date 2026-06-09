import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../services/lan_service.dart';
import '../../services/socket_service.dart';
import '../../theme/tokens.dart';

enum _LanMode { select, host, join }

class LanScreen extends ConsumerStatefulWidget {
  const LanScreen({super.key});

  @override
  ConsumerState<LanScreen> createState() => _LanScreenState();
}

class _LanScreenState extends ConsumerState<LanScreen> {
  _LanMode _mode = _LanMode.select;
  final _serverAddressController = TextEditingController();
  final _lanService = LanService();
  String? _localIp;
  bool _connecting = false;
  String? _connectionError;

  @override
  void initState() {
    super.initState();
    _discoverIp();
  }

  Future<void> _discoverIp() async {
    final ip = await _lanService.discoverLocalIp();
    if (mounted) {
      setState(() => _localIp = ip);
    }
  }

  @override
  void dispose() {
    _serverAddressController.dispose();
    super.dispose();
  }

  void _handleHost() {
    setState(() => _mode = _LanMode.host);
  }

  void _handleJoin() {
    setState(() => _mode = _LanMode.join);
  }

  void _handleConnect() {
    final addr = _serverAddressController.text.trim();
    if (addr.isEmpty) {
      _showSnack('Please enter the host\'s IP address or code.');
      return;
    }
    setState(() {
      _connecting = true;
      _connectionError = null;
    });

    final ok = _lanService.connectToLanHost(addr);
    if (!ok) {
      setState(() {
        _connecting = false;
        _connectionError = 'Invalid address';
      });
      _showSnack('Invalid address.');
      return;
    }

    // Wait briefly for connection result.
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      setState(() => _connecting = false);
      if (SocketService().isConnected) {
        _showSnack('Connected to LAN host. You can now queue or challenge a friend.');
      } else {
        setState(() => _connectionError = 'Could not connect to $addr. Make sure the host is reachable.');
        _showSnack('Could not connect to $addr. Make sure the host is reachable.');
      }
    });
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.bg.tertiary,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            children: [
              // Header
              Row(
                children: [
                  IconButton(
                    onPressed: () => context.canPop() ? context.pop() : context.go('/'),
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                  ),
                  Expanded(
                    child: Text(
                      'Local Network Play',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: AppTypography.lg,
                        fontWeight: FontWeight.bold,
                        color: AppColors.accent.gold,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Play against someone on the same Wi-Fi network',
                style: TextStyle(
                  fontSize: AppTypography.sm,
                  color: AppColors.text.secondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),

              // Content
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: AppMotion.normal),
                  child: _buildContent(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    switch (_mode) {
      case _LanMode.select:
        return _buildSelectMode();
      case _LanMode.host:
        return _buildHostMode();
      case _LanMode.join:
        return _buildJoinMode();
    }
  }

  Widget _buildSelectMode() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _OptionCard(
          icon: Icons.wifi_tethering,
          title: 'Host Game',
          description: 'Create a game and share your local IP with a friend nearby',
          onTap: _handleHost,
        ),
        const SizedBox(height: AppSpacing.md),
        _OptionCard(
          icon: Icons.lan_outlined,
          title: 'Join Game',
          description: 'Enter a host\'s IP address to connect to their server',
          onTap: _handleJoin,
        ),
      ],
    );
  }

  Widget _buildHostMode() {
    final ip = _localIp ?? 'Discovering...';
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.xl),
          decoration: BoxDecoration(
            color: const Color(0x14F5F0E8),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border.subtle),
          ),
          child: Column(
            children: [
              CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation(AppColors.accent.gold),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Waiting for opponent...',
                style: TextStyle(
                  fontSize: AppTypography.md,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text.primary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Share your local IP with the other player so they can join.',
                style: TextStyle(
                  fontSize: AppTypography.sm,
                  color: AppColors.text.muted,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.md),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                decoration: BoxDecoration(
                  color: AppColors.bg.tertiary,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Column(
                  children: [
                    Text(
                      'Your Address',
                      style: TextStyle(
                        fontSize: AppTypography.xs,
                        color: AppColors.text.muted,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 2),
                    SelectableText(
                      ip,
                      style: TextStyle(
                        fontSize: AppTypography.body,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accent.gold,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'A Checkker server must be running on this device or on your LAN.',
                style: TextStyle(
                  fontSize: 11,
                  color: AppColors.text.muted,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        _SecondaryButton(
          onPressed: () => setState(() => _mode = _LanMode.select),
          label: 'Cancel Hosting',
        ),
      ],
    );
  }

  Widget _buildJoinMode() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.xl),
          decoration: BoxDecoration(
            color: const Color(0x14F5F0E8),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border.subtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Host Address',
                style: TextStyle(
                  fontSize: AppTypography.sm,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text.primary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: _serverAddressController,
                style: TextStyle(
                  color: AppColors.text.primary,
                  fontFamily: 'monospace',
                ),
                decoration: InputDecoration(
                  hintText: 'e.g. 192.168.1.42',
                  hintStyle: TextStyle(color: AppColors.text.muted),
                  filled: true,
                  fillColor: AppColors.bg.tertiary,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: BorderSide(color: AppColors.border.subtle),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: BorderSide(color: AppColors.border.subtle),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: BorderSide(color: AppColors.accent.gold),
                  ),
                  errorText: _connectionError,
                ),
                keyboardType: TextInputType.url,
                textInputAction: TextInputAction.go,
                onSubmitted: (_) => _handleConnect(),
              ),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _connecting ? null : _handleConnect,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent.primary,
                    foregroundColor: AppColors.text.primary,
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                    ),
                  ),
                  child: _connecting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Connect',
                          style: TextStyle(fontSize: AppTypography.body, fontWeight: FontWeight.w600),
                        ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        _SecondaryButton(
          onPressed: () => setState(() => _mode = _LanMode.select),
          label: 'Back',
        ),
      ],
    );
  }
}

class _OptionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  const _OptionCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: const Color(0x14F5F0E8),
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.border.subtle),
        ),
        child: Row(
          children: [
            Icon(icon, size: 28, color: AppColors.accent.gold),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: AppTypography.body,
                      fontWeight: FontWeight.w600,
                      color: AppColors.text.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: AppTypography.sm,
                      color: AppColors.text.muted,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: AppColors.text.muted.withValues(alpha: 0.5),
            ),
          ],
        ),
      ),
    );
  }
}

class _SecondaryButton extends StatelessWidget {
  final VoidCallback onPressed;
  final String label;

  const _SecondaryButton({required this.onPressed, required this.label});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: AppColors.text.primary,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.sm),
        backgroundColor: AppColors.bg.secondary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: AppTypography.body, fontWeight: FontWeight.w600),
      ),
    );
  }
}
