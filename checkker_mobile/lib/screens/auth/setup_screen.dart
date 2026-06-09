import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/socket_provider.dart';
import '../../theme/tokens.dart';

const _avatarIds = [
  'avatar_01', 'avatar_02', 'avatar_03', 'avatar_04',
  'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08',
  'avatar_09', 'avatar_10', 'avatar_11', 'avatar_12',
  'avatar_13', 'avatar_14', 'avatar_15', 'avatar_16',
];

const _avatarIcons = [
  Icons.person, Icons.face, Icons.sentiment_very_satisfied, Icons.mood,
  Icons.face_2, Icons.face_3, Icons.face_4, Icons.face_5,
  Icons.face_6, Icons.psychology, Icons.self_improvement, Icons.sports_esports,
  Icons.castle, Icons.diamond, Icons.workspace_premium, Icons.military_tech,
];

class SetupScreen extends ConsumerStatefulWidget {
  const SetupScreen({super.key});

  @override
  ConsumerState<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends ConsumerState<SetupScreen> {
  final _usernameController = TextEditingController();
  String _selectedAvatar = _avatarIds[0];
  bool _isChecking = false;
  bool? _isAvailable;
  String _statusMessage = '';
  Timer? _debounce;
  StreamSubscription<Map<String, dynamic>>? _usernameSub;

  @override
  void initState() {
    super.initState();
    final socketService = ref.read(socketServiceProvider);
    _usernameSub = socketService.usernameCheckStream.listen((data) {
      if (!mounted) return;
      setState(() {
        _isChecking = false;
        _isAvailable = data['available'] as bool? ?? false;
        _statusMessage = _isAvailable! ? 'Username is available' : 'Username is taken';
      });
    });
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _debounce?.cancel();
    _usernameSub?.cancel();
    super.dispose();
  }

  void _onUsernameChanged(String value) {
    _debounce?.cancel();
    if (value.trim().length < 3) {
      setState(() {
        _isAvailable = null;
        _statusMessage = value.trim().isEmpty ? '' : 'Username must be at least 3 characters';
        _isChecking = false;
      });
      return;
    }
    setState(() {
      _isChecking = true;
      _isAvailable = null;
      _statusMessage = 'Checking...';
    });
    _debounce = Timer(const Duration(milliseconds: 500), () {
      final socketService = ref.read(socketServiceProvider);
      socketService.checkUsername(value.trim());
    });
  }

  void _save() {
    final username = _usernameController.text.trim();
    if (username.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Username must be at least 3 characters.'),
          backgroundColor: AppColors.accent.red,
        ),
      );
      return;
    }
    if (_isAvailable != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please choose an available username.'),
          backgroundColor: AppColors.accent.red,
        ),
      );
      return;
    }

    final socketService = ref.read(socketServiceProvider);
    // walletAddress would come from auth state; using placeholder for now
    final authState = socketService.authState;
    final walletAddress = authState?.walletAddress ?? '';
    socketService.setUsername(walletAddress, username, _selectedAvatar);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Profile saved!'),
        backgroundColor: AppColors.accent.green,
      ),
    );
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Setup Profile'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Username field
            Text(
              'Choose a Username',
              style: TextStyle(
                fontSize: AppTypography.md,
                fontWeight: FontWeight.bold,
                color: AppColors.text.primary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: _usernameController,
              onChanged: _onUsernameChanged,
              style: TextStyle(color: AppColors.text.primary),
              maxLength: 20,
              decoration: InputDecoration(
                hintText: 'Enter username',
                hintStyle: TextStyle(color: AppColors.text.muted),
                filled: true,
                fillColor: AppColors.bg.secondary,
                counterStyle: TextStyle(color: AppColors.text.muted),
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
                suffixIcon: _isChecking
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : _isAvailable == true
                        ? Icon(Icons.check_circle, color: AppColors.accent.green)
                        : _isAvailable == false
                            ? Icon(Icons.cancel, color: AppColors.accent.red)
                            : null,
              ),
            ),
            if (_statusMessage.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.xxs),
                child: Text(
                  _statusMessage,
                  style: TextStyle(
                    fontSize: AppTypography.xs,
                    color: _isAvailable == true
                        ? AppColors.accent.green
                        : _isAvailable == false
                            ? AppColors.accent.red
                            : AppColors.text.muted,
                  ),
                ),
              ),

            const SizedBox(height: AppSpacing.xl),

            // Avatar selector
            Text(
              'Choose an Avatar',
              style: TextStyle(
                fontSize: AppTypography.md,
                fontWeight: FontWeight.bold,
                color: AppColors.text.primary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            LayoutBuilder(
              builder: (context, constraints) {
                final columns = AppSizes.gridColumns(constraints.maxWidth, 72);
                return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: AppSpacing.sm,
                mainAxisSpacing: AppSpacing.sm,
              ),
              itemCount: _avatarIds.length,
              itemBuilder: (context, index) {
                final id = _avatarIds[index];
                final isSelected = _selectedAvatar == id;

                return GestureDetector(
                  onTap: () => setState(() => _selectedAvatar = id),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.accent.primary.withValues(alpha: 0.2)
                          : AppColors.bg.secondary,
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      border: Border.all(
                        color: isSelected ? AppColors.accent.gold : AppColors.border.subtle,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        _avatarIcons[index],
                        size: 32,
                        color: isSelected ? AppColors.accent.gold : AppColors.text.secondary,
                      ),
                    ),
                  ),
                );
              },
            );
              },
            ),

            const SizedBox(height: AppSpacing.xl),

            // Save button
            ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accent.primary,
                foregroundColor: AppColors.text.primary,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
              ),
              child: const Text(
                'Save',
                style: TextStyle(fontSize: AppTypography.body, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
