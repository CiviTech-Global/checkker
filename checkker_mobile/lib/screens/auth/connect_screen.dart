import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:reown_appkit/reown_appkit.dart';

import '../../providers/socket_provider.dart';
import '../../services/wallet_service.dart';
import '../../theme/tokens.dart';

class ConnectScreen extends ConsumerStatefulWidget {
  const ConnectScreen({super.key});

  @override
  ConsumerState<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends ConsumerState<ConnectScreen> {
  ReownAppKitModal? _appKitModal;
  bool _initializing = false;
  final _manualAddressController = TextEditingController();
  final List<StreamSubscription> _subs = [];
  String _authStep = 'idle'; // idle | signing | verifying | done
  bool _authAttempted = false;

  static const String _projectId = String.fromEnvironment(
    'CHECKKER_WC_PROJECT_ID',
    defaultValue: '',
  );

  @override
  void initState() {
    super.initState();
    _initWalletConnect();
    _loadManualAddress();
    _listenForAuth();
  }

  @override
  void dispose() {
    for (final sub in _subs) {
      sub.cancel();
    }
    _manualAddressController.dispose();
    _appKitModal?.onModalConnect.unsubscribe(_onConnect);
    _appKitModal?.onModalDisconnect.unsubscribe(_onDisconnect);
    _appKitModal?.onModalError.unsubscribe(_onError);
    super.dispose();
  }

  /// Server auth handshake: auth_request → auth_challenge → sign → auth_verify.
  void _listenForAuth() {
    final socket = ref.read(socketServiceProvider);
    _subs.add(socket.authChallengeStream.listen((data) async {
      final address = WalletService().address;
      final message = data['message'] as String?;
      if (address == null || message == null) return;
      if (!WalletService().canSign) {
        // Manual address fallback — identity only, no signing session.
        if (mounted) setState(() => _authStep = 'idle');
        return;
      }
      if (mounted) setState(() => _authStep = 'signing');
      final signature = await WalletService().sign(message);
      if (!mounted) return;
      if (signature != null) {
        setState(() => _authStep = 'verifying');
        socket.authVerify(address, signature);
      } else {
        setState(() => _authStep = 'idle');
        _authAttempted = false;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Signature rejected or failed.')),
        );
      }
    }));
    _subs.add(socket.authErrorStream.listen((error) {
      if (!mounted) return;
      setState(() => _authStep = 'idle');
      _authAttempted = false;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    }));
    _subs.add(socket.authStateStream.listen((auth) {
      if (!mounted || auth == null) return;
      setState(() => _authStep = 'done');
      if (auth.isNewUser) {
        context.go('/auth/setup');
      } else if (context.canPop()) {
        context.pop();
      } else {
        context.go('/');
      }
    }));
  }

  void _startServerAuth() {
    final address = WalletService().address;
    if (address == null || _authAttempted) return;
    _authAttempted = true;
    setState(() => _authStep = 'verifying');
    ref.read(socketServiceProvider).authRequest(address);
  }

  Future<void> _loadManualAddress() async {
    await WalletService().load();
    setState(() {});
  }

  Future<void> _initWalletConnect() async {
    if (_projectId.isEmpty) return;
    if (_initializing) return;

    setState(() => _initializing = true);

    try {
      final appKit = ReownAppKit(
        core: ReownCore(projectId: _projectId, logLevel: LogLevel.nothing),
        metadata: const PairingMetadata(
          name: 'Checkker',
          description: 'Chess + Poker hybrid strategy game',
          url: 'https://checkker.game',
          icons: ['https://checkker.game/icon.png'],
          redirect: Redirect(
            native: 'checkker://',
            universal: 'https://checkker.game/wallet',
          ),
        ),
      );

      _appKitModal = ReownAppKitModal(
        context: context,
        appKit: appKit,
      );

      await _appKitModal!.init();
      WalletService().attachModal(_appKitModal);

      _appKitModal!.onModalConnect.subscribe(_onConnect);
      _appKitModal!.onModalDisconnect.subscribe(_onDisconnect);
      _appKitModal!.onModalError.subscribe(_onError);

      if (_appKitModal!.isConnected) {
        _extractAddress();
      }
    } catch (e) {
      debugPrint('WalletConnect init error: $e');
    } finally {
      setState(() => _initializing = false);
    }
  }

  void _onConnect(ModalConnect? event) {
    _extractAddress();
  }

  void _onDisconnect(ModalDisconnect? event) {
    WalletService().attachModal(null);
    WalletService().setAddress(null);
    _authAttempted = false;
    setState(() {});
  }

  void _onError(ModalError? event) {
    debugPrint('WalletConnect error: ${event?.message}');
  }

  void _extractAddress() {
    final session = _appKitModal?.session;
    if (session == null) return;

    String? addr;
    final chain = _appKitModal?.selectedChain;
    if (chain != null) {
      final ns = NamespaceUtils.getNamespaceFromChain(chain.chainId);
      addr = session.getAddress(ns);
    }
    // Fallback: try eip155
    addr ??= session.getAddress('eip155');

    if (addr != null && addr.isNotEmpty) {
      WalletService().setAddress(addr);
      setState(() {});
      // Wallet connected — authenticate with the game server.
      _startServerAuth();
    }
  }

  Future<void> _setManualAddress() async {
    final addr = _manualAddressController.text.trim();
    if (addr.isEmpty) return;
    if (!addr.startsWith('0x') || addr.length != 42) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid Ethereum address (0x...)')),
      );
      return;
    }
    await WalletService().setAddress(addr);
    setState(() {});
  }

  Future<void> _disconnect() async {
    if (_appKitModal?.isConnected ?? false) {
      await _appKitModal!.disconnect();
    }
    WalletService().attachModal(null);
    await WalletService().disconnect();
    _authAttempted = false;
    setState(() => _authStep = 'idle');
  }

  @override
  Widget build(BuildContext context) {
    final wallet = WalletService();
    final isConnected = wallet.isConnected;
    final address = wallet.address;

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Connect Wallet'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: MediaQuery.of(context).size.height - MediaQuery.of(context).padding.vertical - kToolbarHeight - AppSpacing.lg * 2),
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: AppSpacing.xl),

            // Wallet icon
            Center(
              child: Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: AppColors.bg.secondary,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.border.gold, width: 2),
                ),
                child: Icon(
                  Icons.account_balance_wallet_outlined,
                  size: 48,
                  color: AppColors.accent.gold,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            if (isConnected && address != null) ...[
              Text(
                'Connected',
                style: TextStyle(
                  fontSize: AppTypography.lg,
                  fontWeight: FontWeight.bold,
                  color: AppColors.accent.green,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.bg.tertiary,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Text(
                  address,
                  style: TextStyle(
                    fontSize: AppTypography.sm,
                    color: AppColors.text.primary,
                    fontFamily: 'monospace',
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              if (_authStep == 'signing' || _authStep == 'verifying') ...[
                const SizedBox(height: AppSpacing.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.accent.gold,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      _authStep == 'signing'
                          ? 'Waiting for wallet signature...'
                          : 'Verifying with server...',
                      style: TextStyle(
                        fontSize: AppTypography.sm,
                        color: AppColors.text.secondary,
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: AppSpacing.xl),
              ElevatedButton.icon(
                onPressed: _disconnect,
                icon: const Icon(Icons.logout),
                label: const Text(
                  'Disconnect',
                  style: TextStyle(fontSize: AppTypography.body, fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent.burgundy,
                  foregroundColor: AppColors.text.primary,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                  ),
                ),
              ),
            ] else ...[
              Text(
                'Connect Your Wallet',
                style: TextStyle(
                  fontSize: AppTypography.lg,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text.primary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Connect a BSC-compatible wallet to enable ranked play, '
                'leaderboard tracking, and on-chain game records.',
                style: TextStyle(
                  fontSize: AppTypography.sm,
                  color: AppColors.text.secondary,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Network: BNB Smart Chain Testnet',
                style: TextStyle(
                  fontSize: AppTypography.xs,
                  color: AppColors.accent.gold,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),

              // WalletConnect button (if configured)
              if (_projectId.isNotEmpty && _appKitModal != null)
                AppKitModalConnectButton(
                  appKit: _appKitModal!,
                  size: BaseButtonSize.regular,
                )
              else
                ElevatedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: const Text(
                          'WalletConnect Project ID not configured. '
                          'Set CHECKKER_WC_PROJECT_ID to enable WalletConnect.',
                        ),
                        backgroundColor: AppColors.bg.tertiary,
                      ),
                    );
                  },
                  icon: const Icon(Icons.link),
                  label: const Text(
                    'Connect Wallet',
                    style: TextStyle(fontSize: AppTypography.body, fontWeight: FontWeight.w600),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent.primary,
                    foregroundColor: AppColors.text.primary,
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                    ),
                  ),
                ),

              const SizedBox(height: AppSpacing.md),

              // Manual address fallback
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.bg.secondary,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: AppColors.border.subtle),
                ),
                child: Column(
                  children: [
                    Text(
                      'Or enter address manually',
                      style: TextStyle(
                        fontSize: AppTypography.sm,
                        color: AppColors.text.muted,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextField(
                      controller: _manualAddressController,
                      style: TextStyle(
                        color: AppColors.text.primary,
                        fontFamily: 'monospace',
                      ),
                      decoration: InputDecoration(
                        hintText: '0x...',
                        hintStyle: TextStyle(color: AppColors.text.muted),
                        filled: true,
                        fillColor: AppColors.bg.tertiary,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          borderSide: BorderSide(color: AppColors.border.subtle),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          borderSide: BorderSide(color: AppColors.accent.gold),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _setManualAddress,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.bg.tertiary,
                          foregroundColor: AppColors.text.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                        ),
                        child: const Text('Use This Address'),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: AppSpacing.xl),

            // Info note
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.bg.secondary,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.border.subtle),
              ),
              child: Row(
                children: [
                  Icon(Icons.security, size: 16, color: AppColors.text.muted),
                  const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: Text(
                      'Your wallet is used for identity only. No funds are required to play free modes.',
                      style: TextStyle(
                        fontSize: AppTypography.xs,
                        color: AppColors.text.muted,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        ),
        ),
      ),
    );
  }
}
