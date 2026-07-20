
## For visual-style reference only — see conflict note at bottom

---

## 1. Extracted Color Palette

| Role | Approx. hex | Where seen |
|---|---|---|
| Sidebar background | `#16181C` (near-black charcoal) | Full left nav column |
| Primary accent (orange) | `#E8792E` | Active nav highlight, "Create New Job" button, "Danny" name text, logo gradient |
| Accent gradient (logo) | `#F2994A` → `#C0392B` | Phoenix wing/house icon |
| Content background | `#F4F5F7` (light gray) | Main panel behind cards |
| Card background | `#FFFFFF` | Stat cards, module cards |
| Card accent — amber | `#F2A93B` | "Active Jobs" stat card top border |
| Card accent — red | `#E15C4E` | "Urgent / Emergency" stat card top border |
| Card accent — blue | `#3B82C4` | "New Enquiries" stat card top border |
| Card accent — green | `#3FA66E` | "Completed Today" stat card top border |
| Text — primary (dark) | `#1A1B1E` | Card numbers, headings on white |
| Text — secondary (gray) | `#6B7280` | Card labels, subtitles |
| Text — on dark sidebar | `#FFFFFF` / `#B8BCC4` (muted) | Nav labels, inactive vs active |
| Module icon tint — blue | bg `#E8F1FC`, icon `#3B82C4` | Enquiries |
| Module icon tint — amber | bg `#FBF0DD`, icon `#D98F2B` | Awaiting Acceptance |
| Module icon tint — red | bg `#FBEAE8`, icon `#D95C4E` | Trade Costs |
| Module icon tint — green | bg `#E8F5EC`, icon `#3FA66E` | Properties |

---

## 2. Typography & Visual Style

- **Headings:** bold, rounded sans-serif (looks like Poppins/Inter Semibold), large size for the greeting line ("Good evening, Danny.")
- **Body/labels:** regular weight, smaller size, gray, sentence case
- **Numbers on stat cards:** very large, bold, dark — the number is the visual anchor of each card
- **Buttons:** solid orange fill for primary action, dark outline/ghost style for secondary action
- **Corners:** generously rounded (12–16px) on cards and buttons
- **Card style:** flat white cards, thin colored top border as the only color accent per card — not full colored backgrounds

## 3. Layout Structure

```
┌─────────────┬──────────────────────────────────────┐
│  Dark        │  Dark hero banner (photo bg)         │
│  sidebar     │  "Good evening, {name}."              │
│  (logo top,  │  date · primary + secondary CTA       │
│  nav below)  ├──────────────────────────────────────┤
│              │  4 stat cards in a row                │
│              │  (colored top border, big number,     │
│              │   label, small icon top-right)        │
│              ├──────────────────────────────────────┤
│              │  "MODULES" section — 4-column grid    │
│              │  of white cards: icon + title +        │
│              │  subtitle + chevron                    │
└─────────────┴──────────────────────────────────────┘
```

- Left sidebar: fixed width, dark, logo + wordmark at top, nav items with active item getting a solid orange pill background
- Top hero: dark banner with a background photo, greeting + date + two CTA buttons
- Stat row: 4 equal-width cards, each with a distinct accent color on the top border only
- Module grid: 4-column card grid, each card = icon (tinted circle) + title + one-line subtitle + right-facing chevron