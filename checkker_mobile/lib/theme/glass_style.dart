import 'package:flutter/material.dart';
import 'tokens.dart';

class GlassContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final double borderWidth;
  final Color? borderColor;

  const GlassContainer({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius = AppRadius.lg,
    this.borderWidth = 1,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: const Color(0x14F5F0E8),
        border: Border.all(
          width: borderWidth,
          color: borderColor ?? AppColors.border.gold,
        ),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: child,
    );
  }
}

class OrnateContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;

  const OrnateContainer({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius = AppRadius.lg,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.bg.primary,
        border: Border.all(
          width: 2,
          color: AppColors.border.ornate,
        ),
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: AppShadows.gold,
      ),
      child: child,
    );
  }
}
