# AgriSupport AI Phase 1 Postman Examples

Base URL:

`http://localhost:5000/api`

## 1. Register Farmer

`POST /auth/register`

```json
{
  "fullName": "Aline Uwase",
  "email": "aline@agrisupport.rw",
  "phone": "+250788123456",
  "password": "Farmer@123",
  "region": "Kigali City",
  "district": "Kicukiro District",
  "sector": "Gatenga Sector",
  "experienceLevel": "Intermediate",
  "primaryCrop": "Maize"
}
```

## 2. Login

`POST /auth/login`

```json
{
  "email": "farmer@agrisupport.rw",
  "password": "Farmer@123"
}
```

## 3. Get Current User

`GET /auth/me`

Header:

`Authorization: Bearer <token>`

## 4. Create Farm

`POST /farms`

```json
{
  "farmName": "Nyamata Field A",
  "province": "Eastern Province",
  "district": "Bugesera District",
  "sector": "Nyamata Sector",
  "latitude": -2.1456,
  "longitude": 30.1042,
  "farmSize": 1.8,
  "farmSizeUnit": "hectares",
  "landType": "Rainfed",
  "soilType": "Sandy Loam",
  "currentCrop": "Beans",
  "cropStage": "Planting",
  "ownershipType": "Leased"
}
```

## 5. Add Crop History

`POST /farms/<farmId>/crop-history`

```json
{
  "cropName": "Beans",
  "season": "Season B",
  "year": 2026,
  "yieldAmount": 2.1,
  "yieldUnit": "tons/ha",
  "challenges": "Irregular rainfall",
  "notes": "Applied mulching and drip support."
}
```

## 6. Approve Farmer

`PUT /farmers/<farmerProfileId>/approve`

```json
{
  "reason": "Profile reviewed and documents accepted."
}
```

## 7. Reject Farmer

`PUT /farmers/<farmerProfileId>/reject`

```json
{
  "reason": "Phone number mismatch with submitted registration details."
}
```
