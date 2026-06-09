class Cosmetic {
  final String id;
  final String type;
  final String name;
  final String? description;
  final int price;
  final String rarity;
  final String? assetUrl;
  final bool isDefault;

  const Cosmetic({
    required this.id,
    required this.type,
    required this.name,
    this.description,
    required this.price,
    required this.rarity,
    this.assetUrl,
    this.isDefault = false,
  });

  factory Cosmetic.fromJson(Map<String, dynamic> json) {
    return Cosmetic(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'board',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      price: json['price'] as int? ?? 0,
      rarity: json['rarity'] as String? ?? 'common',
      assetUrl: json['assetUrl'] as String?,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }
}

class UserCosmetic {
  final String userId;
  final String cosmeticId;
  final bool equipped;
  final Cosmetic? cosmetic;

  const UserCosmetic({
    required this.userId,
    required this.cosmeticId,
    this.equipped = false,
    this.cosmetic,
  });

  factory UserCosmetic.fromJson(Map<String, dynamic> json) {
    return UserCosmetic(
      userId: json['userId'] as String? ?? '',
      cosmeticId: json['cosmeticId'] as String? ?? '',
      equipped: json['equipped'] as bool? ?? false,
      cosmetic: json['cosmetic'] != null
          ? Cosmetic.fromJson(json['cosmetic'] as Map<String, dynamic>)
          : null,
    );
  }
}
