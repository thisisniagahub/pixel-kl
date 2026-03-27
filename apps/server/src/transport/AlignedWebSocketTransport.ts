import http, { type IncomingMessage } from "node:http";
import { URL } from "node:url";

import { connectClientToRoom, matchMaker, Transport } from "@colyseus/core";
import express, { type Express } from "express";
import { WebSocketServer, type WebSocket } from "ws";

import { WebSocketClient } from "@colyseus/ws-transport/WebSocketClient";

type TransportOptions = {
  server?: http.Server;
  noServer?: boolean;
  maxPayload?: number;
  perMessageDeflate?: boolean;
  pingInterval?: number;
  pingMaxRetries?: number;
};

type PingWebSocket = WebSocket & {
  pingCount?: number;
};

export class AlignedWebSocketTransport extends Transport {
  public override server: http.Server;

  private readonly wss: WebSocketServer;
  private readonly pingIntervalMS: number;
  private readonly pingMaxRetries: number;
  private _expressApp?: Express;
  private pingInterval?: NodeJS.Timeout;
  private _originalSend: typeof WebSocketClient.prototype.raw | null = null;

  constructor(options: TransportOptions = {}) {
    super();

    if (options.maxPayload === undefined) {
      options.maxPayload = 4 * 1024;
    }

    if (options.perMessageDeflate === undefined) {
      options.perMessageDeflate = false;
    }

    this.pingIntervalMS = options.pingInterval ?? 3_000;
    this.pingMaxRetries = options.pingMaxRetries ?? 2;

    if (!options.server && !options.noServer) {
      options.server = http.createServer();
    }

    this.wss = new WebSocketServer(options);
    this.wss.on("connection", (rawClient, request) => {
      void this.onConnection(rawClient as PingWebSocket, request);
    });
    this.wss.on("error", (error) => {
      console.error(error);
    });

    this.server = options.server as http.Server;

    if (this.pingIntervalMS > 0 && this.pingMaxRetries > 0) {
      this.server.on("listening", () => {
        this.autoTerminateUnresponsiveClients(this.pingIntervalMS, this.pingMaxRetries);
      });
      this.server.on("close", () => {
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
      });
    }
  }

  override getExpressApp(): Express {
    if (!this._expressApp) {
      this._expressApp = express();
      this.server.on("request", this._expressApp);
    }

    return this._expressApp;
  }

  override listen(
    port: number | string,
    hostname?: string,
    backlog?: number,
    listeningListener?: (error?: Error) => void
  ): this {
    this.server.listen(
      port as unknown as number,
      hostname,
      backlog,
      listeningListener as () => void
    );
    return this;
  }

  override shutdown(): void {
    this.wss.close();
    this.server.close();
  }

  override simulateLatency(milliseconds: number): void {
    if (this._originalSend === null) {
      this._originalSend = WebSocketClient.prototype.raw;
    }

    const originalSend = this._originalSend;

    WebSocketClient.prototype.raw =
      milliseconds <= Number.EPSILON
        ? originalSend
        : function rawWithLatency(
            this: WebSocketClient,
            ...args: Parameters<typeof originalSend>
          ) {
            let [buffer, ...rest] = args;
            buffer = Uint8Array.from(buffer as ArrayLike<number>);
            setTimeout(() => originalSend.apply(this, [buffer, ...rest]), milliseconds);
          };
  }

  private autoTerminateUnresponsiveClients(
    pingInterval: number,
    pingMaxRetries: number
  ): void {
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        const socket = client as PingWebSocket;

        if ((socket.pingCount ?? 0) >= pingMaxRetries) {
          socket.terminate();
          return;
        }

        socket.pingCount = (socket.pingCount ?? 0) + 1;
        socket.ping(() => undefined);
      });
    }, pingInterval);
  }

  private async onConnection(rawClient: PingWebSocket, request: IncomingMessage): Promise<void> {
    rawClient.on("error", (error) => {
      console.error(error);
    });
    rawClient.on("pong", () => {
      rawClient.pingCount = 0;
    });
    rawClient.pingCount = 0;

    const parsedUrl = new URL(`ws://pixel.local${request.url ?? "/"}`);
    const sessionId = parsedUrl.searchParams.get("sessionId");
    const roomMatch = parsedUrl.pathname.match(/\/[a-zA-Z0-9_\-]+\/([a-zA-Z0-9_\-]+)$/);
    const roomId = roomMatch?.[1];

    if (!sessionId || !roomId) {
      rawClient.close(1000);
      return;
    }

    const room = matchMaker.getLocalRoomById(roomId);
    const client = new WebSocketClient(sessionId, rawClient);

    try {
      const token =
        parsedUrl.searchParams.get("_authToken") ??
        getBearerToken(request.headers.authorization);
      const authContext = {
        headers: new Headers(normalizeHeaders(request.headers)),
        ip:
          firstHeaderValue(request.headers["x-real-ip"]) ??
          firstHeaderValue(request.headers["x-forwarded-for"]) ??
          request.socket.remoteAddress ??
          "unknown",
        ...(token ? { token } : {})
      };

      await connectClientToRoom(
        room,
        client,
        authContext,
        {
          ...(parsedUrl.searchParams.has("reconnectionToken")
            ? { reconnectionToken: parsedUrl.searchParams.get("reconnectionToken") as string }
            : {}),
          ...(parsedUrl.searchParams.has("skipHandshake") ? { skipHandshake: true } : {})
        }
      );
    } catch (error) {
      const code = getErrorCode(error);
      const message = error instanceof Error ? error.message : "Unable to join room";
      client.error(code, message, () => rawClient.close(4002, message));
    }
  }
}

function getBearerToken(authorizationHeader: string | string[] | undefined): string | undefined {
  const authorization = firstHeaderValue(authorizationHeader);
  if (!authorization) {
    return undefined;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeHeaders(
  headers: IncomingMessage["headers"]
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const firstValue = firstHeaderValue(value);
    if (firstValue !== undefined) {
      normalized[key] = firstValue;
    }
  }

  return normalized;
}

function getErrorCode(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "number"
  ) {
    return (error as { code: number }).code;
  }

  return 4000;
}
