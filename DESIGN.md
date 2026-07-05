---
name: SygmaAuto
description: Dark premium operational interface with gold accent for a multi-tenant automotive workshop SaaS.
colors:
  base: "#08090a"
  surface-50: "#f7f7f8"
  surface-100: "#ececf0"
  surface-200: "#e0e0e6"
  surface-900: "#28282f"
  surface-950: "#18181d"
  gold-400: "#e6bc5e"
  gold-500: "#d4a843"
  gold-600: "#b8912f"
  success: "#22c55e"
  warning: "#f59e0b"
  danger: "#ef4444"
  info: "#3b82f6"
typography:
  sans:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  heading:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  sm: 6px
  md: 10px
  lg: 14px
spacing:
  sm: 10px
  md: 16px
  lg: 24px
elevation:
  subtle: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)"
  medium: "0 12px 18px -6px rgba(0,0,0,0.16), 0 4px 8px -4px rgba(0,0,0,0.10)"
components:
  button-primary:
    backgroundColor: "{colors.gold-500}"
    textColor: "#1a1208"
    rounded: "{rounded.sm}"
    padding: 10px 14px
  button-primary-hover:
    backgroundColor: "{colors.gold-400}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.gold-400}"
    rounded: "{rounded.sm}"
    padding: 10px 14px
  card:
    backgroundColor: "{colors.surface-950}"
    textColor: "{colors.surface-100}"
    rounded: "{rounded.md}"
    border: "1px solid rgba(255,255,255,0.08)"
    padding: "{spacing.md}"
  input:
    backgroundColor: "rgba(24,24,29,0.6)"
    textColor: "{colors.surface-100}"
    rounded: "{rounded.md}"
    border: "1px solid rgba(255,255,255,0.1)"
    padding: 10px 12px
  modal-backdrop:
    backgroundColor: "rgba(0,0,0,0.6)"
  modal:
    backgroundColor: "{colors.surface-950}"
    textColor: "{colors.surface-100}"
    rounded: "{rounded.lg}"
    border: "1px solid rgba(255,255,255,0.12)"
    padding: "{spacing.lg}"
  chip-ok:
    backgroundColor: "#23321f"
    textColor: "#b6e2a6"
    rounded: 999px
    padding: 4px 10px
  chip-warn:
    backgroundColor: "#3a2e1e"
    textColor: "#f0c87a"
    rounded: 999px
    padding: 4px 10px
  chip-err:
    backgroundColor: "#3a1f1f"
    textColor: "#f0a6a6"
    rounded: 999px
    padding: 4px 10px

# SygmaAuto Design System

## Overview
SygmaAuto uses a dark premium operational interface with a controlled gold accent. The goal is a consistent, high-contrast experience across public, authenticated, and operational surfaces while keeping the interface usable on mobile, tablet, and desktop.

## Colors
- **Base:** `#08090a` for app background.
- **Surface:** `#18181d`, `#28282f`, `#ececf0` for panels, cards, and elevated surfaces.
- **Accent:** Gold is the primary accent for CTAs, active states, and highlights.
- **Status:** semantic colors are allowed only as feedback states.

## Typography
- Use `Inter` with `system-ui` fallback.
- Keep headings tight: `20px`, `600`, `0.02em` tracking.
- Body text should be readable at `14px / 1.55`.

## Layout
- Prefer compact, dense layouts that preserve fast operational workflows.
- Maintain minimum touch targets of `44px` for primary actions.
- Use consistent padding scale: `10px`, `16px`, `24px`.

## Elevation
- Prefer subtle surface separation by color and thin borders.
- Use elevation sparingly for modals and focus states.

## Shapes
- Rounded corners scale: `6px`, `10px`, `14px`.

## Components
- Primary CTA should use gold and remain the strongest visual action.
- Secondary actions should be gold-outlined or ghost.
- Cards should read as elevated panels, not paper sheets.
- Inputs should remain dark and low-contrast until focused.
- Modals should use an opaque dark overlay and a solid surface container.
- Status chips should remain compact and color-coded by meaning, not branding.

## Do's and Don'ts
**Do:**
- use `surface` as the main neutral language
- use `gold` for primary actions and active state
- keep status colors semantic and limited

**Don't:**
- rely on `slate/indigo/violet/blue/amber` as structural identity
- overuse blur in authenticated/admin surfaces
- replace hierarchy with heavy tracking or large type alone
