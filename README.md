# CalibTrack – Calibration Management System

## Project Overview
CalibTrack is a web-based Calibration Management System designed to manage instruments, calibration schedules, certificates, work orders, alerts, and audit records.

## Technologies Used
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python, FastAPI
- **Database:** SQLite

## Features
- Instrument registration and management
- Calibration record management
- Automatic calibration alerts
- Certificate record management
- Work order management
- Impact assessment
- Reports and audit history

## Project Structure
- `frontend/` – User interface files
- `backend/` – FastAPI application
- `database/` – SQLite database

## How to Run

1. Clone the repository.
2. Create and activate a Python virtual environment 

     python -m venv venv
     
3. activate virtual environment 

     .\venv\Scripts\Activate.ps1
     
4. Install dependencies:

   python -m pip install -r backend/requirements.txt

5. Start the backend:

   python -m uvicorn backend.main:app --reload

6. Open the frontend using VS Code Live Server.


## API Documentation
After starting the backend, visit:

`http://127.0.0.1:8000/docs`

## Database
CalibTrack uses SQLite for storing instrument and calibration information.
