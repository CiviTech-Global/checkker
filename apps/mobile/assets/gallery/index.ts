export const galleryImages = {
  king: require("./king.webp"),
  queen: require("./queen.webp"),
  knight: require("./knight.webp"),
  rook: require("./rook.webp"),
  bishop: require("./bishop.webp"),
  pawns: require("./pawns.webp"),
  aceWild: require("./ace-wild.webp"),
} as const;
export type GalleryImageKey = keyof typeof galleryImages;
