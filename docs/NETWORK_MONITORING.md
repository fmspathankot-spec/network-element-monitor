# Network Device Monitoring - SSH Commands

Learn how to connect to routers/switches and execute commands like `show ip int brief`, `show ip ospf neighbor`, etc.

## Overview

We'll use **Netmiko** library to SSH into network devices and execute commands.

```
┌──────────────┐      SSH       ┌──────────────┐
│   FastAPI    │ ─────────────> │    Router    │
│   Backend    │ <───────────── │  192.168.1.1 │
└──────────────┘   Commands     └──────────────┘
                   & Output
```

---

## Step 1: Install Netmiko

Add to `backend/requirements.txt`:

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
motor==3.3.2
pydantic==2.5.3
python-dotenv==1.0.0
pymongo==4.6.1
websockets==12.0
netmiko==4.3.0          # ← Add this line
paramiko==3.4.0         # ← Add this line
```

Then rebuild Docker:
```bash
docker-compose down
docker-compose up --build
```

---

## Step 2: Create Network Device Connection Module

Create `backend/network_device.py`:

```python
from netmiko import ConnectHandler
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NetworkDevice:
    """
    Handles SSH connections to network devices (routers, switches)
    """
    
    def __init__(self, device_info: Dict):
        """
        device_info = {
            'device_type': 'cisco_ios',  # or 'cisco_xe', 'cisco_nxos', etc.
            'host': '192.168.1.1',
            'username': 'admin',
            'password': 'password123',
            'port': 22,
            'secret': 'enable_password'  # Optional, for enable mode
        }
        """
        self.device_info = device_info
        self.connection = None
    
    def connect(self) -> bool:
        """Establish SSH connection to device"""
        try:
            logger.info(f"Connecting to {self.device_info['host']}...")
            self.connection = ConnectHandler(**self.device_info)
            logger.info(f"Connected to {self.device_info['host']}")
            return True
        except Exception as e:
            logger.error(f"Connection failed: {str(e)}")
            return False
    
    def disconnect(self):
        """Close SSH connection"""
        if self.connection:
            self.connection.disconnect()
            logger.info(f"Disconnected from {self.device_info['host']}")
    
    def execute_command(self, command: str) -> str:
        """
        Execute a single command and return output
        
        Example:
            output = device.execute_command("show ip int brief")
        """
        if not self.connection:
            raise Exception("Not connected to device")
        
        try:
            logger.info(f"Executing: {command}")
            output = self.connection.send_command(command)
            return output
        except Exception as e:
            logger.error(f"Command execution failed: {str(e)}")
            raise
    
    def execute_commands(self, commands: List[str]) -> Dict[str, str]:
        """
        Execute multiple commands and return dict of outputs
        
        Example:
            outputs = device.execute_commands([
                "show ip int brief",
                "show ip ospf neighbor"
            ])
            # Returns: {"show ip int brief": "output1", "show ip ospf neighbor": "output2"}
        """
        results = {}
        for command in commands:
            try:
                results[command] = self.execute_command(command)
            except Exception as e:
                results[command] = f"Error: {str(e)}"
        return results
    
    def execute_config_commands(self, commands: List[str]) -> str:
        """
        Execute configuration commands (enters config mode)
        
        Example:
            device.execute_config_commands([
                "interface GigabitEthernet0/1",
                "description Connected to Core Switch",
                "no shutdown"
            ])
        """
        if not self.connection:
            raise Exception("Not connected to device")
        
        try:
            logger.info(f"Executing config commands: {commands}")
            output = self.connection.send_config_set(commands)
            return output
        except Exception as e:
            logger.error(f"Config command execution failed: {str(e)}")
            raise


# Helper function to create device connection
def create_device_connection(
    host: str,
    username: str,
    password: str,
    device_type: str = "cisco_ios",
    port: int = 22,
    secret: Optional[str] = None
) -> NetworkDevice:
    """
    Quick helper to create a device connection
    
    Supported device_types:
    - cisco_ios (Cisco IOS routers/switches)
    - cisco_xe (Cisco IOS-XE)
    - cisco_nxos (Cisco Nexus)
    - cisco_asa (Cisco ASA firewalls)
    - arista_eos (Arista switches)
    - juniper_junos (Juniper routers)
    - hp_procurve (HP switches)
    - and many more...
    """
    device_info = {
        'device_type': device_type,
        'host': host,
        'username': username,
        'password': password,
        'port': port,
    }
    
    if secret:
        device_info['secret'] = secret
    
    return NetworkDevice(device_info)


# Example usage functions
def get_interface_status(device: NetworkDevice) -> str:
    """Get interface status using 'show ip int brief'"""
    return device.execute_command("show ip int brief")

def get_ospf_neighbors(device: NetworkDevice) -> str:
    """Get OSPF neighbors using 'show ip ospf neighbor'"""
    return device.execute_command("show ip ospf neighbor")

def get_running_config(device: NetworkDevice) -> str:
    """Get running configuration"""
    return device.execute_command("show running-config")

def get_version(device: NetworkDevice) -> str:
    """Get device version info"""
    return device.execute_command("show version")

def get_cdp_neighbors(device: NetworkDevice) -> str:
    """Get CDP neighbors"""
    return device.execute_command("show cdp neighbors detail")

def get_bgp_summary(device: NetworkDevice) -> str:
    """Get BGP summary"""
    return device.execute_command("show ip bgp summary")

def get_route_table(device: NetworkDevice) -> str:
    """Get routing table"""
    return device.execute_command("show ip route")

def get_arp_table(device: NetworkDevice) -> str:
    """Get ARP table"""
    return device.execute_command("show ip arp")
```

---

## Step 3: Add API Endpoints to main.py

Add these to `backend/main.py`:

```python
from network_device import NetworkDevice, create_device_connection
from pydantic import BaseModel

# Add new models
class DeviceCredentials(BaseModel):
    host: str
    username: str
    password: str
    device_type: str = "cisco_ios"
    port: int = 22
    secret: Optional[str] = None

class CommandRequest(BaseModel):
    credentials: DeviceCredentials
    command: str

class MultiCommandRequest(BaseModel):
    credentials: DeviceCredentials
    commands: List[str]

# Add new endpoints

@app.post("/api/device/execute")
async def execute_device_command(request: CommandRequest):
    """
    Execute a single command on a network device
    
    Example request:
    {
      "credentials": {
        "host": "192.168.1.1",
        "username": "admin",
        "password": "cisco123",
        "device_type": "cisco_ios"
      },
      "command": "show ip int brief"
    }
    """
    device = None
    try:
        # Create device connection
        device = create_device_connection(
            host=request.credentials.host,
            username=request.credentials.username,
            password=request.credentials.password,
            device_type=request.credentials.device_type,
            port=request.credentials.port,
            secret=request.credentials.secret
        )
        
        # Connect
        if not device.connect():
            raise HTTPException(status_code=500, detail="Failed to connect to device")
        
        # Execute command
        output = device.execute_command(request.command)
        
        return {
            "success": True,
            "command": request.command,
            "output": output,
            "device": request.credentials.host
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if device:
            device.disconnect()


@app.post("/api/device/execute-multiple")
async def execute_multiple_commands(request: MultiCommandRequest):
    """
    Execute multiple commands on a network device
    
    Example request:
    {
      "credentials": {
        "host": "192.168.1.1",
        "username": "admin",
        "password": "cisco123"
      },
      "commands": [
        "show ip int brief",
        "show ip ospf neighbor",
        "show version"
      ]
    }
    """
    device = None
    try:
        device = create_device_connection(
            host=request.credentials.host,
            username=request.credentials.username,
            password=request.credentials.password,
            device_type=request.credentials.device_type,
            port=request.credentials.port,
            secret=request.credentials.secret
        )
        
        if not device.connect():
            raise HTTPException(status_code=500, detail="Failed to connect to device")
        
        outputs = device.execute_commands(request.commands)
        
        return {
            "success": True,
            "device": request.credentials.host,
            "results": outputs
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if device:
            device.disconnect()


@app.post("/api/device/quick-check/{element_id}")
async def quick_device_check(element_id: str):
    """
    Quick health check - executes common show commands
    Assumes credentials are stored in the element document
    """
    from bson import ObjectId
    
    # Get element from database
    element = await database.network_elements.find_one({"_id": ObjectId(element_id)})
    if not element:
        raise HTTPException(status_code=404, detail="Element not found")
    
    # Check if credentials exist
    if "credentials" not in element:
        raise HTTPException(status_code=400, detail="No credentials stored for this element")
    
    device = None
    try:
        creds = element["credentials"]
        device = create_device_connection(
            host=element["ip_address"],
            username=creds["username"],
            password=creds["password"],
            device_type=creds.get("device_type", "cisco_ios")
        )
        
        if not device.connect():
            raise HTTPException(status_code=500, detail="Failed to connect to device")
        
        # Execute common commands
        commands = [
            "show ip int brief",
            "show ip ospf neighbor",
            "show version | include uptime",
            "show processes cpu | include CPU"
        ]
        
        outputs = device.execute_commands(commands)
        
        # Store results as metrics
        for command, output in outputs.items():
            metric = {
                "element_id": element_id,
                "metric_type": "command_output",
                "command": command,
                "output": output,
                "timestamp": datetime.utcnow()
            }
            await database.command_outputs.insert_one(metric)
        
        return {
            "success": True,
            "element_id": element_id,
            "device": element["ip_address"],
            "results": outputs
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if device:
            device.disconnect()
```

---

## Step 4: Update Network Element Model

Modify the `NetworkElement` model in `main.py` to include credentials:

```python
class NetworkElement(BaseModel):
    name: str
    ip_address: str
    type: str
    location: Optional[str] = None
    status: str = "active"
    credentials: Optional[Dict] = None  # ← Add this
    created_at: Optional[datetime] = None

# Example element with credentials:
{
  "name": "Router-01",
  "ip_address": "192.168.1.1",
  "type": "Router",
  "location": "Data Center A",
  "status": "active",
  "credentials": {
    "username": "admin",
    "password": "cisco123",
    "device_type": "cisco_ios",
    "secret": "enable_password"
  }
}
```

---

## Step 5: Test It!

### Using API Docs (http://localhost:8000/docs):

1. **Execute Single Command**:
   - Go to `POST /api/device/execute`
   - Click "Try it out"
   - Use this JSON:
   ```json
   {
     "credentials": {
       "host": "192.168.1.1",
       "username": "admin",
       "password": "cisco123",
       "device_type": "cisco_ios"
     },
     "command": "show ip int brief"
   }
   ```

2. **Execute Multiple Commands**:
   ```json
   {
     "credentials": {
       "host": "192.168.1.1",
       "username": "admin",
       "password": "cisco123"
     },
     "commands": [
       "show ip int brief",
       "show ip ospf neighbor",
       "show ip route",
       "show version"
     ]
   }
   ```

### Using Python Script:

Create `test_device.py`:

```python
import requests

API_URL = "http://localhost:8000"

# Test single command
response = requests.post(f"{API_URL}/api/device/execute", json={
    "credentials": {
        "host": "192.168.1.1",
        "username": "admin",
        "password": "cisco123",
        "device_type": "cisco_ios"
    },
    "command": "show ip int brief"
})

print(response.json())
```

---

## Step 6: Add Frontend Component

Create `frontend/src/components/DeviceCommands.tsx`:

```typescript
'use client'

import { useState } from 'react'
import axios from 'axios'

export default function DeviceCommands({ element }: { element: any }) {
  const [command, setCommand] = useState('show ip int brief')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const executeCommand = async () => {
    setLoading(true)
    try {
      const response = await axios.post('http://localhost:8000/api/device/execute', {
        credentials: element.credentials,
        command: command
      })
      setOutput(response.data.output)
    } catch (error) {
      setOutput(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const quickCommands = [
    'show ip int brief',
    'show ip ospf neighbor',
    'show ip route',
    'show version',
    'show running-config',
    'show ip bgp summary'
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Execute Commands</h2>
      
      {/* Quick command buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickCommands.map(cmd => (
          <button
            key={cmd}
            onClick={() => setCommand(cmd)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Command input */}
      <div className="mb-4">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          placeholder="Enter command..."
        />
      </div>

      {/* Execute button */}
      <button
        onClick={executeCommand}
        disabled={loading}
        className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
      >
        {loading ? 'Executing...' : 'Execute Command'}
      </button>

      {/* Output display */}
      {output && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Output:</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto font-mono text-sm">
            {output}
          </pre>
        </div>
      )}
    </div>
  )
}
```

---

## Common Commands Reference

### Cisco IOS Commands:

```bash
# Interface status
show ip int brief
show interfaces status
show interfaces description

# OSPF
show ip ospf neighbor
show ip ospf interface
show ip ospf database

# BGP
show ip bgp summary
show ip bgp neighbors

# Routing
show ip route
show ip protocols

# System info
show version
show inventory
show processes cpu
show memory

# Configuration
show running-config
show startup-config

# Troubleshooting
show logging
show ip arp
show mac address-table
ping 8.8.8.8
traceroute 8.8.8.8
```

---

## Security Best Practices

1. **Never store passwords in plain text**:
   ```python
   from cryptography.fernet import Fernet
   
   # Encrypt passwords before storing
   key = Fernet.generate_key()
   cipher = Fernet(key)
   encrypted_password = cipher.encrypt(b"password123")
   ```

2. **Use environment variables**:
   ```python
   import os
   DEFAULT_USERNAME = os.getenv("DEVICE_USERNAME")
   DEFAULT_PASSWORD = os.getenv("DEVICE_PASSWORD")
   ```

3. **Implement role-based access**:
   - Only admins can execute config commands
   - Read-only users can only execute show commands

4. **Log all commands**:
   ```python
   await database.command_logs.insert_one({
       "user": "admin",
       "device": "192.168.1.1",
       "command": "show ip int brief",
       "timestamp": datetime.utcnow()
   })
   ```

---

## Next Steps

1. Add scheduled command execution (every 5 minutes)
2. Parse command outputs and create alerts
3. Create graphs from metrics
4. Add bulk device management
5. Implement configuration backup

Check `ADVANCED_FEATURES.md` for more!
