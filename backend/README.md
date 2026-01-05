# 🚌 Dubai Transit API

Dubai Bus aur Metro ka Offline-First API. Postman se test kar sakte ho.

## 🚀 Quick Start

```bash
# 1. Database seed karo (Sample data)
npm run seed

# 2. Server start karo
npm start
```

Server chalega: `http://localhost:3000`

---

## 📋 API Endpoints (Postman Ke Liye)

### Health Check

```
GET http://localhost:3000/
```

---

### 🚌 BUS APIs

#### Get All Buses

```
GET http://localhost:3000/api/bus
```

#### Search Bus by Number

```
GET http://localhost:3000/api/bus/search?q=X28
GET http://localhost:3000/api/bus/search?q=8
GET http://localhost:3000/api/bus/search?q=E100
```

#### Get Bus Details (with Directions)

```
GET http://localhost:3000/api/bus/X28
GET http://localhost:3000/api/bus/8
```

#### Get Bus Stops (Direction Specific)

```
# All stops for bus (first direction)
GET http://localhost:3000/api/bus/X28/stops

# Specific direction (0 = one way, 1 = return)
GET http://localhost:3000/api/bus/X28/stops?direction=0
GET http://localhost:3000/api/bus/X28/stops?direction=1
```

---

### 🚇 METRO APIs

#### Get All Metro Lines

```
GET http://localhost:3000/api/metro
```

#### Get Metro Line Details

```
GET http://localhost:3000/api/metro/Red
GET http://localhost:3000/api/metro/Green
```

#### Get Metro Stations

```
GET http://localhost:3000/api/metro/Red/stations?direction=0
GET http://localhost:3000/api/metro/Green/stations
```

---

### 🔍 SEARCH APIs (Journey Planner)

#### Search Stops by Name

```
GET http://localhost:3000/api/search/stops?q=gold
GET http://localhost:3000/api/search/stops?q=burj
GET http://localhost:3000/api/search/stops?q=marina
```

#### Find Route (A to B)

```
# From Gold Souq to Burj Khalifa
GET http://localhost:3000/api/search/route?from=B_GSOUQ&to=M_BUR

# From Al Ghubaiba to Abu Dhabi
GET http://localhost:3000/api/search/route?from=B_GHU&to=B_ABU

# From Union to Mall of Emirates
GET http://localhost:3000/api/search/route?from=M_UNI&to=M_MOE
```

#### Find All Routes Passing a Stop

```
GET http://localhost:3000/api/search/stop/M_BUR/routes
GET http://localhost:3000/api/search/stop/M_UNI/routes
```

---

## 📊 Sample Stop IDs (For Testing)

| Stop ID | Name                          |
| ------- | ----------------------------- |
| M_RAS   | Rashidiya Metro               |
| M_UNI   | Union Metro                   |
| M_BUR   | Burj Khalifa Metro            |
| M_MOE   | Mall of Emirates Metro        |
| M_MAR   | Dubai Marina Metro            |
| M_IBN   | Ibn Battuta Metro             |
| M_GLD   | Gold Souq Metro               |
| B_GHU   | Al Ghubaiba Bus Station       |
| B_GSOUQ | Gold Souq Bus Station         |
| B_ABU   | Abu Dhabi Central Bus Station |

---

## 🛠️ Tech Stack

- Node.js + Express
- SQLite (better-sqlite3)
- CORS enabled

## 📁 Folder Structure

```
backend/
├── server.js           # Main Express server
├── db/
│   ├── database.js     # SQLite helper
│   └── dubai_transit.db # Database file
├── routes/
│   ├── bus.routes.js   # Bus API endpoints
│   ├── metro.routes.js # Metro API endpoints
│   └── search.routes.js # Search & Journey Planner
└── scripts/
    └── seed-database.js # Sample data seeder
```
