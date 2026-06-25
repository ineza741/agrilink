# AgriSupport AI Phase 1 Frontend Integration Plan

## Goal

Integrate the existing React frontend gradually without removing local demo mode.

## Environment

Frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_DEMO_MODE=true
```

## API Client Plan

Create or update `frontend/src/services/apiClient.js` with:

- `get`
- `post`
- `put`
- `delete`
- JWT token storage
- request interceptor for `Authorization`
- fallback to localStorage/demo data when API is unavailable

## Backend Database

This Phase 1 backend now targets MySQL.

## Phase 1 Replacement Order

1. Auth screens
   - register
   - login
   - get current user
2. Farmer Profile page
   - `GET /api/farmers/me`
   - `PUT /api/farmers/me`
3. Farm registration / farm management
   - `POST /api/farms`
   - `GET /api/farms/my`
   - `PUT /api/farms/:id`
   - `DELETE /api/farms/:id`
4. Crop history
   - `GET /api/farms/:farmId/crop-history`
   - `POST /api/farms/:farmId/crop-history`
5. Admin farmer workflow
   - `GET /api/farmers`
   - `GET /api/admin/pending-farmers`
   - approval / rejection / deactivate / reactivate

## Frontend Fallback Rule

If `VITE_DEMO_MODE=true`:

- try backend first
- if backend fails, use localStorage/demo data
- show subtle label: `Demo fallback active`

## Data Mapping

### Auth response

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "uuid",
      "fullName": "Rodrigue Farmer",
      "email": "farmer@agrisupport.rw",
      "phone": "+250788100003",
      "role": "Farmer",
      "farmerProfile": {}
    }
  }
}
```

### Farm response

Use API farms as the source of truth when available, and only sync localStorage if you intentionally want offline caching.
