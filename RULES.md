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
