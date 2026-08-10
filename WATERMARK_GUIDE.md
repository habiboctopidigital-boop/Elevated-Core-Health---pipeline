# Dashboard Watermark System

## Overview

A reusable, premium logo watermark component for the ECH dashboard — Stripe/Apple-level restraint with healthcare wellness feel.

**Asset:** `/public/logo.png` (unchanged, unmodified)  
**Component:** `components/ui/dashboard-watermark.tsx`  
**Status:** Fully responsive, performant, zero JavaScript

---

## Component Usage

### Basic Import

```tsx
import { DashboardWatermark, WatermarkOpacity } from "@/components/ui/dashboard-watermark"

export function MyDashboard() {
  return (
    <div className="relative z-10">
      <DashboardWatermark
        position="bottom-right"
        opacity={WatermarkOpacity.DASHBOARD}
        showGlow={true}
      />
      {/* Your dashboard content */}
    </div>
  )
}
```

### Props

```typescript
interface DashboardWatermarkProps {
  /**
   * Position: 'bottom-right' (default), 'bottom-center', 'bottom-left', 'center'
   */
  position?: "bottom-right" | "bottom-center" | "bottom-left" | "center"

  /**
   * Opacity level: 0-1
   * Use WatermarkOpacity constants for standard values
   */
  opacity?: number

  /**
   * Show soft ambient glow behind logo (never on logo itself)
   */
  showGlow?: boolean

  /**
   * Optional className for container
   */
  className?: string
}
```

---

## Preset Opacity Values

```typescript
export const WatermarkOpacity = {
  DASHBOARD: 0.05,              // Main dashboards (Donna, VA)
  DASHBOARD_SUBTLE: 0.035,      // Alternate dashboard style
  ANALYTICS: 0.03,              // Analytics/charts pages
  ANALYTICS_SUBTLE: 0.02,       // Very minimal for data-heavy pages
  SECONDARY: 0.035,             // Secondary sections (profiles, settings)
  SECONDARY_SUBTLE: 0.025,      // Minimal secondary pages
  EMPTY_STATE: 0.1,             // Empty states (brand moment)
  EMPTY_STATE_SUBTLE: 0.07,     // Slightly more subtle empty state
}
```

---

## Size Behavior

The watermark is **fully responsive** and automatically scales based on screen width:

| Breakpoint | Width | Use Case |
|-----------|-------|----------|
| Mobile (320–430px) | 250–350px | Phone view, reduced size |
| Tablet (768–1024px) | 350–500px | iPad, medium screens |
| Desktop (1024–1440px) | 450–700px | Standard desktop |
| Large (1440px+) | 600–800px | Ultra-wide screens |

The logo is **partially cropped** (25% off-screen) by default when `position="bottom-right"`.

---

## Design System Integration

### Container Structure

```tsx
<div className="relative z-10">  {/* Content stays above watermark */}
  <DashboardWatermark />          {/* z-index: 0, fixed position */}
  {/* Your content (z-index: auto = above) */}
</div>
```

### Z-Index Layers

- Watermark: `z-0` (fixed, behind everything)
- Content: `z-10` (relative, above watermark)
- Navigation/Modals: `z-20+` (existing layers, unaffected)

### Color Palette

- Logo: `#036638` (dark green primary) — unchanged
- Glow: `rgba(101, 189, 108, ...)` — brand green, 0.02–0.08 opacity
- No gradients, no filters, no shadow on logo itself

---

## Implementation Examples

### Example 1: Admin Dashboard (Current)

```tsx
import { DashboardWatermark, WatermarkOpacity } from "@/components/ui/dashboard-watermark"

export default function AdminDashboard() {
  return (
    <div className="relative z-10 space-y-6 max-w-[1600px] mx-auto">
      <DashboardWatermark
        position="bottom-right"
        opacity={WatermarkOpacity.DASHBOARD}
        showGlow={true}
      />
      {/* Cards, charts, etc. */}
    </div>
  )
}
```

### Example 2: Analytics Page (Subtle)

```tsx
<div className="relative z-10">
  <DashboardWatermark
    position="bottom-center"
    opacity={WatermarkOpacity.ANALYTICS}
    showGlow={true}
  />
  {/* Never behind labels or legend */}
</div>
```

### Example 3: Empty State (Prominent)

```tsx
<div className="relative z-10 flex flex-col items-center justify-center py-12">
  <DashboardWatermark
    position="center"
    opacity={WatermarkOpacity.EMPTY_STATE}
    showGlow={true}
  />
  <h2>No patients yet</h2>
  {/* Empty state content */}
</div>
```

---

## Technical Details

### Performance

- **Pure CSS/Tailwind**: No JavaScript, no animation loops
- **Responsive scaling**: Using Tailwind breakpoints only
- **Pointer events**: `pointer-events-none` ensures no interaction blocking
- **Accessibility**: `aria-hidden="true"` removes from screen reader tree
- **Fixed positioning**: Logo stays in viewport, no layout shift

### Browser Support

- All modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid, Flexbox, `object-contain` fully supported
- No custom filters or blend modes required

### Rendering

```tsx
<div
  className="fixed pointer-events-none select-none"
  style={{
    zIndex: 0,
    opacity: 0.05,  // Example
  }}
  aria-hidden="true"
>
  {/* Optional glow radial gradient */}
  {showGlow && (
    <div className="absolute inset-0 rounded-full blur-3xl"
      style={{
        background: "radial-gradient(...)"
      }}
    />
  )}

  {/* Actual logo image */}
  <img src="/logo.png" alt="" className="absolute inset-0 w-full h-full object-contain" />
</div>
```

---

## Responsive Breakpoints (Tested)

✓ 320px (Mobile)  
✓ 375px (iPhone)  
✓ 390px (iPhone 12)  
✓ 430px (Pixel 7)  
✓ 768px (iPad)  
✓ 1024px (iPad Pro)  
✓ 1280px (Laptop)  
✓ 1440px (Desktop)  
✓ 1920px (Ultra-wide)  

No horizontal overflow, no text overlap, no button blocking.

---

## Rules & Constraints

✅ **DO:**
- Use preset opacity constants
- Position bottom-right for main dashboards
- Enable glow for premium feel (optional, safe default)
- Wrap content in `relative z-10` container
- Test on real mobile devices

❌ **DON'T:**
- Blur or add effects to the logo itself
- Put watermark behind every card (page-level only)
- Change the logo image or colors
- Use high opacity (0.1+ is empty-state only)
- Block interactive elements
- Use animation or motion

---

## Future Enhancements

Optional additions (not currently implemented):
- Animated fade-in on first dashboard load
- Context-aware opacity switching based on user preference
- Multiple logo positions for different page layouts
- Export preset configuration for design system documentation

---

## Troubleshooting

### Watermark not visible
- Check opacity value (too low? use 0.05+)
- Verify `/logo.png` exists and is readable
- Check browser DevTools: element should have `z-index: 0`, `position: fixed`

### Watermark blocking content
- Add `relative z-10` to content container
- Ensure parent has `position: relative`
- Check z-index values in your custom CSS

### Watermark looks pixelated
- Logo is vector-based PNG, should be crisp
- Check browser zoom level (should be 100%)
- `object-contain` maintains aspect ratio perfectly

---

## Currently Deployed

- ✅ `/admin/dashboard` — Main admin dashboard
- ✅ `/dashboard` — VA dashboard (subtle variant)

Ready for expansion to analytics, empty states, and secondary pages on request.
