import Phaser from "phaser";
import type { Room } from "@colyseus/sdk";

import {
  CUSTOMIZATION_OPTIONS,
  DEFAULT_CHARACTER_CUSTOMIZATION,
  GAME_HEIGHT,
  GAME_WIDTH,
  MOVE_SEND_INTERVAL_MS,
  PLAYER_CUSTOMIZATION_EVENT,
  PLAYER_LEFT_EVENT,
  PLAYER_MOVE_EVENT,
  PLAYER_SNAPSHOT_EVENT,
  PLAYER_SPEED,
  TILE_SIZE,
  type CharacterCustomization,
  type CustomizationCategory,
  type JoinWorldPayload,
  type PlayerSnapshot,
  type WorldSnapshot,
  WORLD_BOUNDS,
  WORLD_SNAPSHOT_EVENT
} from "@pixel/shared";

import { connectToWorld } from "../network/worldConnection";
import {
  applyAvatarCustomization,
  createAvatarVisual,
  destroyAvatarVisual,
  setAvatarName,
  setAvatarPosition,
  type AvatarVisual
} from "../world/avatarSprites";
import {
  NPC_DEFINITIONS,
  NPC_INTERACTION_RADIUS,
  type NpcDefinition,
  type NpcAccessory
} from "../world/npcData";

type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys & {
  WASD: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
};

type RemoteAvatar = AvatarVisual;

type CustomizationKeys = Record<CustomizationCategory, Phaser.Input.Keyboard.Key>;

type CustomizationRow = {
  swatch: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
};

type NpcAvatar = {
  definition: NpcDefinition;
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
  head: Phaser.GameObjects.Ellipse;
  leftEye: Phaser.GameObjects.Ellipse;
  rightEye: Phaser.GameObjects.Ellipse;
  accessory: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Ellipse | Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  phase: number;
};

export class WorldScene extends Phaser.Scene {
  private cursors!: CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private customizationKeys!: CustomizationKeys;
  private player!: AvatarVisual;
  private statusText!: Phaser.GameObjects.Text;
  private modeText!: Phaser.GameObjects.Text;
  private customizationPanel!: Phaser.GameObjects.Rectangle;
  private customizationHintText!: Phaser.GameObjects.Text;
  private interactionPanel!: Phaser.GameObjects.Rectangle;
  private interactionAccent!: Phaser.GameObjects.Rectangle;
  private interactionText!: Phaser.GameObjects.Text;
  private interactionHint!: Phaser.GameObjects.Text;
  private dialoguePanel!: Phaser.GameObjects.Rectangle;
  private dialogueSpeakerText!: Phaser.GameObjects.Text;
  private dialogueBodyText!: Phaser.GameObjects.Text;
  private dialogueHintText!: Phaser.GameObjects.Text;
  private readonly remotePlayers = new Map<string, RemoteAvatar>();
  private readonly npcAvatars = new Map<string, NpcAvatar>();
  private readonly customizationRows = new Map<CustomizationCategory, CustomizationRow>();
  private room: Room | undefined;
  private localSessionId: string | undefined;
  private sendAccumulator = 0;
  private activeDialogueNpcId: string | undefined;
  private activeDialogueIndex = 0;
  private nearbyNpcId: string | undefined;
  private promptPulse = 0;
  private currentCustomization: CharacterCustomization = DEFAULT_CHARACTER_CUSTOMIZATION;

  constructor() {
    super("world");
  }

  create(): void {
    this.drawGrid();
    this.drawHeroDistrict();
    this.createNpcAvatars();
    this.createOverlayUi();
    this.currentCustomization = DEFAULT_CHARACTER_CUSTOMIZATION;

    this.player = createAvatarVisual(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      this.currentCustomization,
      "Player",
      8
    );

    const keys = this.input.keyboard?.createCursorKeys();
    const wasd = this.input.keyboard?.addKeys("W,A,S,D") as CursorKeys["WASD"];
    const interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    const customizationKeys = this.input.keyboard?.addKeys(
      "ONE,TWO,THREE,FOUR"
    ) as Record<"ONE" | "TWO" | "THREE" | "FOUR", Phaser.Input.Keyboard.Key>;

    if (!keys || !wasd || !interactKey || !customizationKeys) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.cursors = Object.assign(keys, { WASD: wasd });
    this.interactKey = interactKey;
    this.customizationKeys = {
      skinTone: customizationKeys.ONE,
      hairStyle: customizationKeys.TWO,
      top: customizationKeys.THREE,
      bottom: customizationKeys.FOUR
    };
    this.refreshCustomizationUi();

    this.add
      .text(8, 8, "PIXEL KL PREVIEW", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#f0c36a"
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(8, 24, "Arrow keys / WASD to move", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffdca0"
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.statusText = this.add
      .text(8, 40, "Connecting to local server...", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#a6f0ff"
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.modeText = this.add
      .text(8, 56, "Mode: local preview", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#c5f4b8"
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(8, 72, "1 skin  2 hair  3 top  4 bottom", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffdca0"
      })
      .setScrollFactor(0)
      .setDepth(20);

    void this.connectMultiplayer();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      void this.room?.leave();
    });
  }

  override update(time: number, delta: number): void {
    const step = PLAYER_SPEED * (delta / 1000);
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.cursors.WASD.A.isDown) {
      dx -= step;
    }
    if (this.cursors.right.isDown || this.cursors.WASD.D.isDown) {
      dx += step;
    }
    if (this.cursors.up.isDown || this.cursors.WASD.W.isDown) {
      dy -= step;
    }
    if (this.cursors.down.isDown || this.cursors.WASD.S.isDown) {
      dy += step;
    }

    if (this.activeDialogueNpcId) {
      dx = 0;
      dy = 0;
    }

    const nextX = Phaser.Math.Clamp(
      this.player.container.x + dx,
      WORLD_BOUNDS.minX,
      WORLD_BOUNDS.maxX
    );
    const nextY = Phaser.Math.Clamp(
      this.player.container.y + dy,
      WORLD_BOUNDS.minY,
      WORLD_BOUNDS.maxY
    );

    setAvatarPosition(this.player, nextX, nextY);

    if (this.room && (dx !== 0 || dy !== 0)) {
      this.sendAccumulator += delta;

      if (this.sendAccumulator >= MOVE_SEND_INTERVAL_MS) {
        this.room.send(PLAYER_MOVE_EVENT, { dx, dy });
        this.sendAccumulator = 0;
      }
    } else {
      this.sendAccumulator = 0;
    }

    this.updateNpcAnimations(time);
    this.updateNpcInteraction(time);
    this.handleCustomizationInput();

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.handleInteractKey();
    }
  }

  private async connectMultiplayer(): Promise<void> {
    const joinPayload: JoinWorldPayload = {
      name: buildPlayerName(),
      customization: this.currentCustomization
    };

    setAvatarName(this.player, joinPayload.name);

    try {
      const room = await connectToWorld(joinPayload);
      this.room = room;
      this.localSessionId = room.sessionId;

      this.statusText.setText(`Connected to room: ${room.name}`);
      this.modeText.setText("Mode: multiplayer sync active");

      room.onMessage(WORLD_SNAPSHOT_EVENT, (snapshot: WorldSnapshot) => {
        this.applySnapshot(snapshot);
      });

      room.onMessage(PLAYER_SNAPSHOT_EVENT, (player: PlayerSnapshot) => {
        this.upsertPlayer(player);
      });

      room.onMessage(PLAYER_LEFT_EVENT, (payload: { sessionId: string }) => {
        this.removeRemotePlayer(payload.sessionId);
      });

      room.onLeave(() => {
        this.statusText.setText("Disconnected. Local preview remains active.");
        this.modeText.setText("Mode: offline fallback");
        this.room = undefined;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reach local server";

      this.statusText.setText(`Offline fallback: ${message}`);
      this.modeText.setText("Mode: local preview only");
    }
  }

  private drawGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x3d2f2c, 1);

    for (let x = 0; x <= GAME_WIDTH; x += TILE_SIZE) {
      graphics.lineBetween(x, 0, x, GAME_HEIGHT);
    }

    for (let y = 0; y <= GAME_HEIGHT; y += TILE_SIZE) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private drawHeroDistrict(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x2f5d50, 1);
    graphics.fillRect(48, 56, 224, 128);

    graphics.fillStyle(0x7c4f2d, 1);
    graphics.fillRect(304, 48, 144, 160);

    graphics.fillStyle(0x4a2d29, 1);
    graphics.fillRect(96, 216, 320, 64);

    graphics.fillStyle(0xd0a24e, 1);
    graphics.fillRect(176, 88, 64, 64);

    this.add
      .text(112, 228, "Hero district placeholder", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#fff3cc"
      })
      .setDepth(1);
  }

  private createNpcAvatars(): void {
    for (const definition of NPC_DEFINITIONS) {
      this.npcAvatars.set(definition.id, this.createNpcAvatar(definition));
    }
  }

  private createNpcAvatar(definition: NpcDefinition): NpcAvatar {
    const container = this.add.container(definition.x, definition.y).setDepth(6);

    const body = this.add.rectangle(0, 2, 16, 20, definition.bodyColor);
    body.setOrigin(0.5);

    const head = this.add.ellipse(0, -9, 14, 12, definition.accentColor);
    head.setOrigin(0.5);

    const leftEye = this.add.ellipse(-3, -10, 2, 2, definition.eyeColor);
    leftEye.setOrigin(0.5);

    const rightEye = this.add.ellipse(3, -10, 2, 2, definition.eyeColor);
    rightEye.setOrigin(0.5);

    const accessory = this.createNpcAccessory(definition.accessory, definition);
    const label = this.add
      .text(0, 18, definition.name, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#fff3cc"
      })
      .setOrigin(0.5);

    container.add([body, head, leftEye, rightEye, accessory, label]);

    return {
      definition,
      container,
      body,
      head,
      leftEye,
      rightEye,
      accessory,
      label,
      phase: Math.random() * Math.PI * 2
    };
  }

  private createNpcAccessory(
    accessory: NpcAccessory,
    definition: NpcDefinition
  ): Phaser.GameObjects.Rectangle | Phaser.GameObjects.Ellipse | Phaser.GameObjects.Text {
    switch (accessory) {
      case "map": {
        const map = this.add.rectangle(-11, -2, 6, 14, definition.accentColor);
        map.setOrigin(0.5).setRotation(-0.2);
        return map;
      }
      case "wok": {
        const wok = this.add.ellipse(0, 11, 16, 6, 0x1c1714);
        wok.setOrigin(0.5);
        return wok;
      }
      case "bag": {
        const bag = this.add.rectangle(11, 3, 7, 11, definition.accentColor);
        bag.setOrigin(0.5);
        return bag;
      }
      case "lantern": {
        const lantern = this.add.ellipse(-11, -3, 6, 6, 0xffd36c);
        lantern.setOrigin(0.5);
        return lantern;
      }
      case "radio": {
        const radio = this.add.rectangle(0, 9, 10, 5, definition.accentColor);
        radio.setOrigin(0.5);
        return radio;
      }
    }

    throw new Error(`Unsupported NPC accessory: ${accessory}`);
  }

  private createOverlayUi(): void {
    this.customizationPanel = this.add
      .rectangle(GAME_WIDTH - 102, 68, 196, 108, 0x14100d, 0.88)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0x76b86d, 1)
      .setDepth(20);

    this.add
      .text(GAME_WIDTH - 188, 24, "Wardrobe Live", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#c5f4b8"
      })
      .setScrollFactor(0)
      .setDepth(20);

    const customizationRows: readonly {
      category: CustomizationCategory;
      keyHint: string;
      label: string;
      y: number;
    }[] = [
      { category: "skinTone", keyHint: "1", label: "Skin", y: 42 },
      { category: "hairStyle", keyHint: "2", label: "Hair", y: 58 },
      { category: "top", keyHint: "3", label: "Top", y: 74 },
      { category: "bottom", keyHint: "4", label: "Bottom", y: 90 }
    ];

    for (const row of customizationRows) {
      const swatch = this.add
        .rectangle(GAME_WIDTH - 180, row.y + 6, 10, 10, 0xffffff, 1)
        .setScrollFactor(0)
        .setStrokeStyle(1, 0x201716, 0.95)
        .setDepth(20);

      const text = this.add
        .text(GAME_WIDTH - 170, row.y, `${row.keyHint} ${row.label}`, {
          fontFamily: "monospace",
          fontSize: "9px",
          color: "#fff3cc"
        })
        .setScrollFactor(0)
        .setDepth(20);

      this.customizationRows.set(row.category, { swatch, text });
    }

    this.customizationHintText = this.add
      .text(GAME_WIDTH - 14, 114, "Tap number to cycle style", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#ffdca0"
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.interactionPanel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 30, 260, 34, 0x16110f, 0.88)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0xf0c36a, 1)
      .setVisible(false)
      .setDepth(20);

    this.interactionAccent = this.add
      .rectangle(GAME_WIDTH / 2 - 120, GAME_HEIGHT - 30, 6, 22, 0xf0c36a, 1)
      .setScrollFactor(0)
      .setVisible(false)
      .setDepth(20);

    this.interactionText = this.add
      .text(GAME_WIDTH / 2 - 98, GAME_HEIGHT - 39, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#fff3cc"
      })
      .setScrollFactor(0)
      .setVisible(false)
      .setDepth(20);

    this.interactionHint = this.add
      .text(GAME_WIDTH / 2 - 98, GAME_HEIGHT - 23, "Press E to talk", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffdca0"
      })
      .setScrollFactor(0)
      .setVisible(false)
      .setDepth(20);

    this.dialoguePanel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 83, 420, 70, 0x110d0b, 0.94)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0x9ad7ff, 1)
      .setVisible(false)
      .setDepth(21);

    this.dialogueSpeakerText = this.add
      .text(24, GAME_HEIGHT - 112, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#9ad7ff"
      })
      .setScrollFactor(0)
      .setVisible(false)
      .setDepth(21);

    this.dialogueBodyText = this.add
      .text(24, GAME_HEIGHT - 95, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#fff3cc",
        wordWrap: { width: 392 }
      })
      .setScrollFactor(0)
      .setVisible(false)
      .setDepth(21);

    this.dialogueHintText = this.add
      .text(GAME_WIDTH - 24, GAME_HEIGHT - 58, "Press E to continue", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#c5f4b8"
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setVisible(false)
      .setDepth(21);
  }

  private updateNpcAnimations(time: number): void {
    const seconds = time / 1000;

    for (const avatar of this.npcAvatars.values()) {
      const { definition, container, body, head, leftEye, rightEye, accessory, phase } =
        avatar;

      const bobWave = Math.sin(seconds * 2.4 + phase);
      const swayWave = Math.sin(seconds * 1.7 + phase);
      const pulseWave = 0.88 + (Math.sin(seconds * 3.2 + phase) + 1) * 0.06;

      switch (definition.animation) {
        case "bob":
          container.setPosition(definition.x, definition.y + bobWave * 2.2);
          head.setRotation(swayWave * 0.03);
          break;
        case "blink": {
          container.setPosition(definition.x, definition.y + bobWave * 1.3);
          const blinkOn = this.getBlinkState(seconds, phase);
          leftEye.setScale(1, blinkOn ? 1 : 0.15);
          rightEye.setScale(1, blinkOn ? 1 : 0.15);
          head.setRotation(swayWave * 0.02);
          break;
        }
        case "sway":
          container.setPosition(definition.x + swayWave * 2.5, definition.y + bobWave * 1.2);
          body.setRotation(swayWave * 0.03);
          head.setRotation(swayWave * 0.05);
          accessory.setRotation(swayWave * 0.1);
          break;
        case "bounce":
          container.setPosition(definition.x, definition.y + Math.abs(bobWave) * 2.6);
          body.setScale(1, 1 + Math.abs(swayWave) * 0.03);
          accessory.setScale(1 + Math.abs(swayWave) * 0.02);
          break;
        case "pulse":
          container.setPosition(definition.x, definition.y + bobWave * 1.1);
          body.setAlpha(pulseWave);
          head.setAlpha(0.92 + (pulseWave - 0.88) * 0.9);
          accessory.setAlpha(pulseWave);
          avatar.label.setColor(labelColorFromPulse(phase, seconds));
          break;
      }
    }
  }

  private updateNpcInteraction(time: number): void {
    const nearbyNpc = this.findNearbyNpc();
    this.nearbyNpcId = nearbyNpc?.definition.id;

    const dialogueNpc = this.activeDialogueNpcId
      ? this.npcAvatars.get(this.activeDialogueNpcId)
      : undefined;
    const promptTarget = dialogueNpc ?? nearbyNpc;

    if (promptTarget && !dialogueNpc) {
      this.promptPulse = 0.5 + 0.5 * Math.sin(time / 120);
      this.interactionPanel.setVisible(true);
      this.interactionAccent.setVisible(true);
      this.interactionText.setVisible(true);
      this.interactionHint.setVisible(true);
      this.interactionPanel.setAlpha(0.78 + this.promptPulse * 0.22);
      this.interactionPanel.setStrokeStyle(2, promptTarget.definition.accentColor, 1);
      this.interactionAccent.setFillStyle(promptTarget.definition.accentColor, 1);
      this.interactionText.setColor(colorToHex(promptTarget.definition.accentColor));
      this.interactionText.setText(promptTarget.definition.name);
      this.interactionHint.setText("Press E to talk");
    } else {
      this.interactionPanel.setVisible(false);
      this.interactionAccent.setVisible(false);
      this.interactionText.setVisible(false);
      this.interactionHint.setVisible(false);
    }

    if (dialogueNpc) {
      const line = dialogueNpc.definition.dialogue[this.activeDialogueIndex] ?? "";
      this.dialoguePanel.setVisible(true);
      this.dialogueSpeakerText.setVisible(true);
      this.dialogueBodyText.setVisible(true);
      this.dialogueHintText.setVisible(true);
      this.dialoguePanel.setStrokeStyle(2, dialogueNpc.definition.accentColor, 1);
      this.dialogueSpeakerText.setText(`${dialogueNpc.definition.name}`);
      this.dialogueSpeakerText.setColor(colorToHex(dialogueNpc.definition.accentColor));
      this.dialogueBodyText.setText(line);
      this.dialogueHintText.setText(
        `${this.activeDialogueIndex + 1} / ${dialogueNpc.definition.dialogue.length}  Press E to continue`
      );
    } else {
      this.dialoguePanel.setVisible(false);
      this.dialogueSpeakerText.setVisible(false);
      this.dialogueBodyText.setVisible(false);
      this.dialogueHintText.setVisible(false);
    }
  }

  private handleInteractKey(): void {
    const activeNpc = this.activeDialogueNpcId
      ? this.npcAvatars.get(this.activeDialogueNpcId)
      : undefined;

    if (activeNpc) {
      const lastLineIndex = activeNpc.definition.dialogue.length - 1;
      if (this.activeDialogueIndex < lastLineIndex) {
        this.activeDialogueIndex += 1;
      } else {
        this.closeDialogue();
      }
      return;
    }

    if (!this.nearbyNpcId) {
      return;
    }

    this.activeDialogueNpcId = this.nearbyNpcId;
    this.activeDialogueIndex = 0;
  }

  private closeDialogue(): void {
    this.activeDialogueNpcId = undefined;
    this.activeDialogueIndex = 0;
  }

  private handleCustomizationInput(): void {
    for (const category of customizationCategories) {
      if (!Phaser.Input.Keyboard.JustDown(this.customizationKeys[category])) {
        continue;
      }

      this.cycleCustomization(category);
    }
  }

  private cycleCustomization(category: CustomizationCategory): void {
    const options = CUSTOMIZATION_OPTIONS[category];
    const currentId = this.currentCustomization[category];
    const currentIndex = options.findIndex((option) => option.id === currentId);
    const nextOption = options[(currentIndex + 1) % options.length] ?? options[0];

    this.currentCustomization = {
      ...this.currentCustomization,
      [category]: nextOption.id
    };

    applyAvatarCustomization(this.player, this.currentCustomization);
    this.refreshCustomizationUi();
    this.pulseCustomizationPanel();

    if (this.room) {
      this.room.send(PLAYER_CUSTOMIZATION_EVENT, this.currentCustomization);
    }
  }

  private refreshCustomizationUi(): void {
    for (const category of customizationCategories) {
      const row = this.customizationRows.get(category);
      if (!row) {
        continue;
      }

      const selectedId = this.currentCustomization[category];
      const option = CUSTOMIZATION_OPTIONS[category].find((entry) => entry.id === selectedId);
      if (!option) {
        continue;
      }

      row.swatch.setFillStyle(hexColorToNumber(option.color), 1);
      row.text.setText(`${customizationKeyHints[category]} ${customizationLabels[category]}: ${option.label}`);
    }
  }

  private pulseCustomizationPanel(): void {
    this.customizationPanel.setScale(1);
    this.tweens.add({
      targets: [this.customizationPanel, this.player.container],
      scaleX: 1.03,
      scaleY: 1.03,
      yoyo: true,
      duration: 90,
      ease: "Quad.Out"
    });
  }

  private findNearbyNpc(): NpcAvatar | undefined {
    let nearest: NpcAvatar | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const npc of this.npcAvatars.values()) {
      const distance = Phaser.Math.Distance.Between(
        this.player.container.x,
        this.player.container.y,
        npc.definition.x,
        npc.definition.y
      );

      if (distance > NPC_INTERACTION_RADIUS || distance >= nearestDistance) {
        continue;
      }

      nearest = npc;
      nearestDistance = distance;
    }

    return nearest;
  }

  private applySnapshot(snapshot: WorldSnapshot): void {
    const activeSessionIds = new Set(snapshot.players.map((player) => player.sessionId));

    for (const player of snapshot.players) {
      this.upsertPlayer(player);
    }

    for (const sessionId of this.remotePlayers.keys()) {
      if (!activeSessionIds.has(sessionId)) {
        this.removeRemotePlayer(sessionId);
      }
    }
  }

  private upsertPlayer(player: PlayerSnapshot): void {
    if (player.sessionId === this.localSessionId) {
      setAvatarPosition(this.player, player.x, player.y);
      setAvatarName(this.player, player.name);
      applyAvatarCustomization(this.player, player.customization);
      this.currentCustomization = player.customization;
      this.refreshCustomizationUi();
      return;
    }

    const existing = this.remotePlayers.get(player.sessionId);

    if (existing) {
      setAvatarPosition(existing, player.x, player.y);
      setAvatarName(existing, player.name);
      applyAvatarCustomization(existing, player.customization);
      return;
    }

    const avatar = createAvatarVisual(
      this,
      player.x,
      player.y,
      player.customization,
      player.name,
      7
    );

    this.remotePlayers.set(player.sessionId, avatar);
  }

  private removeRemotePlayer(sessionId: string): void {
    const remotePlayer = this.remotePlayers.get(sessionId);
    if (!remotePlayer) {
      return;
    }

    destroyAvatarVisual(remotePlayer);
    this.remotePlayers.delete(sessionId);
  }

  private getBlinkState(seconds: number, phase: number): boolean {
    const blinkCycle = (seconds * 1.6 + phase) % 1;
    return blinkCycle > 0.12;
  }
}

function buildPlayerName(): string {
  return `Player-${Math.floor(100 + Math.random() * 900)}`;
}

const customizationCategories: readonly CustomizationCategory[] = [
  "skinTone",
  "hairStyle",
  "top",
  "bottom"
];

const customizationKeyHints: Record<CustomizationCategory, string> = {
  skinTone: "1",
  hairStyle: "2",
  top: "3",
  bottom: "4"
};

const customizationLabels: Record<CustomizationCategory, string> = {
  skinTone: "Skin",
  hairStyle: "Hair",
  top: "Top",
  bottom: "Bottom"
};

function colorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function hexColorToNumber(color: string): number {
  return Phaser.Display.Color.HexStringToColor(color).color;
}

function labelColorFromPulse(phase: number, seconds: number): string {
  const pulse = 0.78 + (Math.sin(seconds * 3.2 + phase) + 1) * 0.11;
  const red = Math.round(255 * pulse);
  const green = Math.round(245 * pulse);
  const blue = Math.round(220 * pulse);

  return `#${red.toString(16).padStart(2, "0")}${green
    .toString(16)
    .padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}
