# City & Neighborhood API Integration Guide
> **Feature:** Dynamic City & Neighborhood Filtering (Only Real/Active Listings)  
> **Base URL:** `https://api.shabbosrent.com` (or local `http://localhost:5000`)  
> **Prefix:** `/api/v1/apartment`  
> **Auth:** Public / No Bearer token required

---

## 1. Overview & Business Rules

1. **City List (`/cities`):** Only returns cities that currently have **at least one active, confirmed listing** (`status = 'CONFIRMED'`, `isActive = true`). Cities without active listings will never be returned.
2. **Neighborhood List (`/neighborhoods?city=...`):** Linked directly to the selected city. When `city` query param is provided, it returns **only the neighborhoods inside that specific city** that have active listings.

---

## 2. API Endpoints

### 2.1 Get Listed Cities

Returns an array of unique city names with active listings.

#### Request
- **Method:** `GET`
- **URL:** `/api/v1/apartment/cities`
- **Headers:**
  ```http
  Accept: application/json
  ```

#### cURL Example
```bash
curl -X GET "https://api.shabbosrent.com/api/v1/apartment/cities" \
  -H "Accept: application/json"
```

#### Success Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Listed cities retrieved successfully",
  "data": [
    "Jerusalem",
    "Tel Aviv",
    "Safed",
    "Tiberias",
    "Haifa",
    "Netanya"
  ]
}
```

---

### 2.2 Get Listed Neighborhoods (by City)

Returns an array of unique neighborhood names for a given city that have active listings.

#### Request
- **Method:** `GET`
- **URL:** `/api/v1/apartment/neighborhoods`
- **Query Parameters:**
  | Parameter | Type | Required | Description | Example |
  | :--- | :--- | :--- | :--- | :--- |
  | `city` | `string` | Optional | Filter neighborhoods by city name (case-insensitive) | `Jerusalem` |

- **Headers:**
  ```http
  Accept: application/json
  ```

#### cURL Examples
```bash
# 1. Get neighborhoods for a specific selected city (Recommended for dropdowns)
curl -X GET "https://api.shabbosrent.com/api/v1/apartment/neighborhoods?city=Jerusalem" \
  -H "Accept: application/json"

# 2. Get all active neighborhoods across all cities
curl -X GET "https://api.shabbosrent.com/api/v1/apartment/neighborhoods" \
  -H "Accept: application/json"
```

#### Success Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Listed neighborhoods retrieved successfully",
  "data": [
    "Bayit VeGan",
    "Geula",
    "Mea Shearim",
    "Ramat Eshkol",
    "Rehavia",
    "Talbiya"
  ]
}
```

#### Empty Neighborhood Response (`200 OK`)
*(When a city has listings but no specific neighborhood defined)*
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Listed neighborhoods retrieved successfully",
  "data": []
}
```

---

## 3. Applying City & Neighborhood to Apartment Search

When the user selects a city and neighborhood from the dropdowns, pass them to the search endpoint:

#### Request
- **Method:** `GET`
- **URL:** `/api/v1/apartment`
- **Query Parameters:**
  | Parameter | Type | Required | Example |
  | :--- | :--- | :--- | :--- |
  | `city` | `string` | Optional | `Jerusalem` |
  | `neighborhood` | `string` | Optional | `Geula` |
  | `page` | `number` | Optional | `1` |
  | `limit` | `number` | Optional | `10` |

- **Headers:**
  ```http
  Accept: application/json
  ```

#### cURL Example
```bash
curl -X GET "https://api.shabbosrent.com/api/v1/apartment?city=Jerusalem&neighborhood=Geula&page=1&limit=10" \
  -H "Accept: application/json"
```

#### Success Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Apartments retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 6,
    "totalPage": 1
  },
  "data": [
    {
      "id": "apt-uuid-1",
      "propertyId": "apart-001",
      "title": "Spacious Geula Apartment for Shabbat",
      "city": "Jerusalem",
      "neighborhood": "Geula",
      "pricePerShabbat": 1200,
      "bedrooms": 3,
      "bathrooms": 2,
      "maxGuest": 6,
      "status": "CONFIRMED"
    }
  ]
}
```

---

## 4. Error Responses

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "success": false,
  "message": "Something went wrong while fetching locations",
  "errorMessages": [
    {
      "path": "",
      "message": "Database connection error"
    }
  ]
}
```
