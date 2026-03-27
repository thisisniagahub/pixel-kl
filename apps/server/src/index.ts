import http from "node:http";

import { Server } from "@colyseus/core";
import express, { type Request, type Response } from "express";

import { MockOpenClawAdapter } from "@pixel/ai-adapter";
import { WORLD_ROOM_NAME } from "@pixel/shared";

import { WorldRoom } from "./rooms/WorldRoom.js";
import { AlignedWebSocketTransport } from "./transport/AlignedWebSocketTransport.js";

const port = Number(process.env.PORT ?? 2567);
const app = express();

app.use(express.json());

app.get("/health", (_request: Request, response: Response) => {
  response.json({
    ok: true,
    room: WORLD_ROOM_NAME
  });
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new AlignedWebSocketTransport({
    server
  })
});

gameServer.define(WORLD_ROOM_NAME, WorldRoom);

const aiAdapter = new MockOpenClawAdapter();

await gameServer.listen(port);

console.log(`[pixel-server] listening on http://localhost:${port}`);
console.log(`[pixel-server] room "${WORLD_ROOM_NAME}" is registered`);
console.log(`[pixel-server] ai mode: ${aiAdapter.kind}`);
