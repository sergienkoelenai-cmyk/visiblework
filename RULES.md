# VisibleWork — Project Rules

## Versioning

**Always bump the app version on every deploy.**

The version is displayed in the app at the bottom of the Settings screen.

### Where to update
1. `src/components/SettingsPage.jsx` — the visible string, e.g. `VisibleWork v1.8.0`
2. `package.json` — the `"version"` field (keep in sync for reference)

### Versioning scheme
Use **semantic versioning** (`MAJOR.MINOR.PATCH`):
- **MINOR** bump (e.g. `1.7 → 1.8`) for new features or significant refactors
- **PATCH** bump (e.g. `1.8.0 → 1.8.1`) for bug fixes and small tweaks
- **MAJOR** bump for breaking changes or full rewrites

### Version history
| Version | Change |
|---------|--------|
| v2.9.0  | Netflix-Style Family Multi-Account Support: Active profile context with persistent localStorage & top-bar switcher modal, per-user favourites grid (favoritedBy), task scope selector (🌐 Household vs 👤 Personal), and shared family analytics & earnings transparency |
| v2.8.0  | FavouriteGridCard alignment & border polish: 2-line title clamp for uniform row heights, justify-content: space-between replaces margin-top: auto, white #FFFFFF background with 1px #E6F4D7 lime border and shadow-sm, meta nowrap truncation protects price badge |
| v2.7.9  | Favourites Ultra-Dense Grid: removed separate top price row from FavouriteGridCard; title starts at top of cell, combined footer row (meta left / price right), tighter padding 6px/8px, grid gap 6px, price font 10px |
| v2.7.8  | Favourites Compact 2-Column Grid: new FavouriteGridCard component (calc(50%-4px) width, F8FAFC cells, inline emoji+title 3-line clamp, gold price top-right, lime meta badge 👤), flex-wrap grid container #FFFFFF/#F4FCE3; removed icon blocks and checkboxes |
| v2.7.7  | Favourites Section Redesign: new FavouriteDashboardRow component (multi-line title, lime meta badge 👤 Who•When, gold price pill min-width 54px, lime checkmark circle button), section header shows count ⭐ FAVORITES (N), white card container #F4FCE3 border, deep lime label #4D7C0F |
| v2.7.6  | Category Accordion Visual Hierarchy & Sub-task Nesting: bold 16px/700 parent headers, ▾/▸ chevrons, lime count badges (#F4FCE3/#4D7C0F) on Home, coral (#FB7185) on Settings; inset nested containers with left border guide line (BEF264 lime / FB7185 coral), F8FAFC fill; FavoriteTaskCard isNested prop with 14px/500 title, compact gold reward pill (#FEF3C7/#D97706) |
| v2.7.5  | Master Home Screen Lime Accent System & Bottom Layout Polish: Unified signature Lime palette (#84CC16 / #F7FEE7 / #F4FCE3 / #4D7C0F), rounded floating cards (#FFFFFF, 20px radius, subtle border #ECFDF5), 44px category touch rows, warm ochre prices (#D97706), and HomeFooter clearance |
| v2.7.4  | Styled Analytics screen Back button as sky-blue soft pill [ ← Back ] matching Settings screen design, and renamed app title everywhere to 'Visible Work' |
| v2.7.3  | Analytics refinement: remove task-level 'Edit Task' button, add ⚙️ Settings icon to Analytics header, and dynamically recalculate TOTAL PAYOUT & TOTAL TIME banner per selected family member |
| v2.7.2  | Add real-time task search to Settings screen: expandable header search bar, auto-focus, real-time category task filtering & auto-expanding cards, and search filtering in ArchivedTasksSection |
| v2.7.1  | Fix CSS syntax bug: restore missing closing brace on @keyframes toastSlideUp in App.css, resolving app-wide CSS parsing truncation and styling breakage |
| v2.7.0  | Master Home Screen Search with Multi-Pool Coverage: Header 🔍 trigger button, expandable auto-focus search bar, useTaskSearch multi-pool hook, origin badges (🔥 Feat Pool, ⭐ Favorite, 📁 Category), and direct completion action |
| v2.6.3  | Home Screen Bottom Section & Footer Polish: White floating cards for Categories and Upcoming Tasks, 44px min-height touch targets, subtle uppercase section labels, and HomeFooter anchor |
| v2.6.2  | Collapsed ArchivedTasks section by default, renamed button to 'Edit', removed price from archived items, and ensured user completions/rewards are preserved when tasks are deleted |
| v2.6.1  | Fix ArchivedTasks filter logic: strictly exclude active recurring tasks from archive, showing only completed one-off tasks and recurring tasks that reached their END date |
| v2.6.0  | Master Settings Overhaul & Archive: Warm Coral design system, CategorySettingCard accordions, ArchivedTasksSection (60-day auto-cleanup & Edit/Restore mechanics), and bottom Account Sign Out section |
| v2.5.3  | Code audit & quality refactor: safe completionDate conversion in scheduler, missing onUndoCompletion handler in Settings view, category validation feedback, and clean helper exports |
| v2.5.2  | Frameless categories and framed expanded task container in Settings screen (matching Home screen style); PWA skipWaiting update |
| v2.5.0  | Redesign CreateTaskModal to single-screen high-density layout with progressive disclosure (collapsible schedule & description, inlined reward cost) |
| v2.4.2  | Remove green check mark buttons from task cards; reduce gap between categories items in Settings to 2px |
| v2.4.1  | Standardize all task cards to high-density FavoriteTaskCard style; remove 'Due today' header above Favorites |
| v2.4.0  | Refactored task completion sheet (compact avatars, backdated completion date selector: Today / Yesterday / Custom) |
| v2.3.0  | High-density FavoriteTaskCard component (removes redundant labels/badges, ~40-50% height reduction for mobile) |
| v2.2.0  | Critical Tasks flag (`is_critical`) & "Critical Focus" prominent dashboard block for due/overdue critical tasks |
| v2.1.1  | Make Tasks section first in Settings, rename Manage Categories to Categories, move Add buttons inside expanded sections |
| v2.1.0  | Make Settings screen sections (Economy, Family, Categories) and task categories collapsible |
| v2.0.3  | Allow clearing custom recurrence interval (repeat every N days/weeks) and occurrence count fields to empty |
| v2.0.2  | Fix missing baseRate and complexityMultipliers props on TaskForm when editing tasks from Settings view |
| v2.0.1  | Allow clearing price/duration inputs to empty state during editing; allow 0 price and 0 duration |
| v2.0.0  | Feats & Random Task Generator (availability guard, capacity filter, recency weighting, & Feat tags) |
| v1.9.1  | Fix missing React/useState imports in TaskForm preventing task modal from opening |
| v1.9.0  | Configurable effort coefficients (Low/Med/High) in Settings, manual minute-based duration per task |
| v1.8.1  | Allow fractional prices/base_rate (e.g. 0.75), rounded to 2 decimals |
| v1.8.0  | Dynamic task pricing: complexity + duration segmented controls, completion multiplier, global base_rate |
| v1.7.0  | Analytics page, pull-to-refresh, always-available task type |
| ≤ v1.6  | Earlier releases |
