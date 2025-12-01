# Quick Start Guide - No Experience Required! 🚀

This guide will help you get the Network Element Monitor running on your computer in minutes.

## Step 1: Install Docker Desktop

### For Windows:
1. Go to https://www.docker.com/products/docker-desktop/
2. Click "Download for Windows"
3. Run the installer (Docker Desktop Installer.exe)
4. Follow the installation wizard
5. Restart your computer when prompted
6. Open Docker Desktop - you'll see a whale icon in your system tray

### For Mac:
1. Go to https://www.docker.com/products/docker-desktop/
2. Click "Download for Mac" (choose Intel or Apple Silicon based on your Mac)
3. Open the downloaded .dmg file
4. Drag Docker to Applications folder
5. Open Docker from Applications
6. Grant permissions when asked

### For Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```
Log out and log back in after running these commands.

## Step 2: Download the Project

### Option A: Using Git (if you have it)
```bash
git clone https://github.com/fmspathankot-spec/network-element-monitor.git
cd network-element-monitor
```

### Option B: Download ZIP (easier for beginners)
1. Go to https://github.com/fmspathankot-spec/network-element-monitor
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file to a folder (like Desktop or Documents)
5. Open Terminal/Command Prompt and navigate to that folder:
   - **Windows**: `cd C:\Users\YourName\Desktop\network-element-monitor`
   - **Mac/Linux**: `cd ~/Desktop/network-element-monitor`

## Step 3: Start Everything with One Command!

Open Terminal (Mac/Linux) or Command Prompt (Windows) in the project folder and run:

```bash
docker-compose up
```

**What happens now?**
- Docker will download everything needed (first time takes 5-10 minutes)
- It will start MongoDB database
- It will start Python backend
- It will start Next.js frontend
- You'll see lots of text scrolling - that's normal!

**Wait until you see:**
```
network-monitor-frontend  | ✓ Ready in 3.2s
network-monitor-backend   | INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Step 4: Open Your Browser

Once everything is running, open your web browser and go to:

**Main Dashboard:** http://localhost:3000

**API Documentation:** http://localhost:8000/docs

## Step 5: Test It Out!

### Add Your First Network Element

1. Go to http://localhost:8000/docs
2. Find "POST /api/elements" section
3. Click "Try it out"
4. Replace the example with:
```json
{
  "name": "Router-01",
  "ip_address": "192.168.1.1",
  "type": "Router",
  "location": "Data Center A",
  "status": "active"
}
```
5. Click "Execute"
6. Go back to http://localhost:3000 and click "Refresh" - you'll see your router!

### Add a Metric
1. In API docs, find "POST /api/metrics"
2. Click "Try it out"
3. Use this (replace element_id with the ID from your element):
```json
{
  "element_id": "your-element-id-here",
  "metric_type": "cpu_usage",
  "value": 45.5,
  "unit": "percent"
}
```

### Create an Alert
1. Find "POST /api/alerts"
2. Click "Try it out"
3. Use:
```json
{
  "element_id": "your-element-id-here",
  "severity": "high",
  "message": "High CPU usage detected on Router-01"
}
```
4. Check the dashboard - you'll see the alert!

## Common Commands

### Stop Everything
Press `Ctrl + C` in the terminal where docker-compose is running

### Start in Background (so you can close terminal)
```bash
docker-compose up -d
```

### Stop Background Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Restart Everything
```bash
docker-compose restart
```

### Clean Start (if something goes wrong)
```bash
docker-compose down
docker-compose up --build
```

## Troubleshooting

### "Port already in use" error
Another program is using port 3000, 8000, or 27017. Either:
- Stop that program, OR
- Edit `docker-compose.yml` and change the ports (e.g., "3001:3000")

### "Cannot connect to Docker daemon"
- Make sure Docker Desktop is running (check system tray/menu bar)
- On Linux, run: `sudo systemctl start docker`

### Frontend shows "Cannot connect to backend"
- Wait 30 seconds after starting - backend takes time to initialize
- Check if backend is running: http://localhost:8000/health

### Changes not showing up
```bash
docker-compose down
docker-compose up --build
```

## What's Running?

- **Frontend (Next.js)**: http://localhost:3000 - Your web dashboard
- **Backend (FastAPI)**: http://localhost:8000 - API server
- **API Docs**: http://localhost:8000/docs - Interactive API testing
- **MongoDB**: localhost:27017 - Database (no web interface)

## Next Steps

1. **Customize**: Edit files in `frontend/` and `backend/` folders
2. **Add Features**: Check the API docs to see all available endpoints
3. **Monitor Real Devices**: Integrate with your actual network elements
4. **Deploy**: Use Vercel (frontend) and Railway/Render (backend) for production

## Need Help?

- Check the main README.md for more details
- API documentation: http://localhost:8000/docs
- Docker documentation: https://docs.docker.com/

---

**That's it! You now have a fully functional network monitoring portal running on your computer!** 🎉
