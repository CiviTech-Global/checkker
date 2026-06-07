export const galleryImages = {
  king: require("./king.png"),
  queen: require("./queen.png"),
  knight: require("./knight.png"),
  rook: require("./rook.png"),
  bishop: require("./bishop.png"),
  pawns: require("./pawns.png"),
  aceWild: require("./ace-wild.png"),
} as const;
export type GalleryImageKey = keyof typeof galleryImages;
