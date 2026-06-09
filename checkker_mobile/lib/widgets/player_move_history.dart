import 'package:flutter/material.dart';

import '../models/game.dart' show MoveRecord, parseColor;
import '../theme/tokens.dart';

class PlayerMoveHistory extends StatelessWidget {
  final String label;
  final String color; // 'white' or 'black'
  final List<MoveRecord> moves;

  const PlayerMoveHistory({
    super.key,
    required this.label,
    required this.color,
    required this.moves,
  });

  @override
  Widget build(BuildContext context) {
    final playerMoves = moves.where((m) => m.color == parseColor(color)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppColors.text.secondary,
          ),
        ),
        const SizedBox(height: 2),
        if (playerMoves.isEmpty)
          Text('—', style: TextStyle(fontSize: 11, color: AppColors.text.muted))
        else
          Wrap(
            spacing: 4,
            runSpacing: 2,
            children: playerMoves.map((m) {
              final card = m.card.id;
              final notation = m.move;
              return Text(
                '$card$notation',
                style: TextStyle(fontSize: 10, color: AppColors.text.primary),
              );
            }).toList(),
          ),
      ],
    );
  }
}
