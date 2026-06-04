import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  useWindowDimensions,
} from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { ChessScene3D } from "../three/ChessScene3D";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Chess } from "chess.js";

interface ChessBoardGLProps {
  fen?: string;
  orientation?: "white" | "black";
  highlightedSquares?: string[];
  selectedSquare?: string | null;
  lastMove?: { from: string; to: string } | null;
  interactive?: boolean;
  onSquarePress?: (square: string) => void;
}

function ChessBoardGL({
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  orientation = "white",
  highlightedSquares = [],
  selectedSquare = null,
  lastMove = null,
  interactive = true,
  onSquarePress,
}: ChessBoardGLProps) {
  const sceneRef = useRef<ChessScene3D | null>(null);
  const reducedMotion = useReducedMotion();
  const { width: screenWidth } = useWindowDimensions();
  const [viewLayout, setViewLayout] = useState({
    x: 0,
    y: 0,
    width: 320,
    height: 320,
  });

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const width = (gl as any).drawingBufferWidth ?? viewLayout.width;
      const height = (gl as any).drawingBufferHeight ?? viewLayout.height;
      const scene = new ChessScene3D(gl, width, height);
      scene.setReducedMotion(reducedMotion);
      scene.updatePosition(fen);
      scene.setOrientation(orientation);
      scene.setHighlights(highlightedSquares, selectedSquare, lastMove);
      sceneRef.current = scene;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Sync FEN changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.updatePosition(fen);

    // Detect check/checkmate
    try {
      const chess = new Chess(fen);
      if (chess.isCheckmate()) {
        const kingSquare = findKingSquare(fen, chess.turn());
        if (kingSquare) scene.setCheck(kingSquare, true);
      } else if (chess.isCheck()) {
        const kingSquare = findKingSquare(fen, chess.turn());
        if (kingSquare) scene.setCheck(kingSquare, false);
      } else {
        scene.setCheck(null, false);
      }
    } catch {
      // skip
    }
  }, [fen]);

  // Sync highlights
  useEffect(() => {
    sceneRef.current?.setHighlights(highlightedSquares, selectedSquare, lastMove);
  }, [highlightedSquares, selectedSquare, lastMove]);

  // Sync orientation
  useEffect(() => {
    sceneRef.current?.setOrientation(orientation);
  }, [orientation]);

  // Sync reduced motion
  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // Cleanup
  useEffect(() => {
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setViewLayout({ x, y, width, height });
    sceneRef.current?.resize(width, height);
  }, []);

  const handleTouch = useCallback(
    (e: GestureResponderEvent) => {
      if (!interactive || !onSquarePress || !sceneRef.current) return;

      const { pageX, pageY } = e.nativeEvent;
      const square = sceneRef.current.handleTouch(
        pageX,
        pageY,
        viewLayout.x,
        viewLayout.y,
        viewLayout.width,
        viewLayout.height
      );

      if (square) {
        onSquarePress(square);
      }
    },
    [interactive, onSquarePress, viewLayout]
  );

  // Board takes full available width (up to 560px).
  // Height is 1.2× width to accommodate taller pieces at the back rank
  // that project above the board due to 3D tilt.
  const boardSize = Math.min(screenWidth - 16, 560);

  return (
    <View
      style={[styles.container, { width: boardSize, height: boardSize * 1.2 }]}
      onLayout={onLayout}
    >
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
      {/* Touch intercept layer */}
      <View
        style={styles.touchLayer}
        onStartShouldSetResponder={() => interactive}
        onResponderRelease={handleTouch}
      />
    </View>
  );
}

/** Find the square of the king whose turn it is */
function findKingSquare(fen: string, turn: "w" | "b"): string | null {
  const kingChar = turn === "w" ? "K" : "k";
  const rows = fen.split(" ")[0].split("/");
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    let fileIdx = 0;
    for (const ch of rows[rowIdx]) {
      if (ch >= "1" && ch <= "8") {
        fileIdx += parseInt(ch);
      } else {
        if (ch === kingChar) {
          return String.fromCharCode(97 + fileIdx) + (8 - rowIdx);
        }
        fileIdx++;
      }
    }
  }
  return null;
}

export default React.memo(ChessBoardGL);

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 6,
  },
  glView: {
    flex: 1,
  },
  touchLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
