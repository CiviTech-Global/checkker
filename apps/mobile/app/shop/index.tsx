import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import Animated, {
  FadeIn,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
  gradients,
  shadows,
} from "../../src/theme/tokens";
import { useSpringPress, staggerDelay } from "../../src/utils/animations";
import { useReducedMotion } from "../../src/hooks/useReducedMotion";
import { useSocket } from "../../src/hooks/useSocket";
import Icon, { type IconName } from "../../src/components/Icon";
import { getCosmeticDef } from "@checkker/shared";

interface ShopCosmeticItem {
  id: string;
  name: string;
  type: "board" | "piece" | "card_back";
  description?: string | null;
  rarity: "common" | "rare" | "epic";
  price: number;
  assetUrl?: string | null;
  isDefault?: boolean;
}

interface UserCosmeticEntry {
  cosmeticId: string;
  equipped: boolean;
}

const TABS = ["Board Themes", "Piece Themes", "Card Backs"] as const;
const TAB_TYPES = ["board", "piece", "card_back"] as const;

function CosmeticCard({
  cosmetic,
  isOwned,
  isEquipped,
  index,
  onEquip,
  onBuy,
}: {
  cosmetic: ShopCosmeticItem;
  isOwned: boolean;
  isEquipped: boolean;
  index: number;
  onEquip: () => void;
  onBuy: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();
  const isFree = cosmetic.isDefault || cosmetic.price === 0;
  const rarityColor =
    cosmetic.rarity === "rare" ? colors.accent.gold : colors.text.muted;
  const typeIcon =
    cosmetic.type === "board"
      ? "grid-view"
      : cosmetic.type === "piece"
        ? "chess-piece"
        : "cards-playing";

  const isBoard = cosmetic.type === "board";
  const isPiece = cosmetic.type === "piece";
  const isCardBack = cosmetic.type === "card_back";
  const def = getCosmeticDef(cosmetic.assetUrl);
  const boardColors = def?.board;
  const pieceColors = def?.piece;
  const cardBackColors = def?.cardBack;

  const isEpic = cosmetic.rarity === "epic";
  const previewGradient = isEpic
    ? gradients.neonViolet
    : cosmetic.rarity === "rare"
      ? gradients.goldToBronze
      : gradients.velvet;

  // Gentle idle float for the card preview (respects reduced motion).
  const reducedMotion = useReducedMotion();
  const bobY = useSharedValue(0);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
  }));
  useEffect(() => {
    if (reducedMotion) {
      bobY.value = 0;
      return;
    }
    const loop = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    bobY.value = loop;
    return () => {
      bobY.value = 0;
    };
  }, [reducedMotion, bobY]);

  return (
    <Animated.View
      entering={SlideInUp.duration(300)
        .delay(staggerDelay(index, 60))
        .springify()
        .damping(15)}
      style={animatedStyle}
    >
      <TouchableOpacity
        onPress={isOwned ? onEquip : onBuy}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
      >
        <View
          style={[
            styles.card,
            styles.cardVertical,
            isEquipped && styles.cardEquipped,
            !isEquipped &&
              cosmetic.rarity !== "common" && {
                borderColor:
                  cosmetic.rarity === "epic"
                    ? colors.accent.primary
                    : colors.accent.gold,
                ...shadows.glow,
              },
          ]}
        >
          {/* Preview Area */}
          <Animated.View
            style={[styles.cardPreview, styles.cardPreviewVertical, floatStyle]}
          >
            <LinearGradient
              colors={previewGradient}
              style={[styles.cardPreview, styles.cardPreviewVertical]}
            >
              {isBoard && boardColors ? (
                <View style={styles.boardPreviewWrapper}>
                  <View style={styles.miniBoard}>
                    {[0, 1, 2, 3].map((row) => (
                      <View key={row} style={styles.miniBoardRow}>
                        {[0, 1, 2, 3].map((col) => {
                          const isLight = (row + col) % 2 === 0;
                          return (
                            <View
                              key={col}
                              style={[
                                styles.miniBoardSquare,
                                {
                                  backgroundColor: isLight
                                    ? boardColors.light
                                    : boardColors.dark,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              ) : isPiece && pieceColors ? (
                <View style={styles.piecePreviewWrapper}>
                  <View style={styles.pieceShowcaseRow}>
                    <View style={styles.pieceSlot}>
                      <Text
                        style={[
                          styles.pieceGlyph,
                          { color: pieceColors.white },
                        ]}
                      >
                        ♚
                      </Text>
                      <Text
                        style={[
                          styles.pieceSubLabel,
                          { color: pieceColors.white },
                        ]}
                      >
                        White
                      </Text>
                    </View>
                    <View style={styles.pieceDivider} />
                    <View style={styles.pieceSlot}>
                      <Text
                        style={[
                          styles.pieceGlyph,
                          { color: pieceColors.black },
                        ]}
                      >
                        ♛
                      </Text>
                      <Text
                        style={[
                          styles.pieceSubLabel,
                          { color: pieceColors.black },
                        ]}
                      >
                        Black
                      </Text>
                    </View>
                  </View>
                </View>
              ) : isCardBack && cardBackColors ? (
                <View style={styles.cardBackWrapper}>
                  <View
                    style={[
                      styles.cardBackCard,
                      { backgroundColor: cardBackColors.primary },
                    ]}
                  >
                    <View
                      style={[
                        styles.cardBackInnerBorder,
                        { borderColor: cardBackColors.accent },
                      ]}
                    >
                      <View
                        style={[
                          styles.cardBackDiamond,
                          { borderColor: cardBackColors.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cardBackDiamondText,
                            { color: cardBackColors.accent },
                          ]}
                        >
                          ♦
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <Icon
                  name={typeIcon as IconName}
                  size={36}
                  color={rarityColor}
                />
              )}
            </LinearGradient>
          </Animated.View>

          {/* Info Area */}
          <View style={[styles.cardInfo, styles.cardInfoVertical]}>
            <Text style={styles.cardName} numberOfLines={1}>
              {cosmetic.name}
            </Text>
            {cosmetic.description ? (
              <Text style={styles.cardDesc} numberOfLines={2}>
                {cosmetic.description}
              </Text>
            ) : null}

            {/* Rarity Dot + Label */}
            <View style={styles.rarityRow}>
              <View
                style={[styles.rarityDot, { backgroundColor: rarityColor }]}
              />
              <Text style={[styles.rarityLabel, { color: rarityColor }]}>
                {cosmetic.rarity.toUpperCase()}
              </Text>
            </View>

            {/* Status */}
            {isEquipped ? (
              <View style={styles.equippedBadge}>
                <Text style={styles.equippedText}>Equipped</Text>
              </View>
            ) : isOwned ? (
              <Text style={styles.ownedText}>Owned</Text>
            ) : (
              <Text
                style={[
                  styles.priceText,
                  {
                    color: isFree ? colors.accent.green : colors.text.secondary,
                  },
                ]}
              >
                {isFree ? "FREE" : `${cosmetic.price} coins`}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ShopScreen() {
  const router = useRouter();
  const {
    cosmetics,
    userCosmetics,
    coins,
    getCosmetics,
    equipCosmetic,
    purchaseCosmetic,
    onCosmeticPurchased,
  } = useSocket();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCosmetics();
  }, [getCosmetics]);

  useEffect(() => {
    onCosmeticPurchased((data) => {
      if (data.success) {
        Alert.alert(
          "Purchased!",
          `Item unlocked. Balance: ${data.coins} coins.`,
        );
      } else {
        Alert.alert("Purchase failed", data.error ?? "Something went wrong.");
      }
    });
    return () => onCosmeticPurchased(null);
  }, [onCosmeticPurchased]);

  useEffect(() => {
    if (cosmetics && userCosmetics) {
      setLoading(false);
    }
  }, [cosmetics, userCosmetics]);

  const filtered = useMemo(() => {
    if (!cosmetics) return [];
    const type = TAB_TYPES[activeTab];
    return (cosmetics as ShopCosmeticItem[]).filter((c) => c.type === type);
  }, [cosmetics, activeTab]);

  const isOwned = (id: string) =>
    (userCosmetics as UserCosmeticEntry[] | null)?.some(
      (uc) => uc.cosmeticId === id,
    ) ?? false;

  const isEquipped = (id: string) =>
    (userCosmetics as UserCosmeticEntry[] | null)?.some(
      (uc) => uc.cosmeticId === id && uc.equipped,
    ) ?? false;

  const handleEquip = (id: string) => {
    equipCosmetic(id);
  };

  const handleBuy = (item: ShopCosmeticItem) => {
    const price = item.isDefault ? 0 : item.price;
    if (price > coins) {
      Alert.alert(
        "Not enough coins",
        `${item.name} costs ${price} coins but you have ${coins}. Win games to earn more!`,
      );
      return;
    }
    Alert.alert(
      "Buy " + item.name + "?",
      price === 0
        ? "This item is free."
        : `This will cost ${price} coins. You have ${coins}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Buy", onPress: () => purchaseCosmetic(item.id) },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop</Text>
        <View style={styles.coinBadge}>
          <Icon name="coin" size={16} color={colors.accent.gold} />
          <Text style={styles.coinText}>{coins}</Text>
        </View>
      </Animated.View>

      {/* Tab Selector */}
      <Animated.View
        entering={FadeIn.duration(300).delay(100)}
        style={styles.tabRow}
      >
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === i && styles.tabBtnActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text
              style={[styles.tabText, activeTab === i && styles.tabTextActive]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Content */}
      {loading ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.centerState}
        >
          <ActivityIndicator size="large" color={colors.accent.gold} />
        </Animated.View>
      ) : filtered.length === 0 ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.centerState}
        >
          <Icon name="shop" size={48} color={colors.text.muted} />
          <Text style={styles.emptyText}>No items available</Text>
        </Animated.View>
      ) : (
        <View style={styles.grid}>
          {filtered.map((item: ShopCosmeticItem, i: number) => (
            <View key={item.id} style={styles.gridCell}>
              <CosmeticCard
                cosmetic={item}
                isOwned={isOwned(item.id)}
                isEquipped={isEquipped(item.id)}
                index={i}
                onEquip={() => handleEquip(item.id)}
                onBuy={() => handleBuy(item)}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.accent.gold,
    textAlign: "center",
    letterSpacing: 2,
  },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(212,168,67,0.15)",
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.accent.gold,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  coinText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent.goldBright,
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.md - 2,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "rgba(205,175,100,0.2)",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.muted,
  },
  tabTextActive: {
    color: colors.accent.gold,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 15,
    color: colors.text.muted,
    fontWeight: "500",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  gridCell: {
    width: "23.5%",
    minWidth: 120,
  },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
  },
  cardVertical: {
    minHeight: 280,
  },
  cardBoard: {
    minHeight: 280,
  },
  cardEquipped: {
    borderColor: colors.accent.gold,
    borderWidth: 2,
    ...shadows.gold,
  },
  cardPreview: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPreviewVertical: {
    height: 155,
  },
  cardPreviewBoard: {
    height: 155,
  },
  boardPreviewWrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
  },
  miniBoard: {
    width: 86,
    height: 86,
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
  miniBoardRow: {
    flex: 1,
    flexDirection: "row",
  },
  miniBoardSquare: {
    flex: 1,
  },
  piecePreviewWrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
    width: "100%",
  },
  pieceShowcaseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: 104,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  pieceSlot: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 38,
  },
  pieceGlyph: {
    fontSize: 32,
    lineHeight: 36,
  },
  pieceSubLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    opacity: 0.85,
    textTransform: "uppercase",
  },
  pieceDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  cardBackWrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
  },
  cardBackCard: {
    width: 60,
    height: 90,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    padding: 3,
  },
  cardBackInnerBorder: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBackDiamond: {
    width: 24,
    height: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
  },
  cardBackDiamondText: {
    fontSize: 11,
    lineHeight: 12,
    transform: [{ rotate: "-45deg" }],
  },
  cardInfo: {
    padding: spacing.sm,
    gap: 3,
  },
  cardInfoVertical: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  cardInfoBoard: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text.primary,
  },
  cardDesc: {
    fontSize: 11,
    color: colors.text.muted,
  },
  rarityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rarityLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  equippedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,168,67,0.2)",
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.accent.gold,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  equippedText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent.goldBright,
  },
  ownedText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent.green,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
