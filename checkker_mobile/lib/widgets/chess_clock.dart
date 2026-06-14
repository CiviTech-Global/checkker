import 'dart:async';
import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// A chess clock that visibly counts down while its side is active.
///
/// The server only sends a fresh `timeMs` on each move, so the widget anchors
/// to that authoritative value and decrements locally between moves, re-syncing
/// whenever a new value (or turn change) arrives. The inactive side shows the
/// exact server value, frozen.
class ChessClock extends StatefulWidget {
  final int timeMs;
  final bool active;

  const ChessClock({super.key, required this.timeMs, this.active = false});

  @override
  State<ChessClock> createState() => _ChessClockState();
}

class _ChessClockState extends State<ChessClock> {
  late int _displayMs;
  int _anchorMs = 0;
  DateTime _anchorAt = DateTime.now();
  Timer? _timer;
  bool _blinkOn = true;

  @override
  void initState() {
    super.initState();
    _displayMs = widget.timeMs;
    _reanchor();
    if (widget.active) _startTimer();
  }

  @override
  void didUpdateWidget(ChessClock oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Re-sync whenever the authoritative value or the active side changes.
    if (widget.timeMs != oldWidget.timeMs || widget.active != oldWidget.active) {
      _reanchor();
      setState(() => _displayMs = widget.timeMs);
    }
    if (widget.active && _timer == null) {
      _startTimer();
    } else if (!widget.active && _timer != null) {
      _timer?.cancel();
      _timer = null;
    }
  }

  void _reanchor() {
    _anchorMs = widget.timeMs;
    _anchorAt = DateTime.now();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (!mounted) return;
      final elapsed = DateTime.now().difference(_anchorAt).inMilliseconds;
      setState(() {
        _displayMs = (_anchorMs - elapsed).clamp(0, _anchorMs);
        _blinkOn = (DateTime.now().millisecondsSinceEpoch ~/ 500).isEven;
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _format(int ms) {
    final totalSec = (ms / 1000).ceil();
    final min = totalSec ~/ 60;
    final sec = totalSec % 60;
    return '${min.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isLow = _displayMs < 30000;
    final textColor = isLow
        ? (widget.active && !_blinkOn ? Colors.transparent : AppColors.accent.red)
        : AppColors.text.primary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs, vertical: AppSpacing.xxs),
      decoration: BoxDecoration(
        color: widget.active
            ? Colors.white.withValues(alpha: 0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Text(
        _format(_displayMs),
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          fontFamily: 'monospace',
          color: textColor,
        ),
      ),
    );
  }
}
