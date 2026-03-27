import Phaser from "phaser";

import "./styles.css";
import { GAME_HEIGHT, GAME_WIDTH } from "@pixel/shared";

import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  backgroundColor: "#1f1a17",
  scene: [BootScene, WorldScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);

