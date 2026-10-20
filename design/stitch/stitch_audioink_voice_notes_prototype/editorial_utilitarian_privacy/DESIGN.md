---
name: Editorial & Utilitarian Privacy
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393c'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 17px
    letterSpacing: 0.01em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 15px
    letterSpacing: -0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-technical:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system is constructed for an offline-first, local-intelligence mobile utility. The core emotional signature is absolute confidentiality, cryptographic clarity, and editorial rigor. It rejects decorative consumer-grade playfulness in favor of a silent, precision instrument feel reminiscent of high-end hardware interfaces and Swiss document design.

Key characteristics:
- **Tone:** Uncompromising, sovereign, discreet, analytical, and authoritative.
- **Design Philosophy:** Utilitarian Brutalism tempered by Editorial Precision. Information density is prioritized over decorative whitespace; surfaces are matte and opaque to reinforce local data containment (no translucent leakages or cloud metaphors).
- **Target Experience:** High-assurance recording and structured note generation where cryptographic verification, latency metrics, and local transcription run transparently in front of the user.

## Colors

The system uses an austere dark-mode-first architecture calibrated for OLED mobile panels and high-contrast night/field usage.

### Role Tokens & Color Architecture
- **Canvas Base (`#121316`):** The absolute grounding canvas. Represents cold storage and private local state.
- **Surface Level 1 (`#1A1B1F`):** Standard container background for list items, collapsed modules, and input trays.
- **Surface Level 2 / Elevated (`#23252B`):** Interactive cards, expanded transcription blocks, and sheets.
- **Structural Borders (`#2D3038`):** Razor-thin frame borders delivering structural definition without bright delineations.
- **Paper White Text (`#F4F4F0`):** Natural unbleached editorial tone, reducing eye strain across prolonged reading intervals.
- **Muted Ash (`#9CA3AF`) & Ghost Ash (`#6B7280`):** Metadata, structural labels, and disabled indicators.
- **Electric Indigo (`#4F46E5`, hover/active `#4338CA`, bright `#818CF8`):** Focal action triggers, synthesis runs, and core interactions.
- **Spectral Cyan (`#06B6D4`):** Real-time acoustic capture, active haptic waveforms, and live stream processing.
- **Shield Emerald (`#10B981`, surface `#064E3B`):** Cryptographic verification badges, airgap confirmation, zero-leak indicators, and verified ground-truth citations.

## Typography

Typography establishes an analytical dialogue between editorial legibility and technical telemetry.

- **Primary Matrix (Inter):** Handles primary prose, transcription output, structured summarization, and human-facing UI controls. Inter provides neutral clarity at small scales without decorative distractions.
- **Telemetry & Metadata Matrix (JetBrains Mono):** Injected directly into the reading flow for raw operational data. Used strictly for audio timeline markers (`02:14.08`), paused silence durations (`[pause 1.8s]`), source attribution anchors (`[s1]`), on-device model footprints (`74.2 MB`), and security hashes (`sha256:7f8c`).
- **Typographic Discipline:** Never set timestamps, citation brackets, or latency metrics in proportional sans-serif. Monospace denotes immutable computational facts.

## Layout & Spacing

Designed primarily for single-hand mobile ergonomics (390pt base target), with adaptable horizontal constraints for foldables and tablets.

- **Layout Grid:** A tight 4-column layout on standard mobile viewports with an outer `1rem` (16px) margin and `0.75rem` (12px) gutters. 
- **Vertical Spacing Cadence:** Base rhythm uses an explicit 4px step scale (`space-xs: 4px`, `space-sm: 8px`, `space-md: 12px`, `space-lg: 16px`, `space-xl: 24px`).
- **Screen Zones:**
  - *Top Utility Shelf (Height: 48px):* System trust state, airgap status indicator, and dynamic model RAM usage.
  - *Center Viewport (Dynamic Fluid Height):* Live streaming transcription, structured outlines, or captured audio scrubbing.
  - *Bottom Action Deck (Height: 88px - 112px):* Sticky thumb zone hosting primary tactile controls, waveform capture strip, and recording trigger capsules.

## Elevation & Depth

Visual hierarchy uses physical opacity and structural micro-borders rather than ambient diffusion or blurs.

- **Surface Tiers:**
  - `Level 0 (Background)`: `#121316` — Non-interactive viewport canvas.
  - `Level 1 (Dock & Grouping)`: `#1A1B1F` with a 1px solid border of `#2D3038`.
  - `Level 2 (Active Cards & Overlays)`: `#23252B` with a 1px solid border of `#2D3038`.
- **Shadow Philosophy:** Minimal to zero ambient drop shadows. Floating action elements utilize a crisp hard-edge offset shadow: `0px 4px 0px 0px rgba(0, 0, 0, 0.4)` to impart a physical, mechanical key-switch quality.
- **No Diffusion:** Frosted glass, chromatic dispersion, and high-blur backdrops are explicitly forbidden. Data containment requires opaque, deliberate surfaces.

## Shapes

The geometric vernacular uses disciplined, utilitarian corners. Standard structural containers use compact chamfers (`4px` / `0.25rem`), while active tracking tags and interactive floating buttons use tightly capped technical pill geometry.

- **Data Blocks, Audio Cards, and Input Enclosures:** `0.25rem` (4px). Provides a solid, machined-instrument silhouette.
- **Status Chips, Action Triggers, and Citations:** Fully rounded pill format (`9999px`) to distinguish active operational badges from static content containers.

## Components

### Buttons & Tactile Triggers
- **Primary Record Trigger:** Large floating capsule. Background `#4F46E5`, active `#4338CA`. Border: 1px solid `#818CF8` at 30% alpha. Text: `#F4F4F0` Inter 14px bold uppercase with JetBrains Mono counter badge. When recording, transforms into an emergency-style solid pill with an animated `#06B6D4` pulsing core.
- **Secondary Action:** `#1A1B1F` background, 1px solid border `#2D3038`, text `#F4F4F0`. Pressed state reveals a 1px inset border of `#4F46E5`.

### Chips & Citations
- **Grounded Citation Key:** Inline pill containing `[s1]`, `[s2]`. Font: `JetBrains Mono` 10px bold. Background `#064E3B`, text `#10B981`, border 1px solid `#10B981` at 40% alpha. On press, anchors directly to the exact audio segment timestamp.
- **Acoustic Pause Chip:** Inline metadata marker `[pause 1.4s]`. Font: `JetBrains Mono` 11px. Background `#1A1B1F`, border 1px dashed `#2D3038`, text `#6B7280`.

### Real-Time Waveform Monitor
- Micro-metered audio frequency bars rendered in pure vector bars with `2px` width, `1.5px` gap. Idle state: `#2D3038`. Active voice detection: `#06B6D4`. Peak clipping indicator: `#818CF8`.

### Privacy & Model Badges
- Persistent top-bar status pill. Left side: 6px solid emerald dot (`#10B981`). Right side text: `AIRGAP ACTIVE // ON-DEVICE (384MB)`. Background `#121316`, border 1px solid `#064E3B`.

### Segment Toggles
- Recessed toggle containers (`#121316`, border `#2D3038`) housing segment tabs: `Raw Audio`, `Transcript`, `Structured Memo`. Active segment: `#23252B` with 1px border `#4F46E5`, text `#F4F4F0`. Inactive text `#9CA3AF`.

### Structured Note Cards
- Base: `#1A1B1F`, 1px solid border `#2D3038`, radius `4px`.
- Card Header: Features document title in Inter 16px medium, accompanied by processing timestamp and local file size in `JetBrains Mono` 11px right-aligned.
- Card Body: Clean typography hierarchy with bullet indicators styled as terminal hashes (`#`, `*`, `>`).