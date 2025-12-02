# Architecture Guide - Understanding the System

## Overview

This system has 3 main parts that work together:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │ ───> │   Next.js   │ ───> │   FastAPI   │
│  (Frontend) │ <─── │  (Frontend) │ <─── │  (Backend)  │
└─────────────┘      └─────────────┘      └──────┬──────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │   MongoDB   │
                                           │  (Database) │
                                           └─────────────┘
```

## 1. Frontend (Next.js 16 + React 19)

**Location**: `frontend/` folder

### What it does:
- Shows the web interface you see in browser
- Displays network elements, metrics, and alerts
- Sends requests to backend API
- Updates in real-time

### Key Files:

#### `frontend/src/app/page.tsx` - Main Dashboard Page
```typescript
// This is what you see when you open http://localhost:3000
// It loads data and shows 3 components: Dashboard, ElementList, AlertPanel

'use client'  // Runs in browser, not server

import { useEffect, useState } from 'react'

export default function Home() {
  const [elements, setElements] = useState([])  // Stores network elements
  const [alerts, setAlerts] = useState([])      // Stores alerts
  
  useEffect(() => {
    loadData()  // Load data when page opens
    const interval = setInterval(loadData, 30000)  // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    // Fetch data from backend API
    const elementsData = await fetchElements()
    const alertsData = await fetchAlerts()
    setElements(elementsData.data)
    setAlerts(alertsData.data)
  }

  return (
    <main>
      <Dashboard elements={elements} />
      <ElementList elements={elements} />
      <AlertPanel alerts={alerts} />
    </main>
  )
}
```

#### `frontend/src/lib/api.ts` - API Communication
```typescript
// This file talks to the backend
import axios from 'axios'

const API_URL = 'http://localhost:8000'

// Get all network elements
export const fetchElements = async () => {
  const response = await axios.get(`${API_URL}/api/elements`)
  return response.data
}

// Create new element
export const createElement = async (data) => {
  const response = await axios.post(`${API_URL}/api/elements`, data)
  return response.data
}
```

#### `frontend/src/components/Dashboard.tsx` - Stats Display
```typescript
// Shows total, active, warning, inactive counts
export default function Dashboard({ elements }) {
  const stats = {
    total: elements.length,
    active: elements.filter(e => e.status === 'active').length,
    // ... more calculations
  }
  
  return (
    <div className="grid grid-cols-4 gap-6">
      <StatCard title="Total" value={stats.total} />
      <StatCard title="Active" value={stats.active} />
    </div>
  )
}
```

### How to Modify Frontend:

**Change colors:**
Edit `frontend/src/app/globals.css` or Tailwind classes in components

**Add new page:**
Create `frontend/src/app/newpage/page.tsx`

**Add new component:**
Create `frontend/src/components/MyComponent.tsx`

**Change refresh interval:**
In `page.tsx`, change `30000` (30 seconds) to your desired milliseconds

---

## 2. Backend (Python FastAPI)

**Location**: `backend/` folder

### What it does:
- Provides REST API endpoints
- Connects to MongoDB database
- Processes requests from frontend
- Executes network commands (we'll add this!)
- Sends real-time updates via WebSocket

### Key File: `backend/main.py`

#### Application Setup
```python
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient

# Create FastAPI app
app = FastAPI(
    title="Network Element Monitor API",
    description="API for monitoring network elements",
    version="1.0.0"
)

# Connect to MongoDB
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "network_monitor"
db_client = AsyncIOMotorClient(MONGODB_URL)
database = db_client[DATABASE_NAME]
```

#### Data Models (Pydantic)
```python
from pydantic import BaseModel
from datetime import datetime

class NetworkElement(BaseModel):
    name: str              # Router-01
    ip_address: str        # 192.168.1.1
    type: str              # Router, Switch, Firewall
    location: str          # Data Center A
    status: str            # active, warning, inactive
    created_at: datetime
```

#### API Endpoints

**GET /api/elements** - List all elements
```python
@app.get("/api/elements")
async def get_elements(status: Optional[str] = None):
    query = {"status": status} if status else {}
    elements = []
    async for element in database.network_elements.find(query):
        element["_id"] = str(element["_id"])
        elements.append(element)
    return {"success": True, "data": elements}
```

**POST /api/elements** - Create new element
```python
@app.post("/api/elements")
async def create_element(element: NetworkElement):
    element_dict = element.dict()
    element_dict["created_at"] = datetime.utcnow()
    result = await database.network_elements.insert_one(element_dict)
    return {"success": True, "id": str(result.inserted_id)}
```

**GET /api/elements/{id}** - Get single element
```python
@app.get("/api/elements/{element_id}")
async def get_element(element_id: str):
    from bson import ObjectId
    element = await database.network_elements.find_one({"_id": ObjectId(element_id)})
    if not element:
        raise HTTPException(status_code=404, detail="Element not found")
    return {"success": True, "data": element}
```

#### WebSocket for Real-time Updates
```python
class ConnectionManager:
    def __init__(self):
        self.active_connections = []
    
    async def broadcast(self, message):
        for connection in self.active_connections:
            await connection.send_json(message)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Send updates to all connected clients
```

### How Backend Works:

1. **Request comes in** → FastAPI receives it
2. **Validate data** → Pydantic checks if data is correct
3. **Database operation** → Motor (async MongoDB driver) queries/updates
4. **Response sent** → JSON data returned to frontend
5. **Broadcast update** → WebSocket notifies all connected clients

---

## 3. Database (MongoDB)

**Location**: Runs in Docker container

### Collections (like tables in SQL):

#### `network_elements`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Router-01",
  "ip_address": "192.168.1.1",
  "type": "Router",
  "location": "Data Center A",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### `metrics`
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "element_id": "507f1f77bcf86cd799439011",
  "metric_type": "cpu_usage",
  "value": 45.5,
  "unit": "percent",
  "timestamp": "2024-01-15T10:35:00Z"
}
```

#### `alerts`
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "element_id": "507f1f77bcf86cd799439011",
  "severity": "high",
  "message": "High CPU usage detected",
  "resolved": false,
  "created_at": "2024-01-15T10:36:00Z"
}
```

### MongoDB Operations:

```python
# Insert
await database.collection.insert_one(document)

# Find all
await database.collection.find({})

# Find with filter
await database.collection.find({"status": "active"})

# Find one
await database.collection.find_one({"_id": ObjectId(id)})

# Update
await database.collection.update_one(
    {"_id": ObjectId(id)},
    {"$set": {"status": "inactive"}}
)

# Delete
await database.collection.delete_one({"_id": ObjectId(id)})
```

---

## Data Flow Example

### User clicks "Refresh" button:

1. **Frontend** (`ElementList.tsx`):
   ```typescript
   <button onClick={onRefresh}>Refresh</button>
   ```

2. **Frontend** calls API (`api.ts`):
   ```typescript
   const data = await fetchElements()
   ```

3. **HTTP Request** sent:
   ```
   GET http://localhost:8000/api/elements
   ```

4. **Backend** receives request (`main.py`):
   ```python
   @app.get("/api/elements")
   async def get_elements():
   ```

5. **Backend** queries MongoDB:
   ```python
   elements = await database.network_elements.find({})
   ```

6. **MongoDB** returns data:
   ```json
   [{"_id": "...", "name": "Router-01", ...}]
   ```

7. **Backend** sends response:
   ```json
   {"success": true, "data": [...]}
   ```

8. **Frontend** updates state:
   ```typescript
   setElements(data.data)
   ```

9. **React** re-renders the table with new data

---

## File Structure Explained

```
network-element-monitor/
├── backend/                    # Python FastAPI backend
│   ├── main.py                # Main API file (all endpoints)
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Docker container config
│   └── .env.example           # Environment variables template
│
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # Next.js 13+ App Router
│   │   │   ├── page.tsx       # Main dashboard page
│   │   │   ├── layout.tsx     # Root layout wrapper
│   │   │   └── globals.css    # Global styles
│   │   ├── components/        # React components
│   │   │   ├── Dashboard.tsx  # Stats cards
│   │   │   ├── ElementList.tsx # Network elements table
│   │   │   └── AlertPanel.tsx  # Alerts sidebar
│   │   └── lib/
│   │       └── api.ts         # API client functions
│   ├── package.json           # Node.js dependencies
│   ├── next.config.js         # Next.js configuration
│   ├── tsconfig.json          # TypeScript configuration
│   ├── tailwind.config.js     # Tailwind CSS config
│   └── Dockerfile             # Docker container config
│
├── docker-compose.yml         # Orchestrates all services
├── README.md                  # Project overview
├── QUICKSTART.md              # Beginner guide
└── .gitignore                 # Files to ignore in git
```

---

## Key Technologies

### Frontend:
- **Next.js 16**: React framework with server/client components
- **React 19**: UI library for building interfaces
- **TypeScript**: JavaScript with type safety
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API calls

### Backend:
- **FastAPI**: Modern Python web framework
- **Motor**: Async MongoDB driver
- **Pydantic**: Data validation using Python type hints
- **Uvicorn**: ASGI server to run FastAPI
- **WebSockets**: Real-time bidirectional communication

### Database:
- **MongoDB**: NoSQL document database
- **Collections**: Like tables in SQL
- **Documents**: JSON-like objects

### DevOps:
- **Docker**: Containerization platform
- **Docker Compose**: Multi-container orchestration

---

## Next Steps

Now that you understand the architecture, let's add network device monitoring! Check out `NETWORK_MONITORING.md` for implementing actual router commands like `show ip int brief`.
