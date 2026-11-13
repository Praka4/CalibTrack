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
2. Create and activate a Python virtual environment.
3. Install dependencies:

   `pip install -r requirements.txt`

4. Start the backend:

   `python -m uvicorn backend.main:app --reload`

5. Open the frontend using VS Code Live Server.


(or)

1.Clone the repository:

git clone https://github.com/Praka4/CalibTrack.git

2.Navigate to the project directory:

cd CalibTrack

3.Create a Python virtual environment:

python -m venv venv

4.Activate the virtual environment (Windows PowerShell):

.\venv\Scripts\Activate.ps1

5.Install dependencies:

python -m pip install -r backend/requirements.txt

6.Start the backend:

python -m uvicorn backend.main:app --reload

7.Open the frontend/index.html file using VS Code Live Server.

## API Documentation
After starting the backend, visit:

`http://127.0.0.1:8000/docs`

## Database
CalibTrack uses SQLite for storing instrument and calibration information.
