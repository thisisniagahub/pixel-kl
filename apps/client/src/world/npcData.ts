import { TILE_SIZE } from "@pixel/shared";

export type NpcAnimationKind = "bob" | "blink" | "sway" | "bounce" | "pulse";

export type NpcAccessory = "map" | "wok" | "bag" | "lantern" | "radio";

export type NpcDefinition = {
  id: string;
  name: string;
  prompt: string;
  x: number;
  y: number;
  bodyColor: number;
  accentColor: number;
  eyeColor: number;
  animation: NpcAnimationKind;
  accessory: NpcAccessory;
  dialogue: readonly string[];
};

export const NPC_INTERACTION_RADIUS = TILE_SIZE * 2.5;

export const NPC_DEFINITIONS: readonly NpcDefinition[] = [
  {
    id: "city-guide",
    name: "City Guide",
    prompt: "Ask about the district map, landmarks, and shortcuts.",
    x: 216,
    y: 112,
    bodyColor: 0x4b8f72,
    accentColor: 0xf0c36a,
    eyeColor: 0xfff1d2,
    animation: "bob",
    accessory: "map",
    dialogue: [
      "Welcome to the Hero District. The gold block is the easiest place to get your bearings.",
      "If you get lost, follow the lane markers. The district was built to be walked, not rushed.",
      "Ask me again later and I will point you toward the best shortcut."
    ]
  },
  {
    id: "mamak-boss",
    name: "Mamak Boss",
    prompt: "Ask for food, tea, or the best late-night gossip.",
    x: 344,
    y: 104,
    bodyColor: 0x9f6136,
    accentColor: 0xffd18a,
    eyeColor: 0xfff5e3,
    animation: "sway",
    accessory: "wok",
    dialogue: [
      "Roti canai first, story later. That is the rule of a good night stall.",
      "If the table looks full, slide in anyway. There is always room for one more hungry friend.",
      "Fresh tea goes out every few minutes. The city runs on it more than people admit."
    ]
  },
  {
    id: "courier-rider",
    name: "Courier Rider",
    prompt: "Ask about routes, deliveries, and traffic timing.",
    x: 136,
    y: 244,
    bodyColor: 0x3b6dba,
    accentColor: 0x9ad7ff,
    eyeColor: 0xf4fbff,
    animation: "bounce",
    accessory: "bag",
    dialogue: [
      "Package in hand, throttle steady. That is how this city keeps moving.",
      "I know every traffic light on this block, and I still trust the side lane more.",
      "If a route looks too quiet, someone else already found the shortcut."
    ]
  },
  {
    id: "heritage-auntie",
    name: "Heritage Auntie",
    prompt: "Ask about old shop lots and district history.",
    x: 84,
    y: 104,
    bodyColor: 0xa85d78,
    accentColor: 0xffc0d4,
    eyeColor: 0xfff7ef,
    animation: "blink",
    accessory: "lantern",
    dialogue: [
      "These walls remember market songs, monsoon rain, and every shopkeeper who stayed after dark.",
      "Walk slowly near the tiles. They still point to the older streets underneath this one.",
      "The district looks new, but the stories underneath are much older than the paint."
    ]
  },
  {
    id: "night-fixer",
    name: "Night Fixer",
    prompt: "Ask about power lines, neon signs, and small repairs.",
    x: 408,
    y: 80,
    bodyColor: 0x5e5baf,
    accentColor: 0xb8b4ff,
    eyeColor: 0xf6f5ff,
    animation: "pulse",
    accessory: "radio",
    dialogue: [
      "A blinking sign is just a problem asking for a screwdriver.",
      "I keep the district lit when everyone else has already gone home.",
      "If you hear a hum in the wires, call me before it becomes a blackout."
    ]
  }
] as const;
