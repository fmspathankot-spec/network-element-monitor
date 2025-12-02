# Modification Guide - How to Customize Everything

This guide shows you exactly how to modify different parts of the system.

## Table of Contents
1. [Change Colors and Styling](#1-change-colors-and-styling)
2. [Add New API Endpoint](#2-add-new-api-endpoint)
3. [Add New Database Collection](#3-add-new-database-collection)
4. [Add New Frontend Page](#4-add-new-frontend-page)
5. [Add New Component](#5-add-new-component)
6. [Modify Existing Component](#6-modify-existing-component)
7. [Add Scheduled Tasks](#7-add-scheduled-tasks)
8. [Add Authentication](#8-add-authentication)

---

## 1. Change Colors and Styling

### Change Dashboard Card Colors

**File**: `frontend/src/components/Dashboard.tsx`

**Current**:
```typescript
<StatCard title="Total Elements" value={stats.total} color="bg-blue-500" />
<StatCard title="Active" value={stats.active} color="bg-green-500" />
```

**Change to**:
```typescript
<StatCard title="Total Elements" value={stats.total} color="bg-purple-500" />
<StatCard title="Active" value={stats.active} color="bg-teal-500" />
```

### Change Background Color

**File**: `frontend/src/app/page.tsx`

**Current**:
```typescript
<main className="min-h-screen p-8 bg-gray-50">
```

**Change to**:
```typescript
<main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
```

### Add Custom CSS

**File**: `frontend/src/app/globals.css`

**Add**:
```css
.custom-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
}

.pulse-animation {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 2. Add New API Endpoint

### Example: Add "Device Reboot" Endpoint

**File**: `backend/main.py`

**Add this**:

```python
# 1. Create Pydantic model (if needed)
class RebootRequest(BaseModel):
    element_id: str
    scheduled_time: Optional[datetime] = None
    reason: str

# 2. Add endpoint
@app.post("/api/device/reboot")
async def reboot_device(request: RebootRequest):
    """
    Schedule or execute device reboot
    """
    from bson import ObjectId
    
    # Get device from database
    element = await database.network_elements.find_one(
        {"_id": ObjectId(request.element_id)}
    )
    
    if not element:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Log the reboot request
    reboot_log = {
        "element_id": request.element_id,
        "device_name": element["name"],
        "scheduled_time": request.scheduled_time or datetime.utcnow(),
        "reason": request.reason,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await database.reboot_logs.insert_one(reboot_log)
    
    # Here you would actually execute the reboot command
    # device = create_device_connection(...)
    # device.execute_command("reload")
    
    return {
        "success": True,
        "message": f"Reboot scheduled for {element['name']}",
        "reboot_id": str(result.inserted_id)
    }

# 3. Add GET endpoint to check reboot status
@app.get("/api/device/reboot/{reboot_id}")
async def get_reboot_status(reboot_id: str):
    from bson import ObjectId
    reboot = await database.reboot_logs.find_one({"_id": ObjectId(reboot_id)})
    if not reboot:
        raise HTTPException(status_code=404, detail="Reboot log not found")
    reboot["_id"] = str(reboot["_id"])
    return {"success": True, "data": reboot}
```

**Test it**:
```bash
curl -X POST http://localhost:8000/api/device/reboot \
  -H "Content-Type: application/json" \
  -d '{
    "element_id": "507f1f77bcf86cd799439011",
    "reason": "Security patch installation"
  }'
```

---

## 3. Add New Database Collection

### Example: Add "Configuration Backups" Collection

**File**: `backend/main.py`

```python
# 1. Create Pydantic model
class ConfigBackup(BaseModel):
    element_id: str
    config_content: str
    backup_type: str  # "running" or "startup"
    file_size: int
    created_at: Optional[datetime] = None

# 2. Add CREATE endpoint
@app.post("/api/backups")
async def create_backup(backup: ConfigBackup):
    backup_dict = backup.dict()
    backup_dict["created_at"] = datetime.utcnow()
    result = await database.config_backups.insert_one(backup_dict)
    return {"success": True, "id": str(result.inserted_id)}

# 3. Add LIST endpoint
@app.get("/api/backups")
async def get_backups(element_id: Optional[str] = None):
    query = {"element_id": element_id} if element_id else {}
    backups = []
    async for backup in database.config_backups.find(query).sort("created_at", -1):
        backup["_id"] = str(backup["_id"])
        backups.append(backup)
    return {"success": True, "count": len(backups), "data": backups}

# 4. Add GET ONE endpoint
@app.get("/api/backups/{backup_id}")
async def get_backup(backup_id: str):
    from bson import ObjectId
    backup = await database.config_backups.find_one({"_id": ObjectId(backup_id)})
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    backup["_id"] = str(backup["_id"])
    return {"success": True, "data": backup}

# 5. Add DELETE endpoint
@app.delete("/api/backups/{backup_id}")
async def delete_backup(backup_id: str):
    from bson import ObjectId
    result = await database.config_backups.delete_one({"_id": ObjectId(backup_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Backup not found")
    return {"success": True, "message": "Backup deleted"}
```

---

## 4. Add New Frontend Page

### Example: Add "Reports" Page

**Step 1**: Create page file

**File**: `frontend/src/app/reports/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'

export default function ReportsPage() {
  const [reports, setReports] = useState([])

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    // Fetch reports from API
    const response = await fetch('http://localhost:8000/api/reports')
    const data = await response.json()
    setReports(data.data || [])
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-4xl font-bold mb-8">Reports</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Available Reports</h2>
        
        {reports.length === 0 ? (
          <p className="text-gray-500">No reports available</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((report, index) => (
              <li key={index} className="p-4 border rounded hover:bg-gray-50">
                {report.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
```

**Step 2**: Add navigation link

**File**: `frontend/src/app/page.tsx`

Add this in the header:
```typescript
<header className="mb-8 flex justify-between items-center">
  <div>
    <h1 className="text-4xl font-bold text-gray-900">Network Element Monitor</h1>
    <p className="text-gray-600 mt-2">Real-time monitoring dashboard</p>
  </div>
  <nav className="flex gap-4">
    <a href="/" className="px-4 py-2 bg-blue-500 text-white rounded">Dashboard</a>
    <a href="/reports" className="px-4 py-2 bg-gray-200 rounded">Reports</a>
  </nav>
</header>
```

**Access**: http://localhost:3000/reports

---

## 5. Add New Component

### Example: Add "Device Health" Component

**File**: `frontend/src/components/DeviceHealth.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'

interface DeviceHealthProps {
  elementId: string
}

export default function DeviceHealth({ elementId }: DeviceHealthProps) {
  const [health, setHealth] = useState({
    cpu: 0,
    memory: 0,
    uptime: '',
    status: 'unknown'
  })

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [elementId])

  const fetchHealth = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/device/health/${elementId}`)
      const data = await response.json()
      setHealth(data.data)
    } catch (error) {
      console.error('Failed to fetch health:', error)
    }
  }

  const getHealthColor = (value: number) => {
    if (value < 50) return 'text-green-600'
    if (value < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Device Health</h3>
      
      <div className="space-y-4">
        {/* CPU Usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">CPU Usage</span>
            <span className={`text-sm font-bold ${getHealthColor(health.cpu)}`}>
              {health.cpu}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${health.cpu}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Memory Usage</span>
            <span className={`text-sm font-bold ${getHealthColor(health.memory)}`}>
              {health.memory}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${health.memory}%` }}
            />
          </div>
        </div>

        {/* Uptime */}
        <div className="flex justify-between">
          <span className="text-sm font-medium">Uptime</span>
          <span className="text-sm">{health.uptime}</span>
        </div>

        {/* Status */}
        <div className="flex justify-between">
          <span className="text-sm font-medium">Status</span>
          <span className={`text-sm font-bold ${
            health.status === 'healthy' ? 'text-green-600' : 'text-red-600'
          }`}>
            {health.status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}
```

**Use it in page**:

**File**: `frontend/src/app/page.tsx`

```typescript
import DeviceHealth from '@/components/DeviceHealth'

// Inside your component:
<DeviceHealth elementId="507f1f77bcf86cd799439011" />
```

---

## 6. Modify Existing Component

### Example: Add Search to ElementList

**File**: `frontend/src/components/ElementList.tsx`

**Add state**:
```typescript
const [searchTerm, setSearchTerm] = useState('')
```

**Add search input**:
```typescript
<div className="p-6 border-b border-gray-200 flex justify-between items-center">
  <h2 className="text-xl font-semibold text-gray-900">Network Elements</h2>
  
  {/* Add this search input */}
  <input
    type="text"
    placeholder="Search devices..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="px-4 py-2 border rounded"
  />
  
  <button onClick={onRefresh} className="px-4 py-2 bg-blue-500 text-white rounded">
    Refresh
  </button>
</div>
```

**Filter elements**:
```typescript
const filteredElements = elements.filter(element =>
  element.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  element.ip_address.includes(searchTerm) ||
  element.type.toLowerCase().includes(searchTerm.toLowerCase())
)

// Use filteredElements instead of elements in the map:
{filteredElements.map((element) => (
  <tr key={element._id}>
    ...
  </tr>
))}
```

---

## 7. Add Scheduled Tasks

### Example: Auto-backup every 6 hours

**File**: `backend/scheduler.py` (create new file)

```python
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from network_device import create_device_connection

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "network_monitor"

async def backup_all_devices():
    """Backup configuration of all active devices"""
    client = AsyncIOMotorClient(MONGODB_URL)
    database = client[DATABASE_NAME]
    
    # Get all active elements with credentials
    elements = []
    async for element in database.network_elements.find({"status": "active"}):
        if "credentials" in element:
            elements.append(element)
    
    print(f"Starting backup for {len(elements)} devices...")
    
    for element in elements:
        try:
            # Connect to device
            device = create_device_connection(
                host=element["ip_address"],
                username=element["credentials"]["username"],
                password=element["credentials"]["password"],
                device_type=element["credentials"].get("device_type", "cisco_ios")
            )
            
            if device.connect():
                # Get running config
                config = device.execute_command("show running-config")
                
                # Save to database
                backup = {
                    "element_id": str(element["_id"]),
                    "device_name": element["name"],
                    "config_content": config,
                    "backup_type": "running",
                    "file_size": len(config),
                    "created_at": datetime.utcnow()
                }
                await database.config_backups.insert_one(backup)
                
                print(f"✓ Backed up {element['name']}")
                device.disconnect()
        
        except Exception as e:
            print(f"✗ Failed to backup {element['name']}: {str(e)}")
    
    client.close()

async def scheduler():
    """Run backup every 6 hours"""
    while True:
        print(f"[{datetime.now()}] Running scheduled backup...")
        await backup_all_devices()
        print(f"[{datetime.now()}] Backup complete. Sleeping for 6 hours...")
        await asyncio.sleep(6 * 60 * 60)  # 6 hours

if __name__ == "__main__":
    asyncio.run(scheduler())
```

**Run it**:
```bash
cd backend
python scheduler.py
```

**Or add to docker-compose.yml**:
```yaml
scheduler:
  build: ./backend
  container_name: network-monitor-scheduler
  command: python scheduler.py
  environment:
    MONGODB_URL: mongodb://mongodb:27017
  depends_on:
    - mongodb
```

---

## 8. Add Authentication

### Simple API Key Authentication

**File**: `backend/main.py`

```python
from fastapi import Header, HTTPException

# Add API key check
API_KEY = "your-secret-api-key-here"

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# Protect endpoints
@app.get("/api/elements", dependencies=[Depends(verify_api_key)])
async def get_elements():
    # ... existing code

# Or protect specific endpoints
@app.post("/api/device/execute")
async def execute_command(request: CommandRequest, api_key: str = Depends(verify_api_key)):
    # ... existing code
```

**Frontend**: Add API key to requests

**File**: `frontend/src/lib/api.ts`

```typescript
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-secret-api-key-here'
  },
})
```

---

## Quick Reference

### Restart after changes:

```bash
# Backend only
docker-compose restart backend

# Frontend only
docker-compose restart frontend

# Everything
docker-compose restart

# Rebuild (if you changed dependencies)
docker-compose down
docker-compose up --build
```

### View logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Access database:
```bash
docker exec -it network-monitor-db mongosh
use network_monitor
db.network_elements.find()
```

---

That's it! You now know how to modify every part of the system. Start small, test often, and build amazing features! 🚀
