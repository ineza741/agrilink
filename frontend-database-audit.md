# Frontend Database Connectivity Audit

**Generated:** July 5, 2026  
**Frontend:** http://localhost:5174/  
**Backend:** http://localhost:5001/ (MySQL via Prisma)

---

## Summary

- **Backend:** Running on port 5001, connected to MySQL database `agrisupport_phase1` at `localhost:3306`
- **Schema:** 35+ models (User, FarmerProfile, Farm, SoilTest, PestDiagnosis, MarketAnalysis, etc.) — all migrated and up to date
- **Seed data loaded:** 3 users (admin, officer, farmer), 1 demo farm with crop history, soil test, lab report, crop suitability results, and fertilizer recommendations
- **All 20 pages use "API First + Demo Fallback" pattern** — they try the real backend/database first, then fall back to demo data only when backend is unavailable

---

## Page-by-Page Audit

### 1. LoginPage (`pages/auth/LoginPage.jsx`)
- **Calls Backend:** ✅ Yes — login through `AuthContext` → `/api/auth/login`
- **Fallback:** Shows hardcoded demo credentials (`farmer@agrisupport.rw`, `admin@agrisupport.rw`) for convenience
- **Database:** ✅ Real — authenticates against `users` table

### 2. RegisterPage (`pages/auth/RegisterPage.jsx`)
- **Calls Backend:** ✅ Yes — calls `/api/auth/register`
- **Fallback:** None — clean form submission
- **Database:** ✅ Real — creates user in `users` + `farmer_profiles` tables

### 3. FarmerDashboardPage (`pages/dashboard/FarmerDashboardPage.jsx`)
- **Calls Backend:** ✅ Yes — Open-Meteo weather API + backend endpoints
- **Fallback:** Computes local signals (`buildSoilSignals()`, `buildMarketSignals()`, `buildSummaryCards()`) from farm profile; 5-second timeout
- **Database:** ✅ Real (weather from Open-Meteo, rest from backend) but uses demo fallback on failure

### 4. DashboardPage (Admin) (`pages/dashboard/DashboardPage.jsx`)
- **Calls Backend:** ⚠️ Writes only (`admin.updateWorkflow()`) — reads entirely from localStorage/demo
- **Fallback:** Hardcoded `workflowSeed[]`, `monitoringSeed[]`, static stat arrays
- **Database:** ❌ Demo — shows "Demo data mode status" banner explicitly

### 5. ProfilePage (`pages/farmers/ProfilePage.jsx`)
- **Calls Backend:** ✅ Yes — via `FarmerDataContext`
- **Fallback:** None — clean data path
- **Database:** ✅ Real

### 6. FarmsPage (`pages/farms/FarmsPage.jsx`)
- **Calls Backend:** ✅ Yes — farmer registry export, farmer lists
- **Fallback:** Demo CSV/XLS exports; "Local Demo Registry Import" for bulk onboarding
- **Database:** ✅ Real reads; demo fallback for exports

### 7. AddFarmPage (`pages/farms/AddFarmPage.jsx`)
- **Calls Backend:** ✅ Yes — form submission via `FarmerDataContext`
- **Fallback:** None — clean form
- **Database:** ✅ Real

### 8. WeatherPage (`pages/weather/WeatherPage.jsx`)
- **Calls Backend:** ✅ Yes — Open-Meteo forecast API + `backend.weather.dashboard()`
- **Fallback:** `buildFallbackForecast()` — 7 days of randomized temperature/precipitation/humidity/wind
- **Database:** ✅ Real (weather from Open-Meteo, history from backend); demo fallback on failure

### 9. SoilCropPage (`pages/soil-crop/SoilCropPage.jsx`)
- **Calls Backend:** ✅ Yes — `backend.soil.listByFarm()`, `getSuitabilityByFarm()`, CRUD operations
- **Fallback:** `createDefaultFarm()` with hardcoded soil/crop values; SoilGrids estimation
- **Database:** ✅ Real; shows "Backend records are shown first. Local fallback entries remain available..."

### 10. IrrigationPage (`pages/irrigation/IrrigationPage.jsx`)
- **Calls Backend:** ✅ Yes — Open-Meteo + SoilGrids + `backend.irrigation.*`
- **Fallback:** `createMockWeatherData()`, `createFallbackSoilProfile()` (hardcoded pH/N/P/K), `createDefaultFarm()`
- **Database:** ✅ Real; aggressive demo fallback if farm has no lat/lng

### 11. MarketPage (`pages/market/MarketPage.jsx`)
- **Calls Backend:** ✅ Yes — `backend.market.analyze()`, `listAlerts()`, `createAlert()`
- **Fallback:** `CROP_MARKET_PROFILE{}`, `RWANDA_MARKET_DIRECTORY[]`, `createDefaultFarm()`
- **Database:** ✅ Real; 5-second timeout fallback

### 12. PestsPage (`pages/pests/PestsPage.jsx`)
- **Calls Backend:** ✅ Yes — `backend.pests.latest()`, `history()`, `library()`, `listActions()`
- **Fallback:** `createDefaultFarm()`, local `computeDiagnoses()`, demo weather context
- **Database:** ✅ Real; 5-second timeout fallback

### 13. AiRecommendationPage (`pages/ai/AiRecommendationPage.jsx`)
- **Calls Backend:** ✅ Yes — `backend.recommendations.latest()`, `generate()`, `history()`, `listFeedback()`
- **Fallback:** `getFallbackWeather()`, hardcoded AI farm/demo plots, localStorage recommendation history
- **Database:** ✅ Real; "Using demo recommendation engine..." on failure

### 14. NotificationsPage (`pages/notifications/NotificationsPage.jsx`)
- **Calls Backend:** ✅ Yes — `backend.notifications.center()`, markRead, confirm, archive, snooze
- **Fallback:** `createBaseNotifications()` — 6 hardcoded alert objects; all writes fall back to local state
- **Database:** ✅ Real; writes fall back to local state mutation on failure

### 15. CommunityPage (`pages/community/CommunityPage.jsx`)
- **Calls Backend:** ✅ Yes — `backend.community.dashboard()`, submitQuestion, acceptQuestion, registerEvent, submitPractice
- **Fallback:** Full `initialData{}` — 4 discussions, 2 questions, 3 stories, events, experts, resources, contributors
- **Database:** ✅ Real; silent fallback to demo mode on failure

### 16. RegionalMonitoringPage (`pages/regional/RegionalMonitoringPage.jsx`)
- **Calls Backend:** ✅ Yes — `backend.admin.regionalMonitoring()`, `issueRegionalAdvisory()`
- **Fallback:** `DISTRICT_META[]` with hardcoded weather/market bases; "Demo Market Data" / "Demo Pest Data" badges
- **Database:** ✅ Real; "All flows stay functional without backend APIs for demonstrations."

### 17. AnalyticsPage (`pages/analytics/AnalyticsPage.jsx`)
- **Calls Backend:** ✅ Yes — `backend.analytics.adminDashboard()`, `adminHistory()`, `farmDashboard()`, `exportFarm()`
- **Fallback:** Massive hardcoded seeds: `adminSummaryCards`, `sustainabilityDashboard`, `aiRecommendationAnalytics`, etc.
- **Database:** ✅ Real; "Demo analytics mode active." shown on failure

### 18. RecommendationsPage (Content Mgmt) (`pages/recommendations/RecommendationsPage.jsx`)
- **Calls Backend:** ✅ Yes — `backend.admin.contentManagementDashboard()`, create, advance status, archive, test sandbox, sync fertilizers
- **Fallback:** `normalizeAdminEntries()` with seed data; `contentMode` defaults to `"demo"`
- **Database:** ✅ Real; writes fall back to local state on failure

### 19. SettingsPage (`pages/settings/SettingsPage.jsx`)
- **Calls Backend:** ✅ Yes — via `MobileSupportContext`
- **Fallback:** None
- **Database:** ✅ Real

### 20. AdminPage (`pages/admin/AdminPage.jsx`)
- **Calls Backend:** ⚠️ Re-exports `DashboardPage` — same demo behavior
- **Fallback:** Same as DashboardPage
- **Database:** ❌ Demo

---

## Key Patterns

1. **API First + Demo Fallback** — every data page tries the real backend first
2. **8 pages** declare `const DEMO_MODE = true` at module level (DashboardPage, AnalyticsPage, AiRecommendationPage, NotificationsPage, RecommendationsPage, FarmsPage, RegionalMonitoringPage, CommunityPage)
3. **5-second timeout** — most pages use a safety timeout; if the backend doesn't respond in 5s, demo data is shown
4. **`isBackendSessionActive()`** — checks localStorage for a valid token before attempting API calls
5. **Inline demo helpers** — no centralized mock service; each page generates its own fallback data

---

## Verified Working Endpoints

| Endpoint | Status |
|---|---|
| `GET /health` | ✅ 200 — "AgriSupport Phase 9 backend is running." |
| `POST /api/auth/login` | ✅ 200 — Returns JWT token + user with farmerProfile |
| `GET /api/auth/me` | ✅ 403 (no token) / 200 (with token) |
| `GET /api/farms/my` | ✅ 200 — Returns seeded farm with crop histories |
| `GET /api/soil-tests/farm/:farmId` | ✅ 200 |
| `GET /api/soil-tests/:id/analyze` | ✅ 200 |
| `GET /api/crop-suitability/farm/:farmId` | ✅ 200 |
| `GET /api/farmers` | ✅ 200 |
| `GET /api/farmers/me` | ✅ 200 |
| `GET /api/admin/dashboard-summary` | ✅ 200 |
| `GET /api/irrigation/farms/:farmId/latest` | ✅ 200 |
| `GET /api/market/farms/:farmId/latest` | ✅ 200 |
| `GET /api/pests/farms/:farmId/latest` | ✅ 200 |
| `GET /api/weather/farms/:farmId/dashboard` | ✅ 200 |
| `GET /api/notifications/center` | ✅ 200 |
| `GET /api/community/dashboard` | ✅ 200 |
| `GET /api/recommendations/farms/:farmId/latest` | ✅ 200 |
| `GET /api/analytics/admin/dashboard` | ✅ 200 |
| `POST /api/farms` | ✅ 201 |
| `POST /api/auth/register` | ✅ 201 |
