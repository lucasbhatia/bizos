# BizOS Design Quality Audit

## Status Badges

All status badges use centralized design tokens from `lib/design/tokens.ts`.

- **Case Status**: Uses `STATUS_COLOR_MAP` which maps all 12 `CaseStatus` values to `ColorToken` objects (`bg`, `text`, `border`, `dot` classes). Consistent across dashboard, cases list, case detail, and kanban views.
- **Priority Levels**: Uses `PRIORITY_COLOR_MAP` for `urgent`, `high`, `normal`, `low`. Applied via the `PRIORITY_COLORS` shorthand in `lib/types/database.ts` and the token map in `lib/design/tokens.ts`.
- **Confidence Scores**: `getConfidenceColor()` function returns tokens for high (>0.85), medium (0.7-0.85), and low (<0.7).
- **Risk Scores**: `getRiskColor()` function returns tokens across four tiers (low/medium/high/critical).

No inline color definitions for status badges exist outside the token system.

## Typography Consistency

- **Page titles**: `text-2xl font-bold text-slate-900` (consistent across dashboard, cases, tasks, finance, audit, admin pages).
- **Page subtitles**: `text-sm text-slate-500`.
- **Card titles**: `text-base` via `CardTitle` component (shadcn).
- **Body text**: `text-sm` default. Field labels use `text-xs font-medium text-slate-500`.
- **Monospace**: `font-mono` for case numbers, HTS codes, entry numbers. `font-mono-code` utility available for tabular numerals.
- **Font stack**: System font via Tailwind defaults, with JetBrains Mono for monospace.

## Spacing Consistency

- **Page padding**: `p-4 sm:p-6` via protected layout (`app/(protected)/layout.tsx`).
- **Section gaps**: `space-y-6` between major sections on all pages.
- **Card internal padding**: Via shadcn `CardHeader`/`CardContent` (px-6 py-4 / px-6 pb-6).
- **Grid gaps**: `gap-4` for metric grids, `gap-6` for content grids.
- **CSS custom properties**: `--space-page-x`, `--space-page-y`, `--space-section`, `--space-card` defined in `globals.css`.

## Responsive Behavior

- Dashboard metrics: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- Tables: Wrapped in `ResponsiveTable` with horizontal scroll, touch scrolling, and fade indicator.
- Filter bars: Stack vertically on mobile (`flex-col sm:flex-row`).
- Case detail tabs: `overflow-x-auto` for horizontal scrolling on mobile.
- Bottom nav: 56px height with 44px minimum touch targets.
- Mobile utilities: `.mobile-stack`, `.mobile-hide`, `.mobile-full` in `globals.css`.

## Remaining Inconsistencies

- Filter select widths (`w-44`, `w-36`, `w-48`) are fixed rather than responsive; on mobile they now stack full-width via the `flex-col` pattern.
- Some pages use `bg-white` directly on cards while others rely on the shadcn `Card` component which uses `bg-card`. Both resolve to white in light mode.
- The portal layout does not yet apply the same `pb-20` bottom padding for mobile nav clearance.

## Accessibility

### Contrast Ratios
- Text colors (`text-slate-900`, `text-slate-700`, `text-slate-600`) on white backgrounds meet WCAG AA (4.5:1+).
- Badge text on badge backgrounds (e.g., `text-amber-800` on `bg-amber-100`) meets WCAG AA.
- `text-slate-500` on white is 4.6:1 -- passes AA for normal text.
- `text-slate-400` on white is 3.0:1 -- fails AA for normal text but is used only for supplementary/decorative labels.

### Keyboard Navigation
- All interactive elements (links, buttons, selects, dialogs) are focusable via standard HTML semantics.
- shadcn/ui components (Dialog, Sheet, DropdownMenu, Tabs) include built-in keyboard support and focus trapping.
- Tab order follows visual layout order.

### ARIA Labels
- Mobile nav: `role="navigation"` with `aria-label="Mobile navigation"`.
- Active tab: `aria-current="page"` on the active mobile nav item.
- More button: `aria-label="More navigation options"`.
- Decorative elements (fade indicator, active dot): `aria-hidden="true"`.
- Status pipeline dots use visual-only labels; screen readers rely on the status badge text in the header.

### Recommendations
- Add `aria-label` to color picker inputs in the branding page for screen reader context.
- Consider adding `sr-only` text alternatives for icon-only buttons in the kanban view.
- The responsive table fade indicator is decorative and correctly marked `aria-hidden`.
