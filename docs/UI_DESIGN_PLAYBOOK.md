# BizOS UI/UX Design Overhaul Playbook
## From Functional to Beautiful — Making BizOS a Product People Want to Use
### Run this AFTER verification is complete

Version 1.0 — March 2026

---

# Design Philosophy

BizOS isn't just an internal tool — it's the operating system you'll deploy into every customs brokerage you acquire. It needs to:

1. **Look like a premium product** — first impressions matter when onboarding acquired teams
2. **Reduce cognitive load** — customs specialists handle 50+ cases daily, the UI must be effortless
3. **Work for any brokerage** — themeable, white-label-ready, no hardcoded branding
4. **Scale visually** — look great with 5 cases or 5,000 cases
5. **Be mobile-friendly** — specialists at ports need to check status on their phones

---

# Design System Setup

## Step D1: Design Tokens & Theme System

```
Build a comprehensive theming system for BizOS that supports
white-labeling for acquired brokerages.

1. Create a design tokens file at lib/design/tokens.ts:

   Color Palette (default BizOS theme):
   - Primary: Deep navy (#0F172A) — authority, trust, professionalism
   - Primary accent: Ocean blue (#2563EB) — action buttons, links, active states
   - Secondary accent: Teal (#0D9488) — success, confirmations, positive metrics
   - Warning: Amber (#D97706) — SLA approaching, needs attention
   - Danger: Red (#DC2626) — overdue, holds, critical alerts
   - Neutral: Slate scale (#F8FAFC to #0F172A) — backgrounds, text, borders

   Status colors (used consistently everywhere):
   - intake / awaiting_docs: Amber/Yellow (#F59E0B bg, #92400E text)
   - docs_validated / classification_review / entry_prep: Blue (#3B82F6 bg, #1E3A8A text)
   - submitted / govt_review: Purple (#8B5CF6 bg, #4C1D95 text)
   - hold: Red (#EF4444 bg, #7F1D1D text)
   - released / billing: Green (#10B981 bg, #064E3B text)
   - closed / archived: Gray (#6B7280 bg, #1F2937 text)

   Priority colors:
   - urgent: Red badge
   - high: Orange badge
   - normal: Blue badge
   - low: Gray badge

   Confidence colors (for AI agent results):
   - high (>0.85): Green
   - medium (0.7–0.85): Yellow
   - low (<0.7): Red

2. Create a ThemeProvider component that:
   - Reads theme from tenant settings (for white-labeling)
   - Falls back to default BizOS theme
   - Applies CSS custom properties to the root
   - Supports dark mode toggle

3. Update tailwind.config.ts to use CSS custom properties
   so all colors flow through the theme system

4. Create shared color utility functions:
   - getStatusColor(status) → returns bg, text, border colors
   - getPriorityColor(priority) → returns badge colors
   - getConfidenceColor(confidence) → returns indicator color
   - getRiskColor(riskScore) → returns risk indicator color

Commit as "feat: design token system with white-label theming"
```

---

## Step D2: Typography & Spacing System

```
Establish a consistent typography and spacing system:

1. Typography scale:
   - Display: 36px/40px — page titles (Dashboard, Cases)
   - Heading 1: 24px/32px — section titles
   - Heading 2: 20px/28px — card titles, tab labels
   - Heading 3: 16px/24px — subsection titles
   - Body: 14px/20px — primary text, table cells
   - Body small: 13px/18px — secondary text, metadata
   - Caption: 12px/16px — timestamps, badges, helper text
   - Mono: 13px — case numbers, codes, IDs (use JetBrains Mono or similar)

2. Font stack:
   - Primary: Inter (import from Google Fonts)
   - Mono: JetBrains Mono (for case numbers, HTS codes, technical data)
   - Fallback: system-ui, sans-serif

3. Spacing scale (consistent with Tailwind but explicitly documented):
   - Component padding: 16px (p-4)
   - Card padding: 20px (p-5)  
   - Section gap: 24px (space-y-6)
   - Page padding: 32px (p-8)
   - Sidebar width: 260px
   - Content max-width: 1400px (centered)

4. Update globals.css with the font imports and base typography styles

5. Create reusable text components if needed:
   - PageTitle, SectionTitle, CardTitle
   - BodyText, Caption, MonoText

Commit as "feat: typography and spacing system"
```

---

# Core UI Components

## Step D3: Redesign the Sidebar

```
The sidebar is the most-seen component. Make it premium:

1. STRUCTURE:
   - Fixed left sidebar, 260px wide on desktop
   - Collapsible to 64px (icons only) with a toggle button
   - Smooth transition animation (200ms ease)
   - Remember collapsed state in localStorage

2. VISUAL DESIGN:
   - Background: dark navy (#0F172A) or very dark slate
   - Text: white/light gray on dark background
   - Active item: highlighted with primary accent color,
     left border indicator (3px solid accent), slightly lighter bg
   - Hover: subtle background lightening
   - Icons: use lucide-react, 20px size, consistent stroke width

3. SECTIONS:
   - Top: BizOS logo/wordmark (or tenant logo in white-label mode)
     Subtle tenant name underneath in small text
   
   - Main nav: Dashboard, Cases, Documents, Tasks, Intake Queue,
     Clients, Finance, Reports, Audit Trail
     Each with icon + label + optional count badge (e.g., "Tasks (3)")
   
   - Bottom section: 
     * User avatar (initials in a circle with theme color)
     * User name + role badge
     * Settings gear icon
     * Collapse toggle
     * Logout button (subtle, not prominent)

4. MOBILE:
   - Sidebar becomes a slide-over overlay
   - Hamburger menu button in a top bar
   - Backdrop overlay when open
   - Close on outside click or swipe

5. BADGES:
   - Show count badges on nav items:
     * Cases: number of cases needing attention (stuck/overdue)
     * Tasks: number of overdue tasks assigned to user
     * Intake: number of pending intake items
   - Badges pulse/animate briefly when count changes

Commit as "feat: premium sidebar with collapse, badges, dark theme"
```

---

## Step D4: Redesign the Dashboard

```
The dashboard is the command center. It should feel like a
Bloomberg terminal meets a modern SaaS dashboard.

1. TOP METRICS BAR:
   - 4 metric cards in a row, each with:
     * Icon (in a colored circle background)
     * Big number (28px+, bold)
     * Label (small, muted)
     * Trend indicator (↑12% or ↓5% with green/red color)
     * Subtle sparkline or mini chart showing last 7 days
   - Cards have subtle shadow, rounded corners (12px),
     and a thin left border in the metric's color

   Metrics:
   - Active Cases (blue icon) — cases not in closed/archived
   - Clearance Rate (green icon) — cases cleared this week
   - Avg Cycle Time (purple icon) — average days from intake to close
   - Revenue Pipeline (teal icon) — sum of estimated billing in active cases

2. EXCEPTION STACK (left 2/3, main focus area):
   - Title: "Needs Your Attention" with count badge
   - Card-based list (not a plain table)
   - Each exception card has:
     * Left color stripe (red=overdue, amber=warning, blue=info)
     * Case number (mono font) + client name (bold)
     * Exception type icon + description
     * Time indicator: "Stuck for 3h 22m" with progress bar toward SLA
     * Assigned user avatar + name
     * Quick action buttons (right side): "View", "Reassign", "Nudge Client"
   - Cards are sorted by severity (red first, then amber, then blue)
   - Empty state: a green checkmark with "All clear — no exceptions"

3. CASES BY STAGE (right 1/3):
   - Vertical pipeline visualization (not a boring bar chart)
   - Each stage is a horizontal bar with:
     * Stage name
     * Count number
     * Bar width proportional to count
     * Color matching status color system
   - Shows the flow: top is intake, bottom is closed
   - Clicking a stage navigates to cases list filtered by that status

4. AGENT ACTIVITY FEED (bottom, collapsible):
   - Real-time-style feed of recent agent actions
   - Each entry: agent icon + "Document Agent parsed invoice for Case ACM-2026-00042"
   - Confidence badge on each
   - "View details" link to the ai_action_log entry
   - Subtle animation when new entries appear

5. AI INSIGHTS PANEL (bottom right, if space):
   - Daily AI-generated summary: "Today: 12 cases cleared, 3 holds resolved,
     avg cycle time improved 8% vs last week"
   - Generated by Executive Brief Agent

VISUAL STYLE:
- Background: very light gray (#F8FAFC)
- Cards: white with subtle shadow (shadow-sm)
- Generous whitespace between sections
- No harsh borders — use shadow and background contrast instead
- Subtle grid pattern or gradient in the page header area

Commit as "feat: premium dashboard — exception cards, pipeline viz, agent feed"
```

---

## Step D5: Redesign the Cases List

```
Make the cases list powerful but not overwhelming:

1. PAGE HEADER:
   - "Cases" title with case count
   - Subtitle: "Manage all customs entry cases"
   - "New Case" button (primary accent color, prominent)
   - View toggle: Table view / Kanban view (two buttons/icons)

2. FILTER BAR:
   - Clean horizontal bar with filter chips
   - When a filter is active, it shows as a colored chip with an X to remove
   - "Clear all" link when any filters are active
   - Filter dropdowns have search within them
   - Saved filter presets: "My Cases", "Urgent", "Stuck", "Due Today"
     (pill-shaped buttons above the table)

3. TABLE VIEW (default):
   - Clean table with alternating row backgrounds (very subtle)
   - Generous row height (48px+) for readability
   - Case number in mono font with a subtle link color
   - Status as a pill badge (rounded, colored)
   - Priority as a small dot + text
   - Client name in bold
   - ETA with relative time ("in 3 days" or "2 days ago" in red)
   - Assigned user as avatar + name
   - Row hover: subtle blue highlight
   - Click anywhere on row to open case (not just the case number)

4. KANBAN VIEW (alternative):
   - Columns for each active status (intake through billing)
   - Cards in each column showing:
     * Case number + client
     * Priority indicator
     * ETA
     * Assigned user avatar
     * Doc completeness indicator (3/5 docs)
   - Drag and drop between columns (triggers status transition)
   - Column headers show count
   - Smooth animations on card movement

5. EMPTY STATE:
   - Illustration or icon
   - "No cases match your filters" or "No cases yet — create your first case"
   - Call-to-action button

Commit as "feat: cases list — table and kanban views with filter chips"
```

---

## Step D6: Redesign the Case Detail Page

```
The case detail page needs to feel like a mission control for each shipment:

1. CASE HEADER (sticky, always visible):
   - Full-width header band with subtle gradient background
   - Left side: Case number (large, mono) + client name
   - Center: Visual status pipeline (horizontal dots connected by lines,
     completed=green filled, current=blue pulsing, future=gray outline)
   - Right side: Priority badge, risk score, ETA countdown,
     assigned user, and action dropdown (Change Status, Reassign)
   - Below: breadcrumb trail (Cases > ACM-2026-00042)

2. TAB BAR:
   - Horizontal tabs with icons + labels
   - Active tab: bold text + bottom border in accent color
   - Tab badges showing counts (Documents: 3/5, Tasks: 2 open)
   - Tabs: Overview, Documents, Classification, Tasks, Communications, Activity

3. OVERVIEW TAB redesign:
   - Two-column layout on desktop
   - Left column:
     * "Shipment Details" card: mode, ETA, arrival, vessel/flight, container/AWB
     * "Client Info" card: client name, contact, IOR number
   - Right column:
     * "Checklist" card: required docs progress, task completion progress
     * "Timeline" card: vertical timeline of all events with icons and
       relative timestamps ("3 hours ago")
   - Key metrics at top: days in process, documents complete %, risk score

4. DOCUMENTS TAB redesign:
   - Two-panel layout:
     * Left panel: document list/grid
       - Card per document type showing: type name, status (missing/uploaded/validated),
         confidence score if parsed, version badge
       - Upload drop zone at the bottom ("Drop files here or click to upload")
       - Color coding: green=validated, yellow=uploaded but not reviewed,
         red=missing, blue=AI parsed awaiting review
     * Right panel: document preview
       - Shows selected document inline (PDF/image viewer)
       - Below preview: AI-extracted fields in a clean form layout
       - Each field has: label, value, confidence badge, source reference,
         and accept/reject/edit controls
       - Bulk actions: "Accept All High Confidence", "Flag All Low Confidence"

5. CLASSIFICATION TAB redesign:
   - Line items table from commercial invoice
   - Per line item: product description, AI-suggested codes
   - Code suggestion cards:
     * HS code in large mono font
     * Description
     * Confidence bar (visual, not just a number)
     * "Rationale" expandable section
     * "Why it might be wrong" in a yellow callout
     * "Approve" button (green, only for licensed brokers)
   - Approved codes show with a green checkmark

6. TASKS TAB redesign:
   - Kanban-style columns: Pending, In Progress, Completed
   - Task cards with: title, assignee avatar, due date countdown,
     priority dot, created-by badge (human vs AI agent)
   - Quick complete: checkbox on each card
   - Agent-created tasks have a subtle AI indicator icon

7. COMMUNICATIONS TAB redesign:
   - Chat-style message thread layout
   - Outgoing messages (to client) on the right, incoming on the left
   - AI drafts shown with a special "AI Draft" header and edit/send buttons
   - Message composer at bottom with template selector dropdown

8. ACTIVITY TAB redesign:
   - Vertical timeline with connected dots
   - Grouped by date ("Today", "Yesterday", "March 19")
   - Each event: icon (color-coded by type), description, actor, timestamp
   - AI events have a robot icon and show confidence
   - Expandable details for each event

Commit as "feat: case detail — premium design with preview panel, timeline, kanban tasks"
```

---

# Agent UI Polish

## Step D7: AI Confidence & Trust Indicators

```
Make AI interactions transparent and trustworthy:

1. CONFIDENCE DISPLAY:
   - Never show raw numbers (0.847) to users
   - Use visual indicators instead:
     * High confidence: green filled circle + "High confidence"
     * Medium confidence: yellow half-filled circle + "Needs review"
     * Low confidence: red outline circle + "Low confidence — verify"
   - On hover: show the actual percentage and source references

2. AI ACTION BADGES:
   - Anywhere an AI agent contributed, show a small "AI" badge
   - Badge is a subtle pill: light purple background, small robot icon
   - Clicking the badge opens a panel showing:
     * What the agent did
     * What inputs it used
     * Its confidence level
     * Source citations (which document, which page)
     * When it ran
     * Whether a human has reviewed it

3. HUMAN REVIEW INDICATORS:
   - Fields accepted by humans: green checkmark + "Verified by [Name]"
   - Fields rejected: red X + "Rejected — [reason]"
   - Fields not yet reviewed: yellow clock + "Awaiting review"

4. APPROVAL FLOW UI:
   - When an agent needs human approval, show a clear banner:
     "AI has prepared [action]. Review and approve to proceed."
   - Approve/Reject buttons are prominent
   - "View AI reasoning" link shows the full chain

Commit as "feat: AI trust indicators — confidence display, action badges, review status"
```

---

# Page-Level Polish

## Step D8: Login & Signup Pages

```
First impression matters. Make login/signup beautiful:

1. LAYOUT:
   - Full-screen split: left half visual, right half form
   - Left side: dark navy background with:
     * Large BizOS logo (white)
     * Tagline: "The Operating System for Modern Customs Brokerage"
     * 3 rotating feature highlights with icons:
       "AI-Powered Document Processing"
       "Real-Time Shipment Tracking"
       "Automated Compliance Monitoring"
     * Subtle animated gradient or particle effect in background
   - Right side: clean white form area centered vertically

2. LOGIN FORM:
   - "Welcome back" heading
   - Email + password fields with clean labels
   - "Remember me" checkbox
   - "Sign in" button (full width, primary accent)
   - "Forgot password?" link
   - Divider with "or"
   - "Sign in with Google" button (outline style)
   - "Don't have an account? Sign up" link at bottom

3. SIGNUP FORM:
   - "Create your account" heading
   - Full name + email + password fields
   - Password strength indicator
   - Terms checkbox
   - "Create account" button

4. LOADING:
   - Button shows spinner while authenticating
   - Smooth transition to dashboard after login

Commit as "feat: premium login/signup with split layout and animations"
```

---

## Step D9: Client Portal Design

```
The client portal is what your customers see. It needs to be
simple, trustworthy, and informative without exposing internal details.

1. SEPARATE VISUAL IDENTITY:
   - Cleaner, simpler layout than the internal app
   - Can be white-labeled with the brokerage's logo and colors
   - No "BizOS" branding visible to clients (white-label ready)

2. CLIENT DASHBOARD:
   - Active shipments as cards (not a table)
   - Each card: case number, status (simplified: "In Progress",
     "Action Needed", "Cleared", "On Hold"), ETA, last update
   - Action needed cases highlighted with amber border
   - "Upload Documents" call-to-action on cases needing docs

3. CASE VIEW (client perspective):
   - Simplified status timeline (5 stages, not 12):
     "Documents" → "Review" → "Filed" → "Customs" → "Cleared"
   - Required documents checklist with upload buttons
   - Message thread with brokerage team
   - Invoices and payment links
   - NO: internal notes, AI actions, classification details,
     risk scores, agent logs, or regulatory details

4. DOCUMENT UPLOAD:
   - Large, obvious upload area
   - Document type selection with plain English names:
     "Commercial Invoice" not "commercial_invoice"
   - Clear progress indicators
   - Confirmation message after upload

5. VISUAL STYLE:
   - Light, airy design
   - Larger fonts (16px body minimum)
   - Lots of whitespace
   - Friendly, not corporate
   - Mobile-first (clients often upload from phones)

Commit as "feat: client portal — clean, simple, white-label-ready design"
```

---

## Step D10: Finance Pages

```
Finance pages need to be clean and scannable:

1. FINANCE DASHBOARD:
   - Revenue metrics: invoiced this month, collected, outstanding
   - AR aging chart: current, 30 days, 60 days, 90+ days
   - Each bucket is a colored bar (green → yellow → orange → red)
   - Top clients by outstanding balance
   - Unbilled cases queue (cases cleared but not yet invoiced)

2. INVOICE LIST:
   - Clean table: invoice #, client, amount, status, date, due date
   - Status pills: Draft, Sent, Paid, Overdue, Disputed
   - Quick filters: Overdue, This Week, This Month
   - Click to view invoice detail

3. INVOICE DETAIL:
   - Professional invoice layout (printable)
   - Line items with descriptions, quantities, rates
   - Subtotal, taxes, total
   - Payment status and history
   - "Send" and "Download PDF" buttons
   - Link back to the originating case

Commit as "feat: finance pages — AR dashboard, invoice list, invoice detail"
```

---

# Visual Polish & Animations

## Step D11: Micro-Interactions & Animations

```
Add subtle animations that make the app feel alive:

1. PAGE TRANSITIONS:
   - Subtle fade-in when navigating between pages (200ms)
   - Content slides up slightly on load

2. CARD INTERACTIONS:
   - Cards lift slightly on hover (translateY(-2px) + shadow increase)
   - Status badges have a subtle pulse when first appearing
   - Metric numbers count up briefly on dashboard load

3. LOADING STATES:
   - Skeleton loaders that match the shape of the actual content
   - Pulse animation on skeletons
   - Agent processing: animated dots or a small spinner with
     "AI is analyzing..." text

4. NOTIFICATIONS:
   - Toast notifications for actions (slide in from top right)
   - Success: green with checkmark
   - Error: red with X
   - Info: blue with info icon
   - Auto-dismiss after 5 seconds

5. STATUS CHANGES:
   - When a case status changes, the pipeline visualization
     animates the transition (dot fills in, line extends)
   - Brief confetti or checkmark animation when case reaches "cleared"

6. DATA UPDATES:
   - When new data arrives (new case, new task), brief highlight
     animation on the new row/card (yellow flash → fade to normal)

Don't overdo it — animations should be subtle and fast (150-300ms).
Anything longer feels sluggish.

Commit as "feat: micro-interactions — hovers, transitions, loading states, toasts"
```

---

## Step D12: Responsive & Mobile Polish

```
Make every page work beautifully on mobile:

1. BREAKPOINTS:
   - Mobile: < 640px (single column, stacked cards)
   - Tablet: 640px–1024px (some side-by-side, condensed sidebar)
   - Desktop: > 1024px (full layout)
   - Wide: > 1400px (extra whitespace, wider content)

2. MOBILE-SPECIFIC:
   - Sidebar becomes slide-over (implemented in D3)
   - Tables become card lists on mobile
   - Filters collapse into a "Filter" button that opens a modal
   - Case detail tabs become a scrollable horizontal strip
   - Document preview opens full-screen overlay
   - Action buttons are larger (minimum 44px touch targets)

3. TABLET-SPECIFIC:
   - Dashboard metrics: 2x2 grid instead of 4-in-a-row
   - Cases list: fewer columns, most important data only
   - Case detail: tabs stack into an accordion or scrollable tabs

4. TEST EVERY PAGE at 375px width (iPhone SE):
   - Dashboard
   - Cases list
   - Case detail (all tabs)
   - Tasks
   - Document upload
   - Login/signup
   - Client portal

No page should have horizontal scroll.
No text should be cut off.
No buttons should be unreachable.

Commit as "feat: responsive polish — mobile and tablet breakpoints"
```

---

# White-Label & Multi-Brokerage

## Step D13: White-Label System

```
Build the theming system so acquired brokerages see their own brand:

1. TENANT SETTINGS:
   - Add to tenant settings (jsonb): 
     * primary_color (hex)
     * secondary_color (hex)
     * logo_url (URL to logo image in Supabase Storage)
     * company_name (display name)
     * favicon_url (optional)

2. THEME APPLICATION:
   - On login, load tenant settings
   - Apply primary/secondary colors to CSS custom properties
   - Replace BizOS logo with tenant logo in sidebar
   - Replace page title with tenant company name
   - Client portal uses tenant branding exclusively

3. ADMIN THEME SETTINGS PAGE:
   - Color picker for primary and secondary colors
   - Logo upload
   - Live preview of how the sidebar and client portal will look
   - "Reset to default" button

4. FALLBACK:
   - If no tenant theme is set, use default BizOS theme
   - Logo falls back to "BizOS" text

Commit as "feat: white-label system — per-tenant branding"
```

---

## Step D14: Design Quality Audit

```
Final pass to ensure everything is visually consistent:

1. COLOR CONSISTENCY:
   - Check every status badge uses the correct status color
   - Check every priority badge uses the correct priority color
   - Check every AI confidence indicator uses the correct color
   - No hardcoded hex colors in components — all through design tokens

2. TYPOGRAPHY CONSISTENCY:
   - All page titles use the same size/weight
   - All card titles use the same size/weight
   - All body text is the same size
   - All timestamps use the same format
   - Case numbers always use mono font

3. SPACING CONSISTENCY:
   - All cards have the same padding
   - All sections have the same gap
   - All pages have the same side padding
   - No inconsistent margins

4. COMPONENT CONSISTENCY:
   - All buttons use the same border radius
   - All cards use the same shadow
   - All modals use the same overlay opacity
   - All tables use the same row height

5. ICON CONSISTENCY:
   - All icons are from lucide-react (no mixing icon sets)
   - All icons are the same size in the same context
   - All icons use the same stroke width

6. ACCESSIBILITY:
   - All text has sufficient contrast (WCAG AA minimum)
   - All interactive elements are keyboard accessible
   - All images/icons have alt text or aria-labels
   - Focus states are visible

Take screenshots of every page and component.
Output as docs/DESIGN_AUDIT.md with any issues found and fixes applied.

Commit as "feat: design quality audit — full consistency pass"
```

---

# Quick Reference: Component Patterns

## Consistent Card Pattern
```
- White background, rounded-xl (12px), shadow-sm
- 20px padding
- Optional colored left border (4px) for categorization
- Title in heading-3 size, bold
- Body in body size, muted color
- Actions at bottom right
```

## Consistent Badge Pattern
```
- Rounded-full, small padding (px-2.5 py-0.5)
- Font size: caption (12px)
- Font weight: medium
- Background: light tint of the status color
- Text: darker shade of the status color
- No borders
```

## Consistent Empty State Pattern
```
- Centered in the available space
- Large icon (48px, muted color)
- Heading: what's empty ("No cases found")
- Body: why it's empty or what to do next
- CTA button if applicable ("Create your first case")
```

## Consistent Loading Pattern
```
- Skeleton loaders matching content shape
- Pulse animation
- Same height as real content (no layout shift)
```

---

End of UI/UX Design Playbook
