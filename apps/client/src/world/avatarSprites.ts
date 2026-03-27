import Phaser from "phaser";

import {
  CUSTOMIZATION_OPTIONS,
  DEFAULT_CHARACTER_CUSTOMIZATION,
  type CharacterCustomization
} from "@pixel/shared";

type AvatarShape =
  | Phaser.GameObjects.Rectangle
  | Phaser.GameObjects.Ellipse
  | Phaser.GameObjects.Arc;

export type AvatarVisual = {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  torso: Phaser.GameObjects.Rectangle;
  leftLeg: Phaser.GameObjects.Rectangle;
  rightLeg: Phaser.GameObjects.Rectangle;
  head: Phaser.GameObjects.Ellipse;
  hairTop: Phaser.GameObjects.Rectangle;
  hairWave: Phaser.GameObjects.Arc;
  bun: Phaser.GameObjects.Ellipse;
  capTop: Phaser.GameObjects.Rectangle;
  capBrim: Phaser.GameObjects.Rectangle;
  braidLeft: Phaser.GameObjects.Rectangle;
  braidRight: Phaser.GameObjects.Rectangle;
  customization: CharacterCustomization;
};

const LABEL_COLOR = "#fff3cc";

export function createAvatarVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  customization: CharacterCustomization = DEFAULT_CHARACTER_CUSTOMIZATION,
  labelText = "Player",
  depth = 7
): AvatarVisual {
  const container = scene.add.container(x, y).setDepth(depth);

  const shadow = scene.add.ellipse(0, 9, 16, 6, 0x000000, 0.25);
  const leftLeg = scene.add.rectangle(-3, 7, 4, 9, 0x2d4f8c);
  const rightLeg = scene.add.rectangle(3, 7, 4, 9, 0x2d4f8c);
  const torso = scene.add.rectangle(0, 1, 13, 12, 0x62b7ff);
  const head = scene.add.ellipse(0, -9, 13, 12, 0xe4b88e);

  const hairTop = scene.add.rectangle(0, -13, 12, 5, 0x291d1b);
  const hairWave = scene.add.arc(0, -10, 7, 205, 335, false, 0x291d1b);
  const bun = scene.add.ellipse(0, -17, 5, 5, 0x5a3b2f);
  const capTop = scene.add.rectangle(0, -13, 13, 5, 0x305f88);
  const capBrim = scene.add.rectangle(0, -10, 11, 2, 0x213f5b);
  const braidLeft = scene.add.rectangle(-6, -7, 2, 7, 0x4d2e20);
  const braidRight = scene.add.rectangle(6, -7, 2, 7, 0x4d2e20);

  for (const shape of [
    shadow,
    leftLeg,
    rightLeg,
    torso,
    head,
    hairTop,
    hairWave,
    bun,
    capTop,
    capBrim,
    braidLeft,
    braidRight
  ]) {
    setAvatarShapeStroke(shape);
  }

  container.add([
    shadow,
    leftLeg,
    rightLeg,
    torso,
    head,
    hairTop,
    hairWave,
    bun,
    capTop,
    capBrim,
    braidLeft,
    braidRight
  ]);

  const label = scene.add
    .text(x, y - 18, labelText, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: LABEL_COLOR
    })
    .setOrigin(0.5)
    .setDepth(depth);

  const avatar: AvatarVisual = {
    container,
    label,
    shadow,
    torso,
    leftLeg,
    rightLeg,
    head,
    hairTop,
    hairWave,
    bun,
    capTop,
    capBrim,
    braidLeft,
    braidRight,
    customization: DEFAULT_CHARACTER_CUSTOMIZATION
  };

  applyAvatarCustomization(avatar, customization);
  setAvatarPosition(avatar, x, y);

  return avatar;
}

export function setAvatarPosition(avatar: AvatarVisual, x: number, y: number): void {
  avatar.container.setPosition(x, y);
  avatar.label.setPosition(x, y - 18);
}

export function setAvatarName(avatar: AvatarVisual, name: string): void {
  avatar.label.setText(name);
}

export function applyAvatarCustomization(
  avatar: AvatarVisual,
  customization: CharacterCustomization
): void {
  avatar.customization = customization;

  const skinColor = getOptionColor("skinTone", customization.skinTone);
  const hairColor = getOptionColor("hairStyle", customization.hairStyle);
  const topColor = getOptionColor("top", customization.top);
  const bottomColor = getOptionColor("bottom", customization.bottom);

  avatar.head.setFillStyle(skinColor, 1);
  avatar.torso.setFillStyle(topColor, 1);
  avatar.leftLeg.setFillStyle(bottomColor, 1);
  avatar.rightLeg.setFillStyle(bottomColor, 1);
  avatar.shadow.setAlpha(customization.bottom === "skirt" ? 0.18 : 0.25);

  avatar.hairTop.setFillStyle(hairColor, 1);
  avatar.hairWave.setFillStyle(hairColor, 1);
  avatar.bun.setFillStyle(hairColor, 1);
  avatar.braidLeft.setFillStyle(hairColor, 1);
  avatar.braidRight.setFillStyle(hairColor, 1);
  avatar.capTop.setFillStyle(hairColor, 1);
  avatar.capBrim.setFillStyle(darkenColor(hairColor, 0.72), 1);

  avatar.hairTop.setVisible(false);
  avatar.hairWave.setVisible(false);
  avatar.bun.setVisible(false);
  avatar.capTop.setVisible(false);
  avatar.capBrim.setVisible(false);
  avatar.braidLeft.setVisible(false);
  avatar.braidRight.setVisible(false);

  switch (customization.hairStyle) {
    case "short":
      avatar.hairTop.setVisible(true);
      break;
    case "wave":
      avatar.hairTop.setVisible(true);
      avatar.hairWave.setVisible(true);
      break;
    case "bun":
      avatar.hairTop.setVisible(true);
      avatar.bun.setVisible(true);
      break;
    case "cap":
      avatar.capTop.setVisible(true);
      avatar.capBrim.setVisible(true);
      break;
    case "braids":
      avatar.hairTop.setVisible(true);
      avatar.braidLeft.setVisible(true);
      avatar.braidRight.setVisible(true);
      break;
  }
}

export function destroyAvatarVisual(avatar: AvatarVisual): void {
  avatar.container.destroy(true);
  avatar.label.destroy();
}

function getOptionColor(
  category: keyof typeof CUSTOMIZATION_OPTIONS,
  optionId: string
): number {
  const option =
    CUSTOMIZATION_OPTIONS[category].find((entry) => entry.id === optionId) ??
    CUSTOMIZATION_OPTIONS[category][0];

  return Phaser.Display.Color.HexStringToColor(option.color).color;
}

function darkenColor(color: number, multiplier: number): number {
  const base = Phaser.Display.Color.IntegerToColor(color);

  return Phaser.Display.Color.GetColor(
    Math.round(base.red * multiplier),
    Math.round(base.green * multiplier),
    Math.round(base.blue * multiplier)
  );
}

function setAvatarShapeStroke(shape: AvatarShape): void {
  shape.setStrokeStyle(1, 0x201716, 0.95);
}
