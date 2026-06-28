# SAGA — Mission Control
**Quarterly Planning Web App**

---

## Overview

SAGA Mission Control is a single-file HTML web app for personal quarterly goal tracking, styled as a retro RPG game interface. Goals are framed as "quests," completed tasks earn gold, and the UI uses pixel-art fonts and a deep purple/mauve color palette with CRT scanline effects.

The app supports multiple users via Supabase authentication. Each user's data is stored in their browser's `localStorage` under the key `mc_v1` and tied to their login session.

---

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript — single `.html` file, no build step
- **Auth:** Supabase (supabase-js v2) — email/password login
- **Storage:** `localStorage` (browser-side, per-user, per-device)
- **Fonts:** Silkscreen, VT323, Space Mono, DM Sans, Sora, Playfair Display (Google Fonts)

---

## Authentication

On load, the app shows a split-screen login overlay:
- **Left panel** — branded hero section with the SAGA title and tagline (deep purple/dark background, CRT scanlines, pixel corner brackets)
- **Right panel** — login/signup form powered by Supabase

Once authenticated, the overlay dismisses and the main app initializes.

---

## Main Layout

The app has a sticky header and a tabbed main content area.

### Header
- **App title:** SAGA (Silkscreen font, pixel aesthetic)
- **Quarter selector:** Buttons for Q1–Q4 with a year dropdown
- **Gold counter:** Running total of gold earned, displayed as a glowing pill
- **Action buttons:** Theme toggle, settings, quick-add quest

---

## Tabs / Views

### // GOALS (Board View)
The primary view. Organized into four task sections:

- **Main Quests** — large goals for the quarter, displayed as horizontally scrollable cards. Each card can contain sub-quests (nested tasks) and a gold reward value. Cards are drag-and-drop reorderable.
- **Side Quests** — smaller one-off tasks with optional gold rewards. Repeatable quests are supported with configurable repeat goals and reward modes (each completion vs. milestone).
- **Daily Tasks** — tasks that auto-reset every day. Tracks a streak counter (🔥 N-day streak) when all dailies are completed.
- **Weekly Tasks** — tasks that auto-reset each week.

Each section shows a progress bar and completion percentage. A stats strip at the top of the board summarizes counts across all task types.

### // PLAN (Timeline View)
A planning/timeline view for mapping out when tasks will happen during the quarter.

### // REWARDS (Shop View)
A reward shop where earned gold can be spent on custom rewards. Users define their own reward items with names and gold costs. Purchasing a reward deducts gold and marks the item as unlocked.

### // FINANCE (Finance View)
Hidden by default, toggled via settings. Tracks quarterly finances across four categories: income, expenses, investments, and savings. Calculates remaining budget and discretionary allowance. Also supports custom savings goals with progress bars.

### // FOCUS (Focus View)
A Pomodoro-style focus timer. Features:
- Named focus sessions
- Preset durations (plus a custom input)
- Start/pause/reset controls
- Progress bar
- A focused task checklist for the session

### // TRACKER (Tracker View)
A custom habit/item tracker displayed in a 2-column grid. Users can create named tracker sections and log entries within them.

---

## Vision Board
An image board (accessible via modal) where users can add image tiles by URL or file upload, with optional captions. Images are stored as base64 in localStorage (max 1200px, JPEG compressed). Tiles open in a lightbox.

---

## Other Features

- **Quick Add Quest** — modal shortcut to add a main quest, side quest, sub-quest, or weekly task without navigating to the board
- **Streak tracking** — daily tasks maintain a streak that persists across days
- **Drag-and-drop reordering** — main quest cards can be reordered by dragging
- **Auto-resets** — dailies reset at midnight; weeklies reset at the start of each week
- **Year/quarter switching** — each Q1–Q4 of each year has its own independent data
- **Light/dark themes** — multiple color presets stored per user, applied via CSS custom properties

---

## Data Model (localStorage)

All state lives in `localStorage` key `mc_v1` as a JSON object. Top-level keys:
- `currentQ` — active quarter (1–4)
- `currentYear` — active year
- `theme` — current theme preset
- `quarters` — object keyed by `"YYYY-QN"`, each containing: `main`, `side`, `daily`, `weekly`, `shop`, `finance`, `vision`, streak state, and date-reset markers

---

## File Structure

```
Quarterly Plan/
└── mission-control.html    # Entire app — HTML, CSS, and JS in one file
```
