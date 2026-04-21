/**
 * Typed mirrors of the color CSS variables declared in
 * `src/styles/tokens.css`. Values are `var(--…)` references — pass
 * them anywhere a color string is expected and theme-switching still
 * works. Concrete hex values live in tokens.css.
 */

export const surfaceTokens = {
  void: "var(--c-void)",
  black: "var(--c-black)",
  page: "var(--c-page)",
  surface00: "var(--c-surface-00)",
  surface01: "var(--c-surface-01)",
  surface02: "var(--c-surface-02)",
  surface03: "var(--c-surface-03)",
} as const;

export const hairlineTokens = {
  hairline: "var(--c-hairline)",
  hairlineStrong: "var(--c-hairline-strong)",
  divider: "var(--c-divider)",
} as const;

export const inkTokens = {
  hi: "var(--c-ink-hi)",
  base: "var(--c-ink)",
  lo: "var(--c-ink-lo)",
  dim: "var(--c-ink-dim)",
  faint: "var(--c-ink-faint)",
  invHi: "var(--c-ink-inv-hi)",
  inv: "var(--c-ink-inv)",
  invLo: "var(--c-ink-inv-lo)",
  invDim: "var(--c-ink-inv-dim)",
} as const;

export const brandTokens = {
  ember: "var(--c-ember)",
  emberDeep: "var(--c-ember-deep)",
  bronze: "var(--c-bronze)",
  gold: "var(--c-gold)",
  goldDeep: "var(--c-gold-deep)",
  sage: "var(--c-sage)",
  sageDeep: "var(--c-sage-deep)",
  bone: "var(--c-bone)",
} as const;

/**
 * Stream / event palette. Each key encodes a *meaning* not a hue:
 * teal = support, amber = commerce, green = billing / ok,
 * orange = ops / alerts, pink = notify, violet = replay / sandbox,
 * red = failure / divergence, white = raw / system.
 */
export const eventTokens = {
  teal: "var(--c-event-teal)",
  amber: "var(--c-event-amber)",
  green: "var(--c-event-green)",
  orange: "var(--c-event-orange)",
  pink: "var(--c-event-pink)",
  violet: "var(--c-event-violet)",
  red: "var(--c-event-red)",
  white: "var(--c-event-white)",
} as const;

export const gradientTokens = {
  lightsource: "var(--grad-lightsource)",
  lightsource90: "var(--grad-lightsource-90)",
  lightsource45: "var(--grad-lightsource-45)",
} as const;

export type SurfaceToken = keyof typeof surfaceTokens;
export type InkToken = keyof typeof inkTokens;
export type BrandToken = keyof typeof brandTokens;
export type EventToken = keyof typeof eventTokens;
export type GradientToken = keyof typeof gradientTokens;
