import { Client, type Room } from "@colyseus/sdk";

import {
  DEFAULT_SERVER_URL,
  type JoinWorldPayload,
  WORLD_ROOM_NAME
} from "@pixel/shared";

export type WorldRoom = Room;

export async function connectToWorld(
  joinPayload: JoinWorldPayload,
  endpoint = getWorldServerUrl()
): Promise<WorldRoom> {
  const client = new Client(endpoint);
  return client.joinOrCreate(WORLD_ROOM_NAME, joinPayload);
}

export function getWorldServerUrl(): string {
  if (typeof window === "undefined") {
    return DEFAULT_SERVER_URL;
  }

  const { protocol, hostname } = window.location;
  const serverProtocol = protocol === "https:" ? "https" : "http";

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${serverProtocol}://${hostname}:2567`;
  }

  return DEFAULT_SERVER_URL;
}
