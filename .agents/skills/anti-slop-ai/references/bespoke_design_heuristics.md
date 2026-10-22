
# Bespoke Design Heuristics & Anti-AI Template Guide

To prevent web applications and interfaces from looking like cheap AI clones, adhere to the following design heuristics:

---

## 1. Intentional Color Crafting
Avoid generic Tailwind defaults (`bg-blue-500`, `bg-indigo-600`) without deliberate thought.

### Modern Color Principles:
1. **Never use pure black (`#000000`) for surfaces**: Use tinted dark tones such as `#0a0e17` (navy midnight), `#0d1117` (github slate), or `#121214` (warm onyx).
2. **Never use pure white (`#ffffff`) for body text on dark themes**: Pure white on dark creates harsh optical halation. Use `#e2e8f0` or `#f1f5f9` for primary text and `#94a3b8` for secondary text.
3. **Accent Restraint**: Limit loud saturated accents to 10% of the visual space (Buttons, active badges, highlights). The remaining 90% should be dedicated to structural readability and typography.

---

## 2. Typography Hierarchy & Weight Modulation
- **Display Typeface**: For headlines, use distinctive fonts with character:
  - *Outfit*, *Plus Jakarta Sans*, *Syne*, *Cabinet Grotesk*, or *Satoshi*.
- **Body Typeface**: For reading clarity:
  - *Inter*, *Geist Sans*, or system sans-serif (`system-ui, -apple-system, sans-serif`).
- **Code/Telemetry**:
  - *JetBrains Mono*, *Geist Mono*, or *Fira Code*.
- **Letter Spacing Tuning**:
  - Large headings ($> 28\text{px}$): Tighten tracking (`letter-spacing: -0.025em`).
  - Small uppercase badges ($< 12\text{px}$): Loosen tracking (`letter-spacing: 0.06em; text-transform: uppercase`).

---

## 3. Dynamic Layouts & Visual Rhythm
- **Avoid Identical 3-Column Grids**: Standard AI output puts 3 identical boxes side by side. Instead, create asymmetrical rhythm:
  - Bento Layouts: One large feature card (span 2 columns, span 2 rows), one tall metric card, two compact horizontal insight rows.
  - Generous Spacing: Give content room to breathe with rhythmic spacing scales (8px, 16px, 24px, 32px, 48px, 64px).

---

## 4. Tactile Feedback & Micro-Interactions
Every interactive component must confirm user presence:
- **Buttons & Links**: Tactile hover elevation, active scale down (`scale(0.98)`).
- **Cards & Rows**: Subtle background tint shift, border luminance transition, cursor indicator.
- **Form Inputs**: Distinct focus border with subtle ambient glow (`box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2)`).
