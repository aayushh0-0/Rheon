# RHEON AI - Frontend Design System

Documented as part of Phase 0 Frontend Design Audit for RHEON AI.

## 1. Brand Identity
- **Visual Personality**: High-precision emergency healthcare intelligence & clinical coordination network designed for Delhi NCR.
- **Background & Canvas**: Muted sage canvas (`#9EB8B6`), soft pale shells (`#F0F8F7`), crisp white cards (`#FFFFFF`).
- **Primary Colors**: Deep Teal (`#063D3F`), Teal Brand (`#0d9488` / `#063D3F`), Inverted Ink (`#092C2D`).
- **Accent Colors**: Pastel Mint (`#DEF2EE`), Pastel Rose (`#FCEAEB`), Crimson (`#C62828`) for alerts and emergency blood actions.

## 2. Typography
- **Font Families**: Sans: `'Plus Jakarta Sans'`, `Inter`, system-ui, sans-serif; Mono: `'JetBrains Mono'`, monospace.
- **Font Loading**: Loaded via Google Fonts (`Plus Jakarta Sans` and `JetBrains Mono`).
- **Hierarchy**:
  - Headings: `font-black` / `font-bold`, tracking tight, color `ink-primary` (`#092C2D`).
  - Body & Descriptions: `text-xs` to `text-sm`, color `ink-secondary` (`#6F7F80`).
  - Numerical / Metrics: Bold or black display numbers with supporting unit labels.

## 3. Design Tokens (Tailwind Configuration)
- **Colors**:
  - `canvas.sage`: `#9EB8B6`
  - `shell.bg`: `#F0F8F7`, `shell.card`: `#FFFFFF`, `shell.border`: `#E1ECE9`
  - `teal.brand`: `#063D3F` (or `#0d9488`), `teal.muted`: `#E6F2F0`
  - `ink.primary`: `#092C2D`, `ink.secondary`: `#6F7F80`
- **Spacing & Borders**:
  - Border Radius: `rounded-2xl` (16px), `rounded-3xl` (24px), `rounded-4xl` (32px), `rounded-full`.
  - Shadows: `shadow-card`, `shadow-shell`, `shadow-pill`.
- **Transitions**: Standard Tailwind `transition-all` and `duration-300` fade-in animations.

## 4. Application Shell
- **Sidebar**: Fixed/collapsible deep teal navigation panel (`PatientShell`, `VerifierShell`, `AppShell`) with active state indicators and role-based tabs.
- **Header**: Top command bar with user profile, status pills, and quick action buttons.
- **Content Area**: Fluid container with max-width or full width grid layouts, padded with generous rounded white card containers (`rounded-3xl`).

## 5. Component Design
- **KPI Cards**: White background, 24px rounded corners (`rounded-2xl`), border `#E1ECE9`, shadow card, with prominent metric values and icon badges.
- **Buttons**: Pill-shaped or rounded-xl buttons with deep teal or teal-brand backgrounds, hover states, and iconography from `lucide-react`.
- **Inputs & Forms**: Rounded-xl border `#E1ECE9`, white background, focus ring with teal accent.
- **Status Badges**: Rounded-full badges with pastel backgrounds (emerald for normal, amber/rose for alerts).

## 6. Chart and Graph Design
- **Chart Library**: Custom SVG line/bar/donut charts paired with Responsive SVG viewboxes and Tailwind color scales.
- **Colors**: Deep teal strokes (`#0d9488`), emerald reference ranges, pastel mint fills (`#DEF2EE`).
- **Layout**: Multi-card analytical dashboard grid with aligned headers and metrics.

## 7. Responsive Design
- **Breakpoints**: Standard Tailwind breakpoints (`sm`, `md`, `lg`, `xl`).
- **Layouts**: Flex/grid layouts that stack vertically on mobile and expand to multi-column grids on desktop.

## 8. Existing Component Inventory
- `AppShell.tsx`: Main administrative layout shell.
- `PatientShell.tsx`: Patient portal navigation and tab container.
- `HealthOverview.tsx`: Patient command center KPI and summary view.
- `UploadReportView.tsx`: OCR report upload and ingestion dropzone.
- `ReportAnalysisView.tsx`: Extracted parameter verification and AI explanations.
- `HealthTrends.tsx`: Longitudinal charts and biomarker trajectory tracking.
- `MedicalHistory.tsx`: Chronological archive and search ledger.
- `DownloadableReportsView.tsx`: PDF summary export and hospital map integration.

## 9. Design Preservation Rules
1. Never introduce a competing design system.
2. Preserve font families (`Plus Jakarta Sans`) and color tokens (`#063D3F`, `#9EB8B6`, `#F0F8F7`).
3. Reuse existing UI cards, buttons, badges, and modals.
4. Maintain existing emergency blood coordination workflows untouched.
