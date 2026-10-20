---
name: Warm Editorial Notebook
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1e'
  surface-container: '#1f1f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e4e1e6'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e4e1e6'
  inverse-on-surface: '#303033'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#c6c6cf'
  on-tertiary: '#2f3037'
  tertiary-container: '#909099'
  on-tertiary-container: '#282930'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#e2e1eb'
  tertiary-fixed-dim: '#c6c6cf'
  on-tertiary-fixed: '#1a1b22'
  on-tertiary-fixed-variant: '#45464e'
  background: '#131316'
  on-background: '#e4e1e6'
  surface-variant: '#353438'
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 2.5rem
    fontWeight: '400'
    lineHeight: 3rem
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Newsreader
    fontSize: 1.875rem
    fontWeight: '400'
    lineHeight: 2.25rem
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 2rem
    fontWeight: '400'
    lineHeight: 2.5rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 1.5rem
    fontWeight: '400'
    lineHeight: 2rem
  headline-md:
    fontFamily: Newsreader
    fontSize: 1.375rem
    fontWeight: '500'
    lineHeight: 1.875rem
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.8rem
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.65rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.45rem
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  timestamp:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-tablet: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3.5rem
---

## Brand & Style

This design system channels the quiet, thoughtful tactility of a premium archival notebook paired with modern audio transcription utility. The emotional tone is meditative, disciplined, and distraction-free: eliminating neon glitz, cyberpunk signifiers, and cluttered technical dashboards in favor of spacious editorial clarity, literary pacing, and grounded restraint.

### Aesthetic Principles
- **Editorial Subtraction:** Surfaces exist only to support content. We strip decorative glows, scanlines, and dense matrix grids.
- **Warm Tactile Understatement:** Deep stone charcoal foundations meet soft paper whites and muted graphite rules.
- **Calm Utility:** Audio controls, waveforms, and privacy indicators operate with gentle precision rather than high-alert urgency.
- **Literary Cadence:** Typography prioritizes long-form reading, natural scanning, and comfortable visual hierarchy.

## Colors

The palette establishes an intimate, low-fatigue workspace optimized for deep listening and reading.

### Palette Architecture
- **Base Canvas (`#18181b`):** Deep zinc charcoal providing an immersive, low-glare backdrop.
- **Elevated Surfaces:** `#202024` for cards and panels; `#27272a` for active layers and interactive elements.
- **Text & Reading Surfaces:**
  - Ink Primary: `#f4f4f5` (warm paper white) for optimal editorial legibility.
  - Ink Secondary: `#a1a1aa` (muted zinc) for secondary notes and metadata.
  - Ink Muted: `#71717a` for timestamps and structural hints.
- **Accent Indigo (`#6366f1`):** A single tasteful, muted iris indigo used strictly for high-signal moments—active playback states, current timestamps, and primary actions.
- **Borders & Dividers:** `#2e2e33` to `#3f3f46`—subtle, whisper-thin hairlines resembling fine bookbinding rules.
- **Privacy & Safety Badges:** Understated slate tones (`#27272a` ground with `#94a3b8` text) without luminous warning greens or neon locks.

## Typography

The type system blends classic book-page authority with functional sans-serif precision.

- **Headlines (Newsreader):** Brings warmth, literary rhythm, and thoughtful pauses to entry titles, audio session headers, and major sections.
- **Transcript Body & UI (Inter):** Clean, neutral, and meticulously legible. Rendered with generous line heights (`1.65rem` to `1.8rem`) to mimic well-set book pages rather than code terminals.
- **Timestamp & Metadata:** Uses clean tabular figures via standard Inter weights, avoiding overly technical, harsh monospaced fonts to keep the reading experience fluid and human.

## Layout & Spacing

Layouts favor an open editorial structure centered around a comfortable reading measure (max 680px for single-column transcripts, 960px for combined audio-and-text panels).

### Grid & Composition
- **Desktop (1024px+):** Fluid asymmetric grid anchored by a central notebook spine. Side panels for audio waveform navigation and metadata sit unobtrusively in quiet secondary margins. Outer margins remain generous at `3rem`.
- **Tablet (768px – 1023px):** Collapses auxiliary toolbars into a slim top header; transcripts maintain a comfortable margin of `2rem`.
- **Mobile (<768px):** Single-column canvas with `1.25rem` outer margins. Audio scrubbers anchor to the base with tactile thumb zones.
- **Vertical Rhythm:** Paragraphs and speaker switches rely on open `space-md` separation, preventing transcription output from feeling dense or unapproachable.

## Elevation & Depth

Depth is achieved through quiet tonal shifts and subtle hairline borders, entirely eschewing high-contrast drop shadows or translucent neon blurs.

### Tonal Stratification
- **Canvas Base:** `#18181b` sits at the deepest level.
- **Editorial Containers:** Settle at `#202024`, separated from the canvas via a single 1px hairline border of `#2e2e33`.
- **Floating Controls (Player Bar / Popovers):** Rise to `#27272a` with an ultra-diffused, soft ambient drop: `0 8px 30px rgba(0, 0, 0, 0.45)`. No outer glows or colored halos.
- **Dividers & Ruled Lines:** Mimic thread-sewn bindings or soft pencil guidelines using 1px `#27272a` rules.

## Shapes

Shapes communicate refined stationery. We use soft, deliberate rounding (`0.25rem` base, `0.5rem` for cards and input fields) that balances modern software ergonomics with the crisp edges of fine cut paper.

Pill shapes are reserved strictly for small interaction targets like the audio playhead scrub handle and audio playback controls. Containers, transcript blocks, and cards retain disciplined rectangular silhouettes with soft micro-radii.

## Components

### Buttons
- **Primary:** Dark indigo fill (`#6366f1`) with crisp paper white text (`#f4f4f5`). Soft 4px radius (`rounded`). Hover transitions gently to `#4f46e5` without heavy glow effects.
- **Secondary / Ghost:** Transparent background with subtle border (`1px solid #3f3f46`), text in `#e4e4e7`. Hover shifts background to `#27272a`.
- **Audio Control Triggers:** Circular button with a restrained surface `#27272a` and minimal slate iconography.

### Cards & Transcript Panels
- Single continuous surface (`#202024`) with an ultra-fine border (`#2e2e33`).
- Padding is generous (`space-md` to `space-lg`), giving long-form audio transcripts room to breathe.
- Active speaker segments are indicated by a quiet left vertical border highlight in muted indigo (`#6366f1`), not full-surface neon color flooding.

### Privacy & Status Badges
- Replaces glowing neon dots with calm, archival micro-tags.
- Background in quiet charcoal (`#27272a`), border in `#3f3f46`, and text in `#94a3b8`.
- Icons (e.g., local storage, encryption) render in monochrome `#71717a` for discreet reassurance.

### Audio Scrubbers & Waveforms
- Inactive waveform bars render in low-contrast slate `#3f3f46`.
- Played progress fills with solid `#6366f1` or soft `#e4e4e7`.
- No luminous soundwave flares or oscilloscope skeuomorphism; bars use clean uniform vertical strokes with a 1px gap.

### Input Fields & Search
- Grounded in `#18181b` surrounded by a `#2e2e33` border. Focus transitions cleanly to a crisp, non-glowing `#6366f1` 1px outline.
- Placeholder text uses subdued `#71717a`.

### Checkboxes & Segmented Toggles
- Square forms with subtle 2px rounding.
- Checked state uses muted slate-indigo fill (`#6366f1`) with clean white checkmarks. Inactive states rest on `#27272a` surfaces.