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
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
  glassStyle,
  gradients,
  shadows,
} from "../../src/theme/tokens";
import { useSpringPress, staggerDelay } from "../../src/utils/animations";
import { useSocket } from "../../src/hooks/useSocket";
import Icon from "../../src/components/Icon";

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
  cosmetic: any;
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
    cosmetic.type === "board" ? "grid-view" : cosmetic.type === "piece" ? "chess-piece" : "cards-playing";

  return (
    <Animated.View
      entering={SlideInUp.duration(300).delay(staggerDelay(index, 60)).springify().damping(15)}
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
            isEquipped && styles.cardEquipped,
          ]}
        >
          {/* Preview Area */}
          <LinearGradient
            colors={gradients.velvet}
            style={styles.cardPreview}
          >
            <Icon name={typeIcon as any} size={36} color={rarityColor} />
          </LinearGradient>

          {/* Info Area */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {cosmetic.name}
            </Text>
            {cosmetic.description ? (
              <Text style={styles.cardDesc} numberOfLines={1}>
                {cosmetic.description}
              </Text>
            ) : null}

            {/* Rarity Dot + Label */}
            <View style={styles.rarityRow}>
              <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
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
                  { color: isFree ? colors.accent.green : colors.text.secondary },
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
        Alert.alert("Purchased!", `Item unlocked. Balance: ${data.coins} coins.`);
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
    return cosmetics.filter((c: any) => c.type === type);
  }, [cosmetics, activeTab]);

  const isOwned = (id: string) =>
    userCosmetics?.some((uc: any) => uc.cosmeticId === id) ?? false;

  const isEquipped = (id: string) =>
    userCosmetics?.some((uc: any) => uc.cosmeticId === id && uc.equipped) ?? false;

  const handleEquip = (id: string) => {
    equipCosmetic(id);
  };

  const handleBuy = (item: any) => {
    const price = item.isDefault ? 0 : item.price;
    if (price > coins) {
      Alert.alert("Not enough coins", `${item.name} costs ${price} coins but you have ${coins}. Win games to earn more!`);
      return;
    }
    Alert.alert(
      "Buy " + item.name + "?",
      price === 0 ? "This item is free." : `This will cost ${price} coins. You have ${coins}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Buy", onPress: () => purchaseCosmetic(item.id) },
      ]
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
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
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
      <Animated.View entering={FadeIn.duration(300).delay(100)} style={styles.tabRow}>
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
          {filtered.map((item: any, i: number) => (
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
    width: "48%",
  },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
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
  cardInfo: {
    padding: spacing.sm,
    gap: 3,
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
