# Network Element Monitoring Portal

A comprehensive web portal for monitoring network elements built with Python FastAPI, Next.js 16, and MongoDB.

## Features

- Real-time network element monitoring
- Interactive dashboard with live metrics
- Alert management system
- Historical data analysis
- RESTful API backend
- Modern responsive UI

## Tech Stack

- **Backend**: Python 3.11+ with FastAPI
- **Frontend**: Next.js 16 with React 19
- **Database**: MongoDB
- **Real-time**: WebSocket support

## Project Structure

```
├── backend/          # Python FastAPI backend
├── frontend/         # Next.js 16 frontend
└── docs/            # Documentation
```

## Quick Start

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Create `.env` files in both backend and frontend directories. See `.env.example` files for required variables.

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

## License

MIT
