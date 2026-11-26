export type PresetName = 'default' | 'deep-space' | 'milky-way' | 'constellation';
export interface StarfieldConfig {
  rendering: { maxDpr: number | null };
  accessibility: { respectReducedMotion: boolean };
  stars: { count: number; minRadius: number; maxRadius: number; minSpeed: number; maxSpeed: number; colors: readonly string[] };
  twinkle: { enabled: boolean; strength: number; speed: number };
  parallax: { enabled: boolean; strength: number };
  repulsion: { enabled: boolean; radius: number; strength: number; friction: number };
  shootingStar: { minSpeed: number; maxSpeed: number; lineWidth: number };
  generation: { mode: 'random' | 'galaxy' };
  galaxy: { centerStrength: number; spread: number; flattening: number; rotation: number };
  connections: { enabled: boolean; radius: number; mouseRadius: number; lineOpacity: number; lineWidth: number };
  glow: { enabled: boolean; strength: number };
}
export type StarfieldOptions = {
  [K in keyof StarfieldConfig]?: { [P in keyof StarfieldConfig[K]]?: StarfieldConfig[K][P] | undefined } | undefined;
} & { preset?: PresetName | undefined };
export type ResolvedStarfieldConfig = {
  readonly [K in keyof StarfieldConfig]: Readonly<StarfieldConfig[K]>;
};
/** Mount a canvas with positive, independent CSS dimensions before initialization. */
export class Starfield {
  constructor(target: HTMLCanvasElement | string, options?: StarfieldOptions);
  /** Null after destroy(). The preset selector is not retained. */
  readonly config: ResolvedStarfieldConfig | null;
  start(): this;
  stop(): this;
  destroy(): void;
  updateConfig(patch?: StarfieldOptions): this;
}
