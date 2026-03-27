export type NpcPrompt = {
  npcId: string;
  situation: string;
  playerMessage?: string;
};

export type NpcReply = {
  text: string;
  action: "idle" | "wave" | "guide";
};

export interface OpenClawAdapter {
  readonly kind: "openclaw" | "mock";
  generateReply(prompt: NpcPrompt): Promise<NpcReply>;
}

export class MockOpenClawAdapter implements OpenClawAdapter {
  readonly kind = "mock";

  async generateReply(prompt: NpcPrompt): Promise<NpcReply> {
    const message = prompt.playerMessage?.trim();

    if (message) {
      return {
        text: `Mock reply for ${prompt.npcId}: ${message}`,
        action: "wave"
      };
    }

    return {
      text: `Mock ${prompt.npcId} is watching the district.`,
      action: "idle"
    };
  }
}

export class FallbackOpenClawAdapter implements OpenClawAdapter {
  readonly kind = "openclaw";

  constructor(
    private readonly primary: OpenClawAdapter,
    private readonly fallback: OpenClawAdapter = new MockOpenClawAdapter()
  ) {}

  async generateReply(prompt: NpcPrompt): Promise<NpcReply> {
    try {
      return await this.primary.generateReply(prompt);
    } catch {
      return this.fallback.generateReply(prompt);
    }
  }
}
