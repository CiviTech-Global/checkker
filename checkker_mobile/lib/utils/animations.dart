import 'package:flutter/material.dart';

const Duration springPressDuration = Duration(milliseconds: 150);
const double springPressScale = 0.96;

int staggerDelay(int index, int base) => index * base;

class SpringPressController {
  final AnimationController controller;
  late final Animation<double> scaleAnimation;

  SpringPressController(TickerProvider vsync)
      : controller = AnimationController(
          duration: springPressDuration,
          vsync: vsync,
        ) {
    scaleAnimation = Tween<double>(begin: 1.0, end: springPressScale)
        .animate(CurvedAnimation(parent: controller, curve: Curves.easeInOut));
  }

  void onPressIn() => controller.forward();
  void onPressOut() => controller.reverse();
  void dispose() => controller.dispose();
}

String formatTime(int ms) {
  final totalSeconds = (ms / 1000).ceil();
  final minutes = totalSeconds ~/ 60;
  final seconds = totalSeconds % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}
