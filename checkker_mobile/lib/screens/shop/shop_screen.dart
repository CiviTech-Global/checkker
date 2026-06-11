import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/cosmetic.dart';
import '../../providers/socket_provider.dart';
import '../../services/socket_service.dart';
import '../../theme/tokens.dart';

class ShopScreen extends ConsumerStatefulWidget {
  const ShopScreen({super.key});

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen>
    with SingleTickerProviderStateMixin {
  StreamSubscription<CosmeticsData>? _cosmeticsSub;
  StreamSubscription<CosmeticPurchaseResult>? _purchaseSub;
  CosmeticsData? _data;
  bool _loading = true;
  late TabController _tabController;

  static const _tabs = ['Board Themes', 'Piece Themes', 'Card Backs'];
  static const _types = ['board', 'piece', 'card_back'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    final socketService = ref.read(socketServiceProvider);
    _cosmeticsSub = socketService.cosmeticsStream.listen((data) {
      if (mounted) {
        setState(() {
          _data = data;
          _loading = false;
        });
      }
    });
    _purchaseSub = socketService.cosmeticPurchasedStream.listen((result) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.success
                ? 'Purchased! Balance: ${result.coins ?? 0} coins'
                : 'Purchase failed: ${result.error ?? 'Unknown error'}',
          ),
          backgroundColor:
              result.success ? AppColors.accent.green : AppColors.accent.red,
        ),
      );
    });
    socketService.getCosmetics();
  }

  @override
  void dispose() {
    _cosmeticsSub?.cancel();
    _purchaseSub?.cancel();
    _tabController.dispose();
    super.dispose();
  }

  List<Cosmetic> _filteredCosmetics() {
    if (_data == null) return [];
    final type = _types[_tabController.index];
    return _data!.cosmetics.where((c) => c.type == type).toList();
  }

  bool _isEquipped(String cosmeticId) {
    if (_data == null) return false;
    return _data!.userCosmetics
        .any((uc) => uc.cosmeticId == cosmeticId && uc.equipped);
  }

  bool _isOwned(String cosmeticId) {
    if (_data == null) return false;
    return _data!.userCosmetics.any((uc) => uc.cosmeticId == cosmeticId);
  }

  void _onItemTap(Cosmetic cosmetic) {
    if (_isOwned(cosmetic.id)) {
      ref.read(socketServiceProvider).equipCosmetic(cosmetic.id);
    } else {
      _confirmPurchase(cosmetic);
    }
  }

  Future<void> _confirmPurchase(Cosmetic cosmetic) async {
    final coins = _data?.coins ?? 0;
    final price = cosmetic.isDefault ? 0 : cosmetic.price;
    if (price > coins) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${cosmetic.name} costs $price coins but you have $coins. Win games to earn more!',
          ),
          backgroundColor: AppColors.bg.tertiary,
        ),
      );
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.secondary,
        title: Text(
          'Buy ${cosmetic.name}?',
          style: TextStyle(color: AppColors.text.primary),
        ),
        content: Text(
          price == 0
              ? 'This item is free.'
              : 'This will cost $price coins. You have $coins.',
          style: TextStyle(color: AppColors.text.secondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text('Buy', style: TextStyle(color: AppColors.accent.gold)),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      ref.read(socketServiceProvider).purchaseCosmetic(cosmetic.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Shop'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.md),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xs,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: AppColors.accent.gold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.accent.gold, width: 0.5),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.monetization_on,
                        size: 16, color: AppColors.accent.gold),
                    const SizedBox(width: 4),
                    Text(
                      '${_data?.coins ?? 0}',
                      style: TextStyle(
                        color: AppColors.accent.goldBright,
                        fontWeight: FontWeight.bold,
                        fontSize: AppTypography.sm,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.accent.gold,
          labelColor: AppColors.text.primary,
          unselectedLabelColor: AppColors.text.muted,
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: _loading && _data == null
          ? const Center(child: CircularProgressIndicator())
          : _buildGrid(),
    );
  }

  Widget _buildGrid() {
    final items = _filteredCosmetics();
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.store, size: 64, color: AppColors.text.muted),
            const SizedBox(height: AppSpacing.md),
            Text(
              'No items available',
              style: TextStyle(
                color: AppColors.text.muted,
                fontSize: AppTypography.body,
              ),
            ),
          ],
        ),
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = (constraints.maxWidth / 160).floor().clamp(2, 4);
        return GridView.builder(
          padding: const EdgeInsets.all(AppSpacing.md),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            mainAxisSpacing: AppSpacing.sm,
            crossAxisSpacing: AppSpacing.sm,
            childAspectRatio: 0.75,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) => _buildItemCard(items[index]),
        );
      },
    );
  }

  Widget _buildItemCard(Cosmetic cosmetic) {
    final owned = _isOwned(cosmetic.id);
    final equipped = _isEquipped(cosmetic.id);
    final isFree = cosmetic.isDefault || cosmetic.price == 0;
    final rarityColor = cosmetic.rarity == 'rare'
        ? AppColors.accent.gold
        : AppColors.text.muted;

    return GestureDetector(
      onTap: () => _onItemTap(cosmetic),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: AppMotion.normal),
        decoration: BoxDecoration(
          color: AppColors.bg.secondary,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: equipped ? AppColors.accent.gold : AppColors.border.subtle,
            width: equipped ? 2 : 1,
          ),
          boxShadow: equipped ? AppShadows.gold : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 3,
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.bg.tertiary,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(AppRadius.lg),
                  ),
                ),
                child: Center(
                  child: Icon(
                    cosmetic.type == 'board'
                        ? Icons.grid_on
                        : cosmetic.type == 'piece'
                            ? Icons.extension
                            : Icons.style,
                    size: 40,
                    color: rarityColor,
                  ),
                ),
              ),
            ),
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xs),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      cosmetic.name,
                      style: TextStyle(
                        color: AppColors.text.primary,
                        fontSize: AppTypography.sm,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (cosmetic.description != null &&
                        cosmetic.description!.isNotEmpty)
                      Text(
                        cosmetic.description!,
                        style: TextStyle(
                          color: AppColors.text.muted,
                          fontSize: AppTypography.xs,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: rarityColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xxs),
                        Expanded(
                          child: Text(
                            cosmetic.rarity.toUpperCase(),
                            style: TextStyle(
                              color: rarityColor,
                              fontSize: AppTypography.xs,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xxs),
                    if (equipped)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xs,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.accent.gold.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                          border: Border.all(
                            color: AppColors.accent.gold,
                            width: 0.5,
                          ),
                        ),
                        child: Text(
                          'Equipped',
                          style: TextStyle(
                            color: AppColors.accent.goldBright,
                            fontSize: AppTypography.xs,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      )
                    else if (owned)
                      Text(
                        'Owned',
                        style: TextStyle(
                          color: AppColors.accent.green,
                          fontSize: AppTypography.xs,
                          fontWeight: FontWeight.w600,
                        ),
                      )
                    else
                      Text(
                        isFree ? 'FREE' : '${cosmetic.price} coins',
                        style: TextStyle(
                          color: isFree
                              ? AppColors.accent.green
                              : AppColors.text.secondary,
                          fontSize: AppTypography.sm,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
