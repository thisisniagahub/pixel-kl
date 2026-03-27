export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;
export const TILE_SIZE = 16;
export const PLAYER_SPEED = 96;
export const MAX_MOVE_DELTA = 12;
export const MOVE_SEND_INTERVAL_MS = 50;
export const DEFAULT_SERVER_URL = "http://localhost:2567";
export const WORLD_ROOM_NAME = "world";
export const WORLD_SNAPSHOT_EVENT = "world:snapshot";
export const PLAYER_SNAPSHOT_EVENT = "player:snapshot";
export const PLAYER_LEFT_EVENT = "player:left";
export const PLAYER_MOVE_EVENT = "player:move";
export const PLAYER_CUSTOMIZATION_EVENT = "player:customization";

export const WORLD_BOUNDS = {
  minX: TILE_SIZE,
  minY: TILE_SIZE,
  maxX: GAME_WIDTH - TILE_SIZE,
  maxY: GAME_HEIGHT - TILE_SIZE
} as const;

export type {
  BottomId,
  CharacterCustomization,
  HairStyleId,
  SkinToneId,
  TopId
} from "./customization.js";
export {
  CUSTOMIZATION_OPTIONS,
  DEFAULT_CHARACTER_CUSTOMIZATION,
  sanitizeCharacterCustomization
} from "./customization.js";

export type PlayerMovePayload = {
  dx: number;
  dy: number;
};

export type PlayerCustomizationPayload =
  Partial<import("./customization.js").CharacterCustomization>;

export type JoinWorldPayload = {
  name: string;
  customization?: Partial<import("./customization.js").CharacterCustomization>;
};

export type PlayerSnapshot = {
  sessionId: string;
  name: string;
  x: number;
  y: number;
  customization: import("./customization.js").CharacterCustomization;
};

export type PlayerLeftPayload = {
  sessionId: string;
};

export type WorldSnapshot = {
  roomName: typeof WORLD_ROOM_NAME;
  players: PlayerSnapshot[];
};
