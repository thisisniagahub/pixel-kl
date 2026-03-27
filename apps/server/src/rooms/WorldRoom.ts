import { Client, Room } from "@colyseus/core";

import {
  DEFAULT_CHARACTER_CUSTOMIZATION,
  MAX_MOVE_DELTA,
  PLAYER_CUSTOMIZATION_EVENT,
  PLAYER_LEFT_EVENT,
  PLAYER_MOVE_EVENT,
  type PlayerCustomizationPayload,
  PLAYER_SNAPSHOT_EVENT,
  TILE_SIZE,
  type JoinWorldPayload,
  sanitizeCharacterCustomization,
  type PlayerMovePayload,
  type PlayerSnapshot,
  WORLD_ROOM_NAME,
  WORLD_SNAPSHOT_EVENT,
  type WorldSnapshot
} from "@pixel/shared";

type InternalPlayer = PlayerSnapshot;

const WORLD_MIN = TILE_SIZE;
const WORLD_MAX_X = 640 - TILE_SIZE;
const WORLD_MAX_Y = 360 - TILE_SIZE;

export class WorldRoom extends Room {
  override maxClients = 24;
  private readonly players = new Map<string, InternalPlayer>();

  override onCreate(): void {
    this.setMetadata({
      name: WORLD_ROOM_NAME
    });

    this.onMessage(PLAYER_MOVE_EVENT, (client, payload: PlayerMovePayload) => {
      const player = this.players.get(client.sessionId);
      if (!player) {
        return;
      }

      const move = sanitizeMove(payload);
      player.x = clamp(player.x + move.dx, WORLD_MIN, WORLD_MAX_X);
      player.y = clamp(player.y + move.dy, WORLD_MIN, WORLD_MAX_Y);

      this.broadcast(PLAYER_SNAPSHOT_EVENT, player);
    });

    this.onMessage(
      PLAYER_CUSTOMIZATION_EVENT,
      (client, payload: PlayerCustomizationPayload) => {
        const player = this.players.get(client.sessionId);
        if (!player) {
          return;
        }

        player.customization = sanitizeCharacterCustomization(payload);
        this.broadcast(PLAYER_SNAPSHOT_EVENT, player);
      }
    );
  }

  override onJoin(client: Client, options?: Partial<JoinWorldPayload>): void {
    const player: InternalPlayer = {
      sessionId: client.sessionId,
      name: sanitizeName(options?.name, client.sessionId),
      x: 320,
      y: 180,
      customization: sanitizeCharacterCustomization(
        options?.customization ?? DEFAULT_CHARACTER_CUSTOMIZATION
      )
    };

    this.players.set(client.sessionId, player);

    client.send(WORLD_SNAPSHOT_EVENT, this.getSnapshot());
    this.broadcast(PLAYER_SNAPSHOT_EVENT, player);
  }

  override onLeave(client: Client): void {
    this.players.delete(client.sessionId);

    this.broadcast(PLAYER_LEFT_EVENT, {
      sessionId: client.sessionId
    });
  }

  private getSnapshot(): WorldSnapshot {
    return {
      roomName: WORLD_ROOM_NAME,
      players: [...this.players.values()]
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeMove(payload: PlayerMovePayload): PlayerMovePayload {
  return {
    dx: clamp(payload.dx, -MAX_MOVE_DELTA, MAX_MOVE_DELTA),
    dy: clamp(payload.dy, -MAX_MOVE_DELTA, MAX_MOVE_DELTA)
  };
}

function sanitizeName(name: string | undefined, sessionId: string): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return `Player-${sessionId.slice(0, 4)}`;
  }

  return trimmed.slice(0, 18);
}
