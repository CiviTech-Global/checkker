import 'package:flutter/material.dart';

import '../models/game.dart';
import '../theme/tokens.dart';

class MoveHistory extends StatelessWidget {
  final List<MoveRecord> moves;

  const MoveHistory({super.key, required this.moves});

  @override
  Widget build(BuildContext context) {
    if (moves.isEmpty) {
      return Center(
        child: Text('No moves yet', style: TextStyle(fontSize: 12, color: AppColors.text.muted)),
      );
    }

    // Group moves into pairs (white, black)
    final pairs = <List<MoveRecord>>[];
    for (var i = 0; i < moves.length; i += 2) {
      pairs.add([
        moves[i],
        if (i + 1 < moves.length) moves[i + 1],
      ]);
    }

    return ListView.builder(
      shrinkWrap: true,
      padding: const EdgeInsets.all(AppSpacing.xs),
      itemCount: pairs.length,
      itemBuilder: (context, i) {
        final pair = pairs[i];
        return Padding(
          padding: const EdgeInsets.only(bottom: 2),
          child: Row(
            children: [
              SizedBox(
                width: 24,
                child: Text(
                  '${i + 1}.',
                  style: TextStyle(fontSize: 11, color: AppColors.text.muted),
                ),
              ),
              Expanded(
                child: Text(
                  _moveText(pair[0]),
                  style: TextStyle(fontSize: 11, color: AppColors.text.primary),
                ),
              ),
              if (pair.length > 1)
                Expanded(
                  child: Text(
                    _moveText(pair[1]),
                    style: TextStyle(fontSize: 11, color: AppColors.text.primary),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  String _moveText(MoveRecord move) {
    final card = move.card.id;
    final notation = move.move;
    return '$card $notation';
  }
}
