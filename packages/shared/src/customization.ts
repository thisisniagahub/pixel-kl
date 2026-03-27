export const CUSTOMIZATION_OPTIONS = {
  skinTone: [
    { id: "porcelain", label: "Porcelain", color: "#f6d9c9" },
    { id: "sand", label: "Sand", color: "#e4b88e" },
    { id: "olive", label: "Olive", color: "#c89263" },
    { id: "bronze", label: "Bronze", color: "#a9653b" },
    { id: "deep", label: "Deep", color: "#6e432c" }
  ],
  hairStyle: [
    { id: "short", label: "Short", color: "#291d1b" },
    { id: "wave", label: "Wave", color: "#3e2a22" },
    { id: "bun", label: "Bun", color: "#5a3b2f" },
    { id: "cap", label: "Cap", color: "#305f88" },
    { id: "braids", label: "Braids", color: "#4d2e20" }
  ],
  top: [
    { id: "tee", label: "Tee", color: "#62b7ff" },
    { id: "hoodie", label: "Hoodie", color: "#5d7cff" },
    { id: "jacket", label: "Jacket", color: "#d86a4d" },
    { id: "batik", label: "Batik", color: "#d9a441" },
    { id: "apron", label: "Apron", color: "#76b86d" }
  ],
  bottom: [
    { id: "jeans", label: "Jeans", color: "#2d4f8c" },
    { id: "shorts", label: "Shorts", color: "#4f6f5d" },
    { id: "skirt", label: "Skirt", color: "#a05a78" },
    { id: "cargo", label: "Cargo", color: "#68614b" },
    { id: "slacks", label: "Slacks", color: "#5a4a4a" }
  ]
} as const;

export type CustomizationCategory = keyof typeof CUSTOMIZATION_OPTIONS;

type OptionIds<T extends readonly { id: string }[]> = T[number]["id"];

export type SkinToneId = OptionIds<typeof CUSTOMIZATION_OPTIONS.skinTone>;
export type HairStyleId = OptionIds<typeof CUSTOMIZATION_OPTIONS.hairStyle>;
export type TopId = OptionIds<typeof CUSTOMIZATION_OPTIONS.top>;
export type BottomId = OptionIds<typeof CUSTOMIZATION_OPTIONS.bottom>;

export type CharacterCustomization = {
  skinTone: SkinToneId;
  hairStyle: HairStyleId;
  top: TopId;
  bottom: BottomId;
};

export const DEFAULT_CHARACTER_CUSTOMIZATION: CharacterCustomization = {
  skinTone: "sand",
  hairStyle: "short",
  top: "tee",
  bottom: "jeans"
};

export function sanitizeCharacterCustomization(
  customization: Partial<CharacterCustomization> | undefined
): CharacterCustomization {
  return {
    skinTone: pickCustomizationId(
      customization?.skinTone,
      CUSTOMIZATION_OPTIONS.skinTone,
      DEFAULT_CHARACTER_CUSTOMIZATION.skinTone
    ),
    hairStyle: pickCustomizationId(
      customization?.hairStyle,
      CUSTOMIZATION_OPTIONS.hairStyle,
      DEFAULT_CHARACTER_CUSTOMIZATION.hairStyle
    ),
    top: pickCustomizationId(
      customization?.top,
      CUSTOMIZATION_OPTIONS.top,
      DEFAULT_CHARACTER_CUSTOMIZATION.top
    ),
    bottom: pickCustomizationId(
      customization?.bottom,
      CUSTOMIZATION_OPTIONS.bottom,
      DEFAULT_CHARACTER_CUSTOMIZATION.bottom
    )
  };
}

function pickCustomizationId<T extends readonly { id: string }[]>(
  candidate: string | undefined,
  options: T,
  fallback: OptionIds<T>
): OptionIds<T> {
  if (!candidate) {
    return fallback;
  }

  return options.some((option) => option.id === candidate) ? candidate : fallback;
}
