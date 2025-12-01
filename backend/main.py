from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
from contextlib import asynccontextmanager

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "network_monitor")

# Global database client
db_client = None
database = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global db_client, database
    db_client = AsyncIOMotorClient(MONGODB_URL)
    database = db_client[DATABASE_NAME]
    yield
    # Shutdown
    db_client.close()

app = FastAPI(
    title="Network Element Monitor API",
    description="API for monitoring network elements",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class NetworkElement(BaseModel):
    name: str
    ip_address: str
    type: str
    location: Optional[str] = None
    status: str = "active"
    created_at: Optional[datetime] = None

class Metric(BaseModel):
    element_id: str
    metric_type: str
    value: float
    unit: str
    timestamp: Optional[datetime] = None

class Alert(BaseModel):
    element_id: str
    severity: str
    message: str
    resolved: bool = False
    created_at: Optional[datetime] = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Routes
@app.get("/")
async def root():
    return {"message": "Network Element Monitor API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Network Elements
@app.post("/api/elements", response_model=dict)
async def create_element(element: NetworkElement):
    element_dict = element.dict()
    element_dict["created_at"] = datetime.utcnow()
    result = await database.network_elements.insert_one(element_dict)
    element_dict["_id"] = str(result.inserted_id)
    await manager.broadcast({"type": "element_created", "data": element_dict})
    return {"success": True, "id": str(result.inserted_id), "data": element_dict}

@app.get("/api/elements")
async def get_elements(status: Optional[str] = None):
    query = {"status": status} if status else {}
    elements = []
    async for element in database.network_elements.find(query):
        element["_id"] = str(element["_id"])
        elements.append(element)
    return {"success": True, "count": len(elements), "data": elements}

@app.get("/api/elements/{element_id}")
async def get_element(element_id: str):
    from bson import ObjectId
    element = await database.network_elements.find_one({"_id": ObjectId(element_id)})
    if not element:
        raise HTTPException(status_code=404, detail="Element not found")
    element["_id"] = str(element["_id"])
    return {"success": True, "data": element}

@app.put("/api/elements/{element_id}")
async def update_element(element_id: str, element: NetworkElement):
    from bson import ObjectId
    result = await database.network_elements.update_one(
        {"_id": ObjectId(element_id)},
        {"$set": element.dict(exclude_unset=True)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Element not found")
    return {"success": True, "message": "Element updated"}

@app.delete("/api/elements/{element_id}")
async def delete_element(element_id: str):
    from bson import ObjectId
    result = await database.network_elements.delete_one({"_id": ObjectId(element_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Element not found")
    return {"success": True, "message": "Element deleted"}

# Metrics
@app.post("/api/metrics")
async def create_metric(metric: Metric):
    metric_dict = metric.dict()
    metric_dict["timestamp"] = datetime.utcnow()
    result = await database.metrics.insert_one(metric_dict)
    metric_dict["_id"] = str(result.inserted_id)
    await manager.broadcast({"type": "metric_update", "data": metric_dict})
    return {"success": True, "id": str(result.inserted_id)}

@app.get("/api/metrics/{element_id}")
async def get_metrics(element_id: str, limit: int = 100):
    metrics = []
    async for metric in database.metrics.find({"element_id": element_id}).sort("timestamp", -1).limit(limit):
        metric["_id"] = str(metric["_id"])
        metrics.append(metric)
    return {"success": True, "count": len(metrics), "data": metrics}

# Alerts
@app.post("/api/alerts")
async def create_alert(alert: Alert):
    alert_dict = alert.dict()
    alert_dict["created_at"] = datetime.utcnow()
    result = await database.alerts.insert_one(alert_dict)
    alert_dict["_id"] = str(result.inserted_id)
    await manager.broadcast({"type": "alert_created", "data": alert_dict})
    return {"success": True, "id": str(result.inserted_id)}

@app.get("/api/alerts")
async def get_alerts(resolved: Optional[bool] = None):
    query = {"resolved": resolved} if resolved is not None else {}
    alerts = []
    async for alert in database.alerts.find(query).sort("created_at", -1):
        alert["_id"] = str(alert["_id"])
        alerts.append(alert)
    return {"success": True, "count": len(alerts), "data": alerts}

@app.put("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    from bson import ObjectId
    result = await database.alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"resolved": True, "resolved_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True, "message": "Alert resolved"}

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast({"type": "message", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
