import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/donation.dart';
import '../../theme/tokens.dart';

class DonateScreen extends ConsumerWidget {
  const DonateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Donate'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Text(
              'Support Checkker development by donating cryptocurrency. '
              'Tap the copy button to copy a wallet address.',
              style: TextStyle(
                fontSize: AppTypography.sm,
                color: AppColors.text.secondary,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              itemCount: donationWallets.length,
              itemBuilder: (context, index) {
                final wallet = donationWallets[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.bg.secondary,
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      border: Border.all(color: AppColors.border.subtle),
                    ),
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppColors.bg.tertiary,
                                shape: BoxShape.circle,
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                wallet.icon,
                                style: TextStyle(
                                  fontSize: AppTypography.md,
                                  color: AppColors.accent.gold,
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    wallet.network,
                                    style: TextStyle(
                                      fontSize: AppTypography.body,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.text.primary,
                                    ),
                                  ),
                                  Text(
                                    wallet.symbol,
                                    style: TextStyle(
                                      fontSize: AppTypography.xs,
                                      color: AppColors.accent.gold,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: wallet.address));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('${wallet.symbol} address copied to clipboard'),
                                    backgroundColor: AppColors.accent.green,
                                    duration: const Duration(seconds: 2),
                                  ),
                                );
                              },
                              icon: Icon(Icons.copy, color: AppColors.text.muted, size: 20),
                              tooltip: 'Copy address',
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: AppColors.bg.tertiary,
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                          child: Text(
                            wallet.address,
                            style: TextStyle(
                              fontSize: AppTypography.xs,
                              color: AppColors.text.muted,
                              fontFamily: 'monospace',
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 2,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
