# Requirements Document

## Introduction

The Hunter Status Window is a pixel-faithful Solo Leveling "STATUS" panel that
replaces the Growth Terminal at the top of the dashboard. It composites a
pre-rendered raster frame asset (`public/assets/status-frame.jpg`) with an
inner content overlay that renders the hunter's level, streak, XP bar, and
six cumulative stats (STR, INT, DIS, SOC, FOC, WIL).

The feature is gated behind a single boolean flag (`HUNTER_STATUS_WINDOW_ENABLED`)
in `App.tsx`. Flipping that flag to `false` instantly restores the legacy
`PlayerStatusCard` (Growth Terminal) with no data migration. The legacy
component is not edited or removed by this feature, and no new npm packages
are introduced.

The window pulls exclusively from `player.stats` (the cumulative `CoreStats`
totals that grow with each completed quest or workout and never reset). It
does not read `dailyStats`, `weeklyStats`, `monthlyStats`, or any other
`PlayerData` field beyond the five it explicitly consumes.

This document captures the visual, data, motion, responsive, robustness,
reversibility, and dependency requirements for the feature, plus an explicit
Non-Goals section listing what the window must not display.

## Glossary

- **Hunter_Status_Window**: The React component at `components/HunterStatusWindow.tsx` that renders the Solo Leveling-style status panel. Its single prop is `{ player: PlayerData }`.
- **Growth_Terminal**: The legacy status component rendered by `components/PlayerStatusCard.tsx`. Used as the fallback rendering when the feature flag is off.
- **App_Shell**: The `App.tsx` module that gates `Hunter_Status_Window` vs `Growth_Terminal` via the `HUNTER_STATUS_WINDOW_ENABLED` boolean constant.
- **Feature_Flag**: The `HUNTER_STATUS_WINDOW_ENABLED` boolean constant in `App.tsx`. When `true`, the dashboard renders `Hunter_Status_Window`. When `false`, the dashboard renders `Growth_Terminal` exactly as it rendered before this feature.
- **Frame_Asset**: The opaque JPEG at `public/assets/status-frame.jpg`, intrinsic dimensions 1024 × 583 px, providing the ornate outer chrome (decorative bands, pillars, corner ornaments, distressed shattered-glass texture).
- **Wrapper**: The outermost positioned `<div>` of `Hunter_Status_Window` whose CSS `aspect-ratio` is locked to `1024 / 583` to match `Frame_Asset`.
- **Safe_Zone**: The absolutely-positioned overlay rectangle inside `Wrapper` whose inset is `top 14% / right 8% / bottom 14% / left 8%` of the wrapper. All readable content is rendered inside this rectangle.
- **Title_Plate**: The small bordered "STATUS" chip, centered horizontally, that vertically straddles the top edge of `Safe_Zone` (overhanging by ~50% of its own height).
- **Divider**: A 1 px hairline cyan rule that spans the inner content area horizontally, with a small rotated-square diamond marker at its midpoint.
- **Row_1**: The first content row inside `Safe_Zone`. Renders the LEVEL number on the left and the STREAK label + count on the right.
- **Row_2**: The second content row inside `Safe_Zone`. Renders a single XP bar with a `current / required` numeric readout.
- **Row_3**: The third content row inside `Safe_Zone`. Renders a 6-stat grid in 2 columns × 3 rows, in the fixed order STR/INT, DIS/SOC, FOC/WIL.
- **CoreStats**: The TypeScript interface `{ strength, intelligence, discipline, social, focus, willpower: number }` defined in `types.ts`.
- **Cumulative_Stats**: The `player.stats` field of `PlayerData`, of type `CoreStats`. Universal, monotonically non-decreasing per quest/workout completion. Distinct from `player.dailyStats`, `player.weeklyStats`, and `player.monthlyStats`.
- **Stat_Icon**: One of six small SVG glyphs rendered to the left of each stat label. Each glyph is a bold filled white shape (`fill: #ffffff`, no stroke) with a soft white drop-shadow halo applied via SVG filter.
- **Glass_Panel**: Any inner content panel inside `Safe_Zone` whose background is a translucent dark fill (`rgba(4, 10, 20, α)`, α ∈ {0.55, 0.92}) combined with `backdrop-filter: blur(2px) saturate(110%)` so the `Frame_Asset` texture shows through subtly.
- **Float_Animation**: The framer-motion animation applied to the motion wrapper around `Frame_Asset` and `Safe_Zone`. Animates a small Y translation and a breathing outer drop-shadow glow over a 6 second `easeInOut` infinite loop.
- **Reduced_Motion**: The user-agent state when `@media (prefers-reduced-motion: reduce)` matches.
- **Fallback_Frame**: The CSS-only frame rendered by `Hunter_Status_Window` when the `<img>` for `Frame_Asset` fires `onError`. A dark vertical gradient with a 1.5 px cyan border and a soft cyan box-shadow glow.

## Requirements

### Requirement 1: Dashboard Integration and Reversibility

**User Story:** As a maintainer, I want a single feature flag in `App.tsx` that swaps between the new Hunter Status Window and the legacy Growth Terminal, so that I can roll back instantly without any data migration.

#### Acceptance Criteria

1. WHILE `Feature_Flag` is `true`, THE App_Shell SHALL render `Hunter_Status_Window` at the top-of-dashboard slot previously occupied by `Growth_Terminal`.
2. WHILE `Feature_Flag` is `false`, THE App_Shell SHALL render `Growth_Terminal` (the legacy `PlayerStatusCard`) at the top-of-dashboard slot, with the same props, wrapping `<Suspense>` / `<ErrorBoundary>`, and surrounding markup it had before this feature was introduced.
3. WHEN `Feature_Flag` is toggled from `true` to `false` between two consecutive renders of App_Shell, THE App_Shell SHALL unmount `Hunter_Status_Window` and mount `Growth_Terminal` on the very next render with no intervening data migration step and no persisted state change.
4. THE App_Shell SHALL gate the choice between `Hunter_Status_Window` and `Growth_Terminal` using exactly one boolean constant named `HUNTER_STATUS_WINDOW_ENABLED` declared in `App.tsx`.
5. THE feature SHALL NOT edit, move, rename, or delete `components/PlayerStatusCard.tsx`.
6. THE Hunter_Status_Window SHALL be implemented as a single rewritten file at `components/HunterStatusWindow.tsx`.

### Requirement 2: Frame Asset and Visual Fidelity

**User Story:** As a user, I want the status window to look like the Solo Leveling anime "STATUS" still, so that the dashboard delivers the intended hunter-screen aesthetic.

#### Acceptance Criteria

1. WHEN `Hunter_Status_Window` mounts, THE Hunter_Status_Window SHALL render `Frame_Asset` as an `<img>` element with `src="/assets/status-frame.jpg"` covering the full area of `Wrapper`.
2. THE Wrapper SHALL apply the CSS rule `aspect-ratio: 1024 / 583` so its rendered aspect ratio matches the intrinsic dimensions of `Frame_Asset` (1024 × 583 px).
3. THE Hunter_Status_Window SHALL composite `Title_Plate`, `Row_1`, `Row_2`, `Row_3`, and the two `Divider` instances on top of `Frame_Asset` inside `Safe_Zone`.
4. WHEN rendering `Title_Plate`, THE Hunter_Status_Window SHALL position it centered horizontally and vertically straddling the top edge of `Safe_Zone` such that approximately 50% of its height overhangs above the safe zone, matching the overlapping chip in the Solo Leveling reference still.
5. THE Title_Plate SHALL render the literal text `"STATUS"` inside a bordered chip with a translucent dark fill (`rgba(4, 10, 20, 0.92)`), a 1.5 px cyan (`#00d4ff`) border, and a cyan glow box-shadow.
6. THE Hunter_Status_Window SHALL render exactly two `Divider` instances between the three content rows: one between `Row_1` and `Row_2`, and one between `Row_2` and `Row_3`.
7. THE Divider SHALL render a 1 px hairline horizontal rule whose color stops fade from transparent at the edges to cyan (`rgba(0, 212, 255, 0.55)`) at the midpoint, with a small (~6 px) rotated-square cyan diamond marker centered at the rule's horizontal midpoint.

### Requirement 3: Row 1 — LEVEL and STREAK Layout

**User Story:** As a user, I want a big level number on the left and a streak readout on the right, so that I can read my current rank at a glance.

#### Acceptance Criteria

1. THE Row_1 SHALL display the rendered value of `player.level` as a large bold numeric on the left side of the row.
2. THE Row_1 SHALL display a `STREAK` text label and the rendered value of `player.streak` on the right side of the row.
3. THE Row_1 SHALL NOT render any emoji character anywhere in its DOM subtree.
4. THE Row_1 SHALL NOT render any fire icon, fire glyph, or fire SVG anywhere in its DOM subtree.

### Requirement 4: Row 2 — XP Bar Layout

**User Story:** As a user, I want a single XP bar with a current/required readout, so that I can see exactly how close I am to leveling up.

#### Acceptance Criteria

1. THE Row_2 SHALL render exactly one progress bar.
2. THE Row_2 SHALL display the rendered values of `player.currentXp` and `player.requiredXp` in the format `currentXp / requiredXp`.
3. THE Row_2 SHALL NOT render an HP bar, an HP label, or any health-related readout.
4. THE Row_2 SHALL NOT render an MP bar, an MP label, or any mana-related readout.
5. THE Row_2 SHALL NOT render a fatigue counter, a fatigue label, or any fatigue-related readout.
6. THE Row_2 SHALL render the XP bar fill width as a percentage equal to `min(100, round((currentXp / requiredXp) * 100))`, where `requiredXp` is clamped to a minimum of 1 to prevent division by zero.

### Requirement 5: Row 3 — Six-Stat Grid

**User Story:** As a user, I want my six stats laid out in a 2×3 grid with the canonical Solo Leveling pairing, so that I can scan them quickly.

#### Acceptance Criteria

1. THE Row_3 SHALL render a CSS grid with exactly 2 columns and exactly 3 rows.
2. THE Row_3 SHALL render exactly six stat entries, one per CoreStats field: `strength`, `intelligence`, `discipline`, `social`, `focus`, `willpower`.
3. THE Row_3 SHALL place the stat entries in the fixed order, reading row-major left-to-right top-to-bottom: row 1 = `[STR, INT]`, row 2 = `[DIS, SOC]`, row 3 = `[FOC, WIL]`.
4. THE Row_3 SHALL display each stat as `[Stat_Icon] [LABEL] : [value]`, where LABEL is one of `STR`, `INT`, `DIS`, `SOC`, `FOC`, `WIL`.
5. THE Row_3 SHALL NOT render any seventh stat or any additional row.

### Requirement 6: Stats Data Source — Cumulative Only

**User Story:** As a user, I want my stats to reflect everything I have ever earned, not what I happened to do today, so that the status window reads as my universal hunter sheet.

#### Acceptance Criteria

1. WHEN rendering each of the six stat values in `Row_3`, THE Hunter_Status_Window SHALL read the value from `player.stats[k]` where `k` is the corresponding CoreStats key.
2. THE Hunter_Status_Window SHALL NOT read `player.dailyStats`, `player.yesterdayStats`, `player.weeklyStats`, or `player.monthlyStats` for any rendered stat value.
3. THE Hunter_Status_Window SHALL NOT substitute any non-`player.stats` source for any of the six rendered stat values under any condition, including missing data, daily reset boundaries, or week/month rollovers.
4. WHERE a CoreStats field on `player.stats` is `undefined`, `null`, `NaN`, or `Infinity`, THE Hunter_Status_Window SHALL render that stat as `0` (zero) without falling back to any daily, weekly, or monthly source.
5. FOR ALL valid `PlayerData` inputs, the rendered stat value at grid position `(row, col)` SHALL be a pure function of `player.stats[k(row, col)]` only, where `k` is the fixed mapping defined in Requirement 5.3, such that mutating any other field of `PlayerData` does not change any rendered stat value.

### Requirement 7: PlayerData Field Access Scope

**User Story:** As a maintainer, I want the status window to consume a minimal slice of `PlayerData`, so that future changes to unrelated fields cannot break it.

#### Acceptance Criteria

1. THE Hunter_Status_Window SHALL read exactly the following five fields of its `player` prop: `player.level`, `player.currentXp`, `player.requiredXp`, `player.streak`, `player.stats`.
2. THE Hunter_Status_Window SHALL NOT read any other field of `PlayerData`, including but not limited to `totalXp`, `dailyXp`, `rank`, `trustScore`, `gold`, `keys`, `cheatStrikes`, `allianceId`, `dailyStats`, `yesterdayStats`, `weeklyStats`, `monthlyStats`, `lastStatUpdate`, `lastDailyReset`, `lastWeeklyReset`, `lastMonthlyReset`, `avatarUrl`, `originalSelfieUrl`, `country`, `timezone`, `identity`, `pin`, `startDate`, `isBanned`, `totalStrikesEver`, `duskUnreadCount`.
3. FOR ALL valid `PlayerData` inputs, replacing every field of `PlayerData` other than the five listed in Requirement 7.1 with arbitrary values SHALL produce an identical rendered output.

### Requirement 8: Typography — Bright White with Cyan Glow

**User Story:** As a user, I want every readable number to glow cyan over bright white text, so that the panel reads like the Solo Leveling status sheet.

#### Acceptance Criteria

1. THE Hunter_Status_Window SHALL render the level numeric, the streak numeric, the XP current numeric, the XP required numeric, and every stat numeric in `Row_3` with `color: #ffffff` (bright white).
2. THE Hunter_Status_Window SHALL apply a cyan-tinted `text-shadow` to the level numeric, the streak numeric, the XP current numeric, the XP required numeric, and every stat numeric in `Row_3`, where the shadow's RGB color is `rgb(0, 212, 255)` (cyan) at non-zero opacity.
3. THE Hunter_Status_Window SHALL render every numeric listed in Requirement 8.1 with `font-weight` ≥ 700 (bold).
4. THE Hunter_Status_Window SHALL render every numeric and every text label using the `Rajdhani` font family with `Bai Jamjuree` and a generic monospace/sans-serif as fallbacks.

### Requirement 9: Iconography — Bold Filled White SVG Glyphs

**User Story:** As a user, I want the stat icons to be bold filled white shapes with a glow, not thin outlines, so that they match the Solo Leveling anime reference.

#### Acceptance Criteria

1. THE Hunter_Status_Window SHALL render exactly six `Stat_Icon` SVG elements in `Row_3`, one per stat entry, in the order STR, INT, DIS, SOC, FOC, WIL.
2. THE Stat_Icon SHALL render its glyph with `fill: #ffffff`.
3. THE Stat_Icon SHALL render its glyph with `stroke: none` (no outline-style stroke).
4. THE Stat_Icon SHALL apply an SVG filter that produces a soft white drop-shadow glow halo around the glyph.
5. THE Stat_Icon SHALL set `aria-hidden="true"` on its `<svg>` root element.
6. THE Hunter_Status_Window SHALL NOT render any of the six Stat_Icon glyphs in an outline-only style (i.e., none of them shall use `fill: none` with a visible `stroke`).

### Requirement 10: Glass Panels and Translucent Inner Content

**User Story:** As a user, I want the inner content panels to be slightly transparent so the frame's distressed shattered-glass texture bleeds through behind the values.

#### Acceptance Criteria

1. THE Safe_Zone overlay SHALL apply a translucent dark fill of `rgba(4, 10, 20, 0.55)`.
2. THE Safe_Zone overlay SHALL apply `backdrop-filter: blur(2px) saturate(110%)` (with the `-webkit-backdrop-filter` equivalent for Safari).
3. THE Title_Plate SHALL apply a translucent dark fill of `rgba(4, 10, 20, 0.92)`.
4. THE Hunter_Status_Window SHALL NOT paint any fully opaque inner content panel that covers more than 95% of the Safe_Zone area, such that the underlying Frame_Asset texture remains visible behind the values.

### Requirement 11: Floating Animation and Reduced-Motion Honor

**User Story:** As a user, I want the status window to gently float and breathe, but I want that motion suppressed if I have reduced-motion enabled.

#### Acceptance Criteria

1. WHILE `Reduced_Motion` is not active, THE Hunter_Status_Window SHALL drive `Float_Animation` as a `framer-motion` keyframe animation with `duration: 6` seconds, `ease: 'easeInOut'`, `repeat: Infinity`.
2. THE Float_Animation SHALL animate the wrapped element's `y` (CSS `transform: translateY`) through the keyframe sequence `[0, -3, 0, +3, 0]` pixels.
3. THE Float_Animation SHALL animate the wrapped element's outer `filter: drop-shadow(...)` cyan halo radius/opacity through a breathing keyframe sequence whose minimum is `drop-shadow(0 0 18px rgba(0, 212, 255, 0.22))` and whose maximum is `drop-shadow(0 0 26px rgba(0, 212, 255, 0.55))`.
4. WHILE `Reduced_Motion` is active, THE Hunter_Status_Window SHALL suppress `Float_Animation` such that the wrapped element's `transform` and `filter` do not change over time.
5. WHILE `Reduced_Motion` is active, THE Hunter_Status_Window SHALL also disable the XP bar fill `width` transition such that XP changes apply instantly without a 600 ms ease.

### Requirement 12: Responsive Behavior — Mobile-First

**User Story:** As a user on a phone, I want the status window to look correct on phone widths first and then scale up cleanly to tablet and desktop, so that the window is usable on every device the dashboard targets.

#### Acceptance Criteria

1. THE Hunter_Status_Window SHALL render correctly (no clipped content, no overlapping rows, no overflow outside `Wrapper`) at every viewport width in the inclusive range 360 px to 414 px.
2. WHEN the viewport width is in the inclusive range 360 px to 479 px, THE Hunter_Status_Window SHALL apply the small-phone type scale, including `level-num` font-size 36 px, `streak-num` font-size 18 px, `stat-value` font-size 14 px, `title-plate` font-size 10 px, and `stat-icon` size 12 × 12 px.
3. WHEN the viewport width is in the inclusive range 480 px to 767 px, THE Hunter_Status_Window SHALL apply the large-phone type scale, including `level-num` font-size 42 px, `streak-num` font-size 22 px, `stat-value` font-size 16 px, `title-plate` font-size 11 px, and `stat-icon` size 14 × 14 px.
4. WHEN the viewport width is in the inclusive range 768 px to 1023 px, THE Hunter_Status_Window SHALL apply the tablet type scale, including `level-num` font-size 56 px, `streak-num` font-size 26 px, `stat-value` font-size 18 px, `title-plate` font-size 12 px, and `stat-icon` size 16 × 16 px.
5. WHEN the viewport width is greater than or equal to 1024 px, THE Hunter_Status_Window SHALL apply the desktop type scale, including `level-num` font-size 64 px and stats grid column-gap 40 px.
6. THE Hunter_Status_Window SHALL preserve the `Wrapper` aspect ratio of `1024 / 583` at every viewport width.

### Requirement 13: Robustness — Frame Asset Failure Fallback

**User Story:** As a user, I want all the data in the status window to remain readable even if the frame image fails to load, so that a missing asset never hides my level, streak, XP, or stats.

#### Acceptance Criteria

1. WHEN the `<img>` element for `Frame_Asset` fires its `onError` event, THE Hunter_Status_Window SHALL set internal state `frameLoaded = false` and re-render with `Fallback_Frame` in place of the `<img>` element.
2. THE Fallback_Frame SHALL render a vertical CSS gradient background, a 1.5 px cyan (`#00d4ff`) border, and a soft cyan box-shadow glow.
3. WHILE `frameLoaded = false`, THE Hunter_Status_Window SHALL continue to render `Title_Plate`, `Row_1`, `Row_2`, `Row_3`, and both `Divider` instances inside `Safe_Zone` with all their data and styling unchanged.
4. FOR ALL valid `PlayerData` inputs, the rendered text content of the level numeric, the streak numeric, the XP readout, and every stat numeric SHALL be identical between the `frameLoaded = true` state and the `frameLoaded = false` state.

### Requirement 14: Dependencies — No New Packages

**User Story:** As a maintainer, I want this feature to ship without any new npm dependencies, so that the install footprint and audit surface stay flat.

#### Acceptance Criteria

1. THE Hunter_Status_Window SHALL be implemented using only React 18, `framer-motion`, Tailwind CSS, inline `style` objects, and the `Rajdhani` and `Bai Jamjuree` fonts that are already declared in this repository before this feature is implemented.
2. THE feature SHALL NOT add, remove, or upgrade any entry in `package.json` `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`.
3. THE Hunter_Status_Window SHALL NOT import any module that is not already declared as a dependency of the repository before this feature is implemented.

### Requirement 15: Asset Path and File Layout

**User Story:** As a maintainer, I want the asset and component paths to be fixed and known, so that build, deploy, and rollback are deterministic.

#### Acceptance Criteria

1. THE Frame_Asset SHALL be located at the repository path `public/assets/status-frame.jpg`.
2. THE Hunter_Status_Window SHALL reference the Frame_Asset using the URL path `/assets/status-frame.jpg` (relative to the public root).
3. THE Hunter_Status_Window component file SHALL be located at the repository path `components/HunterStatusWindow.tsx` and SHALL be implemented as a single file (no companion `.css`, `.module.css`, or sibling implementation files introduced by this feature).
4. THE feature SHALL NOT modify `components/PlayerStatusCard.tsx` in any way.

## Non-Goals

The following items are explicitly out of scope for the Hunter Status Window
and SHALL NOT be rendered, persisted, or otherwise introduced by this feature.
Each item below is an explicit acceptance criterion: the rendered DOM of
`Hunter_Status_Window` MUST contain none of these elements for any valid
`PlayerData` input.

1. **No HP bar.** The Hunter_Status_Window SHALL NOT render an HP bar, an HP track, an HP fill, an HP label, or any health-related numeric readout.
2. **No MP bar.** The Hunter_Status_Window SHALL NOT render an MP bar, an MP track, an MP fill, an MP label, or any mana-related numeric readout.
3. **No fatigue counter.** The Hunter_Status_Window SHALL NOT render a fatigue counter, a fatigue label, a fatigue bar, or any fatigue-related numeric readout.
4. **No Job row.** The Hunter_Status_Window SHALL NOT render a "Job" label or any job/class textual readout.
5. **No Title row.** The Hunter_Status_Window SHALL NOT render a "Title" label or any title-related textual readout.
6. **No daily / weekly / monthly stat substitution.** The Hunter_Status_Window SHALL NOT read or display values from `player.dailyStats`, `player.yesterdayStats`, `player.weeklyStats`, or `player.monthlyStats`. Stats render exclusively from `player.stats`.
7. **No streak emoji.** The Hunter_Status_Window SHALL NOT render any emoji character (including but not limited to 🔥, 🌶, ⚡, ✨) adjacent to or as part of the streak label or streak numeric.
8. **No fire icon.** The Hunter_Status_Window SHALL NOT render any fire-themed icon, glyph, or SVG (whether emoji, font icon, inline SVG, or raster image) adjacent to or as part of the streak readout.
9. **No outline-style icons.** The Hunter_Status_Window SHALL NOT render any of the six `Stat_Icon` glyphs in an outline-only style. Each glyph is a bold filled white shape per Requirement 9.
10. **No additional npm packages.** The feature SHALL NOT add any new entry to `package.json` `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`. Implementation reuses React 18, framer-motion, Tailwind, inline styles, and the Rajdhani / Bai Jamjuree fonts already present in the repository.
