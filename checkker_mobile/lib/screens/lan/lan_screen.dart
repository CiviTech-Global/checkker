import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/socket_provider.dart';
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
  final _gameCodeController = TextEditingController();
  final _lanService = LanService();
  final List<StreamSubscription> _subs = [];
  String? _localIp;
  String? _hostCode;
  bool _connecting = false;
  bool _scanning = false;
  String? _connectionError;
  String? _lastGameId;
  List<DiscoveredHost> _discoveredHosts = [];

  @override
  void initState() {
    super.initState();
    _discoverIp();
    final socket = ref.read(socketServiceProvider);
    _lastGameId = socket.gameId;
    _subs.add(socket.lanGameHostedStream.listen((data) {
      if (mounted) setState(() => _hostCode = data['code'] as String?);
    }));
    _subs.add(socket.lanJoinResultStream.listen((data) {
      if (!mounted) return;
      setState(() => _connecting = false);
      if (data['success'] != true) {
        final error = data['error'] as String? ?? 'Could not join the game.';
        setState(() => _connectionError = error);
        _showSnack(error);
      }
    }));
    _subs.add(socket.gameStateStream.listen((_) {
      if (!mounted) return;
      final gameId = socket.gameId;
      if (gameId != null && gameId != _lastGameId) {
        _lastGameId = gameId;
        context.push('/game/$gameId');
      }
    }));
  }

  Future<void> _discoverIp() async {
    final ip = await _lanService.discoverLocalIp();
    if (mounted) {
      setState(() => _localIp = ip);
    }
  }

  Future<void> _scanForHosts() async {
    setState(() => _scanning = true);
    final hosts = await _lanService.discoverHosts();
    if (mounted) {
      setState(() {
        _scanning = false;
        _discoveredHosts = hosts;
      });
      if (hosts.isEmpty) {
        _showSnack('No Checkker servers found on this network.');
      }
    }
  }

  @override
  void dispose() {
    for (final sub in _subs) {
      sub.cancel();
    }
    _serverAddressController.dispose();
    _gameCodeController.dispose();
    super.dispose();
  }

  void _handleHost() {
    setState(() {
      _mode = _LanMode.host;
      _hostCode = null;
    });
    ref.read(socketServiceProvider).hostLanGame();
  }

  void _handleJoin() {
    setState(() => _mode = _LanMode.join);
  }

  void _connectToDiscovered(DiscoveredHost host) {
    _serverAddressController.text = host.address;
    _handleConnect();
  }

  void _handleConnect() {
    final addr = _serverAddressController.text.trim();
    final code = _gameCodeController.text.trim();
    if (code.isEmpty) {
      _showSnack('Please enter the host\'s game code.');
      return;
    }
    setState(() {
      _connecting = true;
      _connectionError = null;
    });

    if (addr.isEmpty) {
      // Same server (or already connected to the host's) — join directly.
      ref.read(socketServiceProvider).joinLanGame(code);
      return;
    }

    final ok = _lanService.connectToLanHost(addr);
    if (!ok) {
      setState(() {
        _connecting = false;
        _connectionError = 'Invalid address';
      });
      _showSnack('Invalid address.');
      return;
    }

    // Wait briefly for connection, then complete the join handshake.
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      if (SocketService().isConnected) {
        ref.read(socketServiceProvider).joinLanGame(code);
      } else {
        setState(() {
          _connecting = false;
          _connectionError = 'Could not connect to $addr. Make sure the host is reachable.';
        });
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
            color: const Color(0x14A855F7),
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
                'Share this game code with the other player so they can join.',
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
                      'Game Code',
                      style: TextStyle(
                        fontSize: AppTypography.xs,
                        color: AppColors.text.muted,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 2),
                    SelectableText(
                      _hostCode ?? '...',
                      style: TextStyle(
                        fontSize: AppTypography.lg,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accent.gold,
                        fontFamily: 'monospace',
                        letterSpacing: 4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Your address: $ip — if you are hosting the server locally, '
                'the other player should connect to it first.',
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
          onPressed: () {
            ref.read(socketServiceProvider).cancelLanHost();
            setState(() {
              _mode = _LanMode.select;
              _hostCode = null;
            });
          },
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
            color: const Color(0x14A855F7),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border.subtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Game Code',
                style: TextStyle(
                  fontSize: AppTypography.sm,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text.primary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: _gameCodeController,
                style: TextStyle(
                  color: AppColors.text.primary,
                  fontFamily: 'monospace',
                ),
                maxLength: 4,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  hintText: 'e.g. 4821',
                  counterText: '',
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
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Host Address (optional — leave blank if same server)',
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
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _scanning ? null : _scanForHosts,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.accent.gold,
                    side: BorderSide(color: AppColors.border.subtle),
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                    ),
                  ),
                  icon: _scanning
                      ? SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.accent.gold,
                          ),
                        )
                      : const Icon(Icons.radar, size: 18),
                  label: Text(_scanning ? 'Scanning...' : 'Scan for hosts'),
                ),
              ),
              if (_discoveredHosts.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.sm),
                for (final host in _discoveredHosts)
                  ListTile(
                    dense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    leading: Icon(Icons.dns, color: AppColors.accent.gold, size: 20),
                    title: Text(
                      '${host.address}:${host.port}',
                      style: TextStyle(
                        color: AppColors.text.primary,
                        fontFamily: 'monospace',
                        fontSize: AppTypography.sm,
                      ),
                    ),
                    trailing: Icon(Icons.chevron_right, color: AppColors.text.muted),
                    onTap: _connecting ? null : () => _connectToDiscovered(host),
                  ),
              ],
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
          color: const Color(0x14A855F7),
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
