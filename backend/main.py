import sqlite3
import calendar
from pathlib import Path
from datetime import date
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.schemas import Instrument, Calibration, Certificate
from backend.schemas import (
    Instrument,
    Calibration,
    Certificate,
    WorkOrder,
    ImpactAssessment
)

app = FastAPI(title="CalibTrack API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

DB = Path(__file__).parent.parent / "database" / "calibtrack.db"

def connect():
    con = sqlite3.connect(DB)
    con.execute("PRAGMA foreign_keys = ON")
    return con


def next_due_date(cal_date, months):
    d = date.fromisoformat(cal_date)
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day).isoformat()


@app.get("/")
def home():
    return {"message": "Welcome to CalibTrack"}

@app.get("/instruments")
def get_instruments():
    with connect() as con:
        return con.execute("SELECT * FROM asset").fetchall()


@app.post("/instruments")
def add_instrument(item: Instrument):
    with connect() as con:
        existing = con.execute(
            "SELECT id FROM asset WHERE instrument_code = ?",
            (item.instrument_code,)
        ).fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Instrument code already exists"
            )

        con.execute("""
            INSERT INTO asset
            (instrument_code, name, type_id, supplier_id, location, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            item.instrument_code, item.name, item.type_id,
            item.supplier_id, item.location, item.status
        ))

    return {"message": "Instrument added successfully"}



@app.get("/dashboard")
def dashboard():
    today = date.today()

    with connect() as con:
        total = con.execute(
            "SELECT COUNT(*) FROM asset"
        ).fetchone()[0]

        active = con.execute(
            "SELECT COUNT(*) FROM asset WHERE status='Active'"
        ).fetchone()[0]

        failed = con.execute(
            "SELECT COUNT(*) FROM asset WHERE status='Failed'"
        ).fetchone()[0]

        rows = con.execute("""
            SELECT
                a.status,
                c.due_date,
                c.result
            FROM asset a
            LEFT JOIN calibration_event c
                ON c.id = (
                    SELECT MAX(c2.id)
                    FROM calibration_event c2
                    WHERE c2.asset_id = a.id
                )
        """).fetchall()

    overdue = 0
    due_soon = 0
    upcoming = 0

    for row in rows:
        if row[0] != "Active" or not row[1] or row[2] != "Pass":
            continue

        due_date = date.fromisoformat(row[1])
        days_left = (due_date - today).days

        if days_left < 0:
            overdue += 1
        elif days_left <= 7:
            due_soon += 1
        elif days_left <= 30:
            upcoming += 1

    return {
        "total_instruments": total,
        "active_instruments": active,
        "overdue": overdue,
        "due_soon": due_soon,
        "upcoming": upcoming,
        "failed_instruments": failed
    }
   
@app.post("/calibrations")
def add_calibration(item: Calibration):
    if item.frequency_months <= 0:
        raise HTTPException(400, "Frequency must be positive")

    if item.result not in ["Pass", "Fail"]:
        raise HTTPException(400, "Result must be Pass or Fail")

    try:
        due = next_due_date(item.calibration_date, item.frequency_months)
    except ValueError:
        raise HTTPException(400, "Invalid calibration date")

    with connect() as con:
        asset = con.execute(
            "SELECT id FROM asset WHERE id=?", (item.asset_id,)
        ).fetchone()

        if not asset:
            raise HTTPException(404, "Instrument not found")

        con.execute("""
            INSERT INTO calibration_event
            (asset_id, calibration_date, due_date, result)
            VALUES (?, ?, ?, ?)
        """, (item.asset_id, item.calibration_date, due, item.result))

        con.execute("""
            UPDATE asset SET status=? WHERE id=?
        """, ("Active" if item.result == "Pass" else "Failed", item.asset_id))

    return {"message": "Calibration recorded", "next_due_date": due}
@app.get("/calibrations")
def get_calibrations():
    with connect() as con:
        rows = con.execute(
            "SELECT * FROM calibration_event"
        ).fetchall()
    return rows

@app.get("/overdue")
def get_overdue():
    today = date.today().isoformat()

    with connect() as con:
        rows = con.execute("""
            SELECT a.id, a.instrument_code, a.name,
                   c.due_date
            FROM asset a
            JOIN calibration_event c ON c.id = (
                SELECT MAX(id) FROM calibration_event
                WHERE asset_id = a.id
            )
            WHERE c.due_date < ?
        """, (today,)).fetchall()

    return rows
    
@app.get("/alerts")
def get_alerts():
    with connect() as con:
        rows = con.execute(
            "SELECT * FROM alert ORDER BY id DESC"
        ).fetchall()
    return rows

@app.post("/alerts/{asset_id}")
def create_alert(asset_id: int):
    with connect() as con:
        asset = con.execute(
            "SELECT id FROM asset WHERE id=?", (asset_id,)
        ).fetchone()

        if not asset:
            raise HTTPException(404, "Instrument not found")

        con.execute(
            "INSERT INTO alert (asset_id, message) VALUES (?, ?)",
            (asset_id, "Calibration requires attention")
        )

    return {"message": "Alert created"}
    
@app.post("/certificates")
def add_certificate(item: Certificate):
    with connect() as con:
        asset = con.execute(
            "SELECT id FROM asset WHERE id=?", (item.asset_id,)
        ).fetchone()

        if not asset:
            raise HTTPException(404, "Instrument not found")

        try:
            con.execute("""
                INSERT INTO certificate
                (asset_id, certificate_number, file_path)
                VALUES (?, ?, ?)
            """, (item.asset_id, item.certificate_number, item.file_path))
        except sqlite3.IntegrityError:
            raise HTTPException(400, "Certificate number already exists")

    return {"message": "Certificate added successfully"}


@app.get("/certificates")
def get_certificates():
    with connect() as con:
        return con.execute("SELECT * FROM certificate").fetchall()


# Production Usage
@app.post("/production-use/{asset_id}")
def record_usage(asset_id: int):
    today = date.today().isoformat()

    with connect() as con:
        cal = con.execute("""
            SELECT due_date, result FROM calibration_event
            WHERE asset_id=?
            ORDER BY calibration_date DESC, id DESC LIMIT 1
        """, (asset_id,)).fetchone()

        if not cal:
            raise HTTPException(400, "No calibration found")

        if cal[1] != "Pass" or cal[0] < today:
            raise HTTPException(400, "Calibration expired or failed")

        con.execute("""
            INSERT INTO production_use (asset_id, usage_date)
            VALUES (?, ?)
        """, (asset_id, today))

    return {"message": "Production usage recorded"}


# Work Orders
@app.post("/work-orders")
def add_work_order(item: WorkOrder):
    with connect() as con:
        if not con.execute(
            "SELECT id FROM asset WHERE id=?", (item.asset_id,)
        ).fetchone():
            raise HTTPException(404, "Instrument not found")

        con.execute("""
            INSERT INTO work_order (asset_id, description)
            VALUES (?, ?)
        """, (item.asset_id, item.description))

    return {"message": "Work order created"}


@app.get("/work-orders")
def get_work_orders():
    with connect() as con:
        return con.execute("SELECT * FROM work_order").fetchall()


# Audit History
@app.post("/audit")
def add_audit(action: str, details: str):
    with connect() as con:
        con.execute("""
            INSERT INTO audit_record (action, details)
            VALUES (?, ?)
        """, (action, details))

    return {"message": "Audit saved"}


@app.get("/audit")
def get_audit():
    with connect() as con:
        return con.execute("""
            SELECT * FROM audit_record ORDER BY id DESC
        """).fetchall()


# Impact Assessment
@app.post("/impact-assessments")
def add_assessment(item: ImpactAssessment):
    with connect() as con:
        event = con.execute("""
            SELECT result FROM calibration_event WHERE id=?
        """, (item.calibration_event_id,)).fetchone()

        if not event:
            raise HTTPException(404, "Calibration not found")

        if event[0] != "Fail":
            raise HTTPException(400, "Calibration must have failed")

        con.execute("""
            INSERT INTO impact_assessment
            (calibration_event_id, findings, action_taken)
            VALUES (?, ?, ?)
        """, (
            item.calibration_event_id,
            item.findings,
            item.action_taken
        ))

    return {"message": "Impact assessment saved"}

@app.put("/work-orders/{work_order_id}/status")
def update_work_order_status(work_order_id: int, status: str):
    if status not in ["Open", "In Progress", "Completed"]:
        raise HTTPException(400, "Invalid work order status")

    with connect() as con:
        work_order = con.execute(
            "SELECT id FROM work_order WHERE id=?",
            (work_order_id,)
        ).fetchone()

        if not work_order:
            raise HTTPException(404, "Work order not found")

        con.execute(
            "UPDATE work_order SET status=? WHERE id=?",
            (status, work_order_id)
        )

    return {"message": "Work order status updated successfully"}

@app.get("/reports")
def reports():
    today = date.today().isoformat()

    with connect() as con:
        total = con.execute(
            "SELECT COUNT(*) FROM asset"
        ).fetchone()[0]

        calibrations = con.execute(
            "SELECT COUNT(*) FROM calibration_event"
        ).fetchone()[0]

        failed = con.execute(
            "SELECT COUNT(*) FROM calibration_event WHERE result='Fail'"
        ).fetchone()[0]

        overdue = con.execute("""
            SELECT COUNT(*) FROM asset a
            WHERE (
                SELECT due_date
                FROM calibration_event
                WHERE asset_id = a.id
                ORDER BY calibration_date DESC, id DESC
                LIMIT 1
            ) < ?
        """, (today,)).fetchone()[0]

        open_orders = con.execute(
            "SELECT COUNT(*) FROM work_order WHERE status='Open'"
        ).fetchone()[0]

        in_progress = con.execute(
            "SELECT COUNT(*) FROM work_order WHERE status='In Progress'"
        ).fetchone()[0]

        completed = con.execute(
            "SELECT COUNT(*) FROM work_order WHERE status='Completed'"
        ).fetchone()[0]

    return {
        "total_instruments": total,
        "total_calibrations": calibrations,
        "failed_calibrations": failed,
        "overdue_instruments": overdue,
        "open_work_orders": open_orders,
        "in_progress_work_orders": in_progress,
        "completed_work_orders": completed
    }

from datetime import date


@app.get("/alerts/automatic")
def automatic_alerts():
    today = date.today()

    with connect() as con:
        rows = con.execute("""
            SELECT
                a.id,
                a.instrument_code,
                a.name,
                c.due_date,
                c.result
            FROM asset a
            JOIN calibration_event c
                ON a.id = c.asset_id
            WHERE a.status = 'Active'
            AND c.id = (
                SELECT MAX(c2.id)
                FROM calibration_event c2
                WHERE c2.asset_id = a.id
            )
        """).fetchall()

    alerts = []

    for row in rows:
        if not row[3] or row[4] == "Fail":
            continue

        due_date = date.fromisoformat(row[3])
        days_left = (due_date - today).days

        if days_left < 0:
            status = "Overdue"
        elif days_left <= 7:
            status = "Due Soon"
        elif days_left <= 30:
            status = "Upcoming"
        else:
            continue

        alerts.append({
            "asset_id": row[0],
            "instrument_code": row[1],
            "name": row[2],
            "due_date": row[3],
            "days_left": days_left,
            "status": status
        })

    return alerts

@app.put("/instruments/{asset_id}")
def update_instrument(asset_id: int, item: Instrument):
    with connect() as con:
        asset = con.execute(
            "SELECT id FROM asset WHERE id=?",
            (asset_id,)
        ).fetchone()

        if not asset:
            raise HTTPException(404, "Instrument not found")

        existing = con.execute(
            "SELECT id FROM asset WHERE instrument_code=? AND id!=?",
            (item.instrument_code, asset_id)
        ).fetchone()

        if existing:
            raise HTTPException(400, "Instrument code already exists")

        con.execute("""
            UPDATE asset
            SET instrument_code=?,
                name=?,
                type_id=?,
                supplier_id=?,
                location=?,
                status=?
            WHERE id=?
        """, (
            item.instrument_code,
            item.name,
            item.type_id,
            item.supplier_id,
            item.location,
            item.status,
            asset_id
        ))

    return {"message": "Instrument updated successfully"}


@app.delete("/instruments/{asset_id}")
def deactivate_instrument(asset_id: int):
    with connect() as con:
        asset = con.execute(
            "SELECT id FROM asset WHERE id=?",
            (asset_id,)
        ).fetchone()

        if not asset:
            raise HTTPException(404, "Instrument not found")

        con.execute(
            "UPDATE asset SET status='Inactive' WHERE id=?",
            (asset_id,)
        )

    return {"message": "Instrument deactivated successfully"}
