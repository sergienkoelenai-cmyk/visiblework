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
| v1.9.0  | Configurable effort coefficients (Low/Med/High) in Settings, manual minute-based duration per task |
| v1.8.1  | Allow fractional prices/base_rate (e.g. 0.75), rounded to 2 decimals |
| v1.8.0  | Dynamic task pricing: complexity + duration segmented controls, completion multiplier, global base_rate |
| v1.7.0  | Analytics page, pull-to-refresh, always-available task type |
| ≤ v1.6  | Earlier releases |
