import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../services/settings_service.dart';
import '../../services/socket_service.dart';
import '../../theme/tokens.dart';

/// Asks the player for the game-server URL/domain, so the connection target is
/// always dynamic (no hardcoded address). Saved via [SettingsService] and
/// applied through [SocketService.connectTo].
///
/// Used in two places:
///  * As the first-run gate before the menu ([isInitialSetup] = true): on
///    success it lands on the home menu.
///  * From Settings → Game Server ([isInitialSetup] = false): shown with a
///    back button; on success it pops back to Settings.
class ServerSetupScreen extends StatefulWidget {
  /// Whether this is the first-run gate (vs. opened from Settings).
  final bool isInitialSetup;

  const ServerSetupScreen({super.key, this.isInitialSetup = true});

  @override
  State<ServerSetupScreen> createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends State<ServerSetupScreen> {
  late final TextEditingController _controller;
  bool _connecting = false;
  bool _showContinue = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final saved = SettingsService().settings.serverUrl;
    _controller = TextEditingController(
      text: saved.isNotEmpty ? saved : SocketService.defaultServerUrl,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _normalize(String input) {
    var s = input.trim();
    if (s.isEmpty) return '';
    if (!s.contains('://')) s = 'http://$s';
    while (s.endsWith('/')) {
      s = s.substring(0, s.length - 1);
    }
    return s;
  }

  Future<bool> _waitForConnection(Duration timeout) async {
    if (SocketService().isConnected) return true;
    final completer = Completer<bool>();
    final sub = SocketService().connectedStream.listen((connected) {
      if (connected && !completer.isCompleted) completer.complete(true);
    });
    Future.delayed(timeout, () {
      if (!completer.isCompleted) completer.complete(false);
    });
    final result = await completer.future;
    await sub.cancel();
    return result;
  }

  Future<void> _connect() async {
    final url = _normalize(_controller.text);
    if (url.isEmpty) {
      setState(() => _error = 'Please enter a server address.');
      return;
    }
    setState(() {
      _connecting = true;
      _error = null;
      _showContinue = false;
    });

    await SettingsService().setServerUrl(url);
    SocketService().connectTo(url);

    final connected = await _waitForConnection(const Duration(seconds: 5));
    if (!mounted) return;

    if (connected) {
      _finish(success: true);
    } else {
      setState(() {
        _connecting = false;
        _showContinue = true;
        _error =
            "Couldn't reach the server. Check the address and that you're on "
            'the same network — or continue and retry later.';
      });
    }
  }

  /// Leaves the screen. The URL has already been saved either way, so the
  /// fallback ("continue/go back") keeps the entered value.
  void _finish({required bool success}) {
    if (widget.isInitialSetup) {
      context.go('/');
    } else {
      final messenger = ScaffoldMessenger.of(context);
      context.pop();
      if (success) {
        messenger.showSnackBar(
          SnackBar(content: Text('Connected to ${_normalize(_controller.text)}')),
        );
      }
    }
  }

  void _useDefault() {
    _controller.text = SocketService.defaultServerUrl;
    _controller.selection = TextSelection.fromPosition(
      TextPosition(offset: _controller.text.length),
    );
    setState(() => _error = null);
  }

  @override
  Widget build(BuildContext context) {
    final maxWidth = AppSizes.contentMaxWidth(MediaQuery.of(context).size.width);

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: widget.isInitialSetup
          ? null
          : AppBar(
              title: const Text('Game Server'),
              backgroundColor: AppColors.bg.secondary,
              foregroundColor: AppColors.text.primary,
              elevation: 0,
            ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo
                  Image.asset(
                    'assets/logo.png',
                    width: 120,
                    height: 120,
                    errorBuilder: (_, _, _) => const SizedBox(height: 8),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  Text(
                    'Connect to Server',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: AppTypography.lg,
                      fontWeight: FontWeight.w800,
                      color: AppColors.text.primary,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Enter the URL or domain of the Checkker game server you '
                    'want to play on.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: AppTypography.sm,
                      color: AppColors.text.secondary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Input
                  TextField(
                    controller: _controller,
                    enabled: !_connecting,
                    autocorrect: false,
                    keyboardType: TextInputType.url,
                    textInputAction: TextInputAction.go,
                    onSubmitted: (_) => _connecting ? null : _connect(),
                    style: TextStyle(color: AppColors.text.primary),
                    decoration: InputDecoration(
                      labelText: 'Server URL / Domain',
                      labelStyle: TextStyle(color: AppColors.text.muted),
                      hintText: 'http://192.168.1.105:3001',
                      hintStyle: TextStyle(color: AppColors.text.muted),
                      prefixIcon: Icon(Icons.dns_outlined, color: AppColors.accent.primary),
                      filled: true,
                      fillColor: AppColors.bg.secondary,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        borderSide: BorderSide(color: AppColors.border.subtle),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        borderSide: BorderSide(color: AppColors.accent.primary, width: 1.5),
                      ),
                      disabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        borderSide: BorderSide(color: AppColors.border.subtle),
                      ),
                    ),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: AppColors.accent.red,
                        fontSize: AppTypography.xs,
                        height: 1.4,
                      ),
                    ),
                  ],

                  const SizedBox(height: AppSpacing.lg),

                  // Connect button
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _connecting ? null : _connect,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accent.primary,
                        disabledBackgroundColor:
                            AppColors.accent.primary.withValues(alpha: 0.4),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                        ),
                      ),
                      child: _connecting
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                valueColor: AlwaysStoppedAnimation(Colors.white),
                              ),
                            )
                          : Text(
                              widget.isInitialSetup
                                  ? 'Connect & Continue'
                                  : 'Save & Reconnect',
                              style: const TextStyle(
                                fontSize: AppTypography.body,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
                  ),

                  if (_showContinue) ...[
                    const SizedBox(height: AppSpacing.sm),
                    SizedBox(
                      height: 48,
                      child: OutlinedButton(
                        onPressed: () => _finish(success: false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.text.secondary,
                          side: BorderSide(color: AppColors.border.subtle),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                          ),
                        ),
                        child: Text(
                          widget.isInitialSetup ? 'Continue anyway' : 'Go back',
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: AppSpacing.sm),
                  TextButton(
                    onPressed: _connecting ? null : _useDefault,
                    child: Text(
                      'Use detected default (${SocketService.defaultServerUrl})',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.text.muted,
                        fontSize: AppTypography.xs,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
