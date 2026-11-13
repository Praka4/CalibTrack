
const API = "http://127.0.0.1:8000";

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function getData(endpoint) {
    const response = await fetch(API + endpoint);

    if (!response.ok) {
        throw new Error("Could not load " + endpoint);
    }

    return response.json();
}

function showTable(headers, rows) {
    const head = headers.map(item => `<th>${escapeHTML(item)}</th>`).join("");

    const body = rows.map(row =>
        `<tr>${row.map(value => `<td>${escapeHTML(value)}</td>`).join("")}</tr>`
    ).join("");

    document.getElementById("content").innerHTML =
        `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}


async function showDashboard() {
    document.getElementById("pageTitle").textContent = "Dashboard";

    document.getElementById("content").innerHTML = `
        <h3>Welcome to CalibTrack</h3>
        <p>Calibration Management Dashboard</p>

        <div class="dashboard-cards">

            <div class="dashboard-card">
                <h3>Total Instruments</h3>
                <h2 id="totalInstruments">0</h2>
            </div>

            <div class="dashboard-card">
                <h3>Active Instruments</h3>
                <h2 id="activeInstruments">0</h2>
            </div>

            <div class="dashboard-card">
                <h3>Overdue Calibrations</h3>
                <h2 id="overdueInstruments">0</h2>
            </div>

            <div class="dashboard-card">
                <h3>Due Soon</h3>
                <h2 id="dueSoon">0</h2>
            </div>

            <div class="dashboard-card">
                <h3>Upcoming Calibrations</h3>
                <h2 id="upcoming">0</h2>
            </div>

            <div class="dashboard-card">
                <h3>Failed Instruments</h3>
                <h2 id="failedInstruments">0</h2>
            </div>

        </div>
    `;

    try {
        const data = await getData("/dashboard");

        document.getElementById("totalInstruments").textContent =
            data.total_instruments;

        document.getElementById("activeInstruments").textContent =
            data.active_instruments;

        document.getElementById("overdueInstruments").textContent =
            data.overdue;

        document.getElementById("dueSoon").textContent =
            data.due_soon;

        document.getElementById("upcoming").textContent =
            data.upcoming;

        document.getElementById("failedInstruments").textContent =
            data.failed_instruments;

    } catch (error) {
        document.getElementById("content").textContent = error.message;
    }
}


async function showInstruments() {
    document.getElementById("pageTitle").textContent = "Instruments";

    document.getElementById("content").innerHTML = `
        <h3>Register New Instrument</h3>

        <form id="instrumentForm">
            <p>
                <input name="instrument_code" placeholder="Instrument Code" required>
            </p>

            <p>
                <input name="name" placeholder="Instrument Name" required>
            </p>

            <p>
                <input name="type_id" type="number" placeholder="Type ID" required>
            </p>

            <p>
                <input name="supplier_id" type="number" placeholder="Supplier ID" required>
            </p>

            <p>
                <input name="location" placeholder="Location" required>
            </p>

            <p>
                <select name="status">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </p>

            <button type="submit">Add Instrument</button>
        </form>

        <p id="formMessage"></p>

        <h3>Instrument List</h3>
         <input
    id="instrumentSearch"
    placeholder="Search instrument code or name"
    oninput="searchInstruments()"
>

        <div id="instrumentTable">Loading instruments...</div>
    `;
    

    document.getElementById("instrumentForm").addEventListener("submit", addInstrument);

    await loadInstrumentTable();
}


async function loadInstrumentTable() {
    try {
        const rows = await getData("/instruments");

        const headers = [
            "ID", "Code", "Name", "Type ID",
            "Supplier ID", "Location", "Status", "Actions"
        ];

        const head = headers.map(h =>
            `<th>${escapeHTML(h)}</th>`
        ).join("");

        const body = rows.map(row => `
            <tr>
                ${row.map(value =>
                    `<td>${escapeHTML(value)}</td>`
                ).join("")}
                <td>
                    <button class="editInstrument" data-id="${Number(row[0])}">
                        Edit
                    </button>
                    <button class="deactivateInstrument" data-id="${Number(row[0])}">
                        Deactivate
                    </button>
                </td>
            </tr>
        `).join("");

        document.getElementById("instrumentTable").innerHTML =
            `<table>
                <thead><tr>${head}</tr></thead>
                <tbody>${body}</tbody>
            </table>`;

        document.querySelectorAll(".editInstrument").forEach(button => {
            button.addEventListener("click", () => {
                editInstrument(Number(button.dataset.id));
            });
        });

        document.querySelectorAll(".deactivateInstrument").forEach(button => {
            button.addEventListener("click", () => {
                deactivateInstrument(Number(button.dataset.id));
            });
        });

    } catch (error) {
        document.getElementById("instrumentTable").textContent =
            error.message;
    }
}
 
async function addInstrument(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const instrument = {
        instrument_code: formData.get("instrument_code"),
        name: formData.get("name"),
        type_id: Number(formData.get("type_id")),
        supplier_id: Number(formData.get("supplier_id")),
        location: formData.get("location"),
        status: formData.get("status")
    };

    try {
        const response = await fetch(API + "/instruments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(instrument)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Could not add instrument");
        }

        document.getElementById("formMessage").textContent =
            "Instrument added successfully!";

        form.reset();
        await loadInstrumentTable();
        const dashboardData = await getData("/dashboard");
        document.getElementById("totalInstruments").textContent = dashboardData.total_instruments;
        document.getElementById("overdueInstruments").textContent = dashboardData.overdue;

    } catch (error) {
        document.getElementById("formMessage").textContent = error.message;
    }
}


async function editInstrument(id) {
    const rows = await getData("/instruments");
    const instrument = rows.find(row => Number(row[0]) === id);

    if (!instrument) {
        alert("Instrument not found");
        return;
    }

    const updated = {
        instrument_code: prompt("Instrument Code:", instrument[1]),
        name: prompt("Instrument Name:", instrument[2]),
        type_id: Number(prompt("Type ID:", instrument[3])),
        supplier_id: Number(prompt("Supplier ID:", instrument[4])),
        location: prompt("Location:", instrument[5]),
        status: prompt("Status (Active/Inactive):", instrument[6])
    };

    if (Object.values(updated).some(value =>
        value === null || value === "" || 
        (typeof value === "number" && !Number.isFinite(value))
    )) {
        alert("Edit cancelled or invalid information.");
        return;
    }

    try {
        const response = await fetch(API + "/instruments/" + id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updated)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Update failed");
        }

        alert("Instrument updated successfully!");
        await loadInstrumentTable();

    } catch (error) {
        alert(error.message);
    }
}


async function deactivateInstrument(id) {
    if (!confirm("Are you sure you want to deactivate this instrument?")) {
        return;
    }

    try {
        const response = await fetch(API + "/instruments/" + id, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Deactivation failed");
        }

        alert("Instrument deactivated successfully!");
        await loadInstrumentTable();

    } catch (error) {
        alert(error.message);
    }
}


async function showCalibrations() {
    document.getElementById("pageTitle").textContent = "Calibrations";

    document.getElementById("content").innerHTML = `
        <h3>Record New Calibration</h3>

        <form id="calibrationForm">
            <p>
                <input name="asset_id" type="number"
                placeholder="Instrument ID" required>
            </p>

            <p>
                <label>Calibration Date</label><br>
                <input name="calibration_date" type="date" required>
            </p>

            <p>
                <input name="frequency_months" type="number"
                placeholder="Frequency in months" min="1" required>
            </p>

            <p>
                <select name="result" required>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                </select>
            </p>

            <button type="submit">Save Calibration</button>
        </form>

        <p id="calibrationMessage"></p>

        <h3>Calibration History</h3>
        <div id="calibrationTable">Loading...</div>
    `;

    document.getElementById("calibrationForm")
        .addEventListener("submit", addCalibration);

    await loadCalibrationTable();
}

async function loadCalibrationTable() {
    try {
        const rows = await getData("/calibrations");

        const headers = [
            "ID", "Instrument ID", "Calibration Date",
            "Due Date", "Result"
        ];

        const head = headers.map(h => `<th>${escapeHTML(h)}</th>`).join("");

        if (rows.length === 0) {
    document.getElementById("calibrationTable").innerHTML =
        "<p>No calibration records found. Add your first calibration.</p>";
    return;
}

const body = rows.map(row =>
    `<tr>${row.map(value =>
        `<td>${escapeHTML(value)}</td>`
    ).join("")}</tr>`
).join("");

        document.getElementById("calibrationTable").innerHTML =
            `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

    } catch (error) {
        document.getElementById("calibrationTable").textContent = error.message;
    }
}

async function addCalibration(event) {
    event.preventDefault();

    const form = event.target;
    const data = new FormData(form);

    const calibration = {
        asset_id: Number(data.get("asset_id")),
        calibration_date: data.get("calibration_date"),
        frequency_months: Number(data.get("frequency_months")),
        result: data.get("result")
    };

    try {
        const response = await fetch(API + "/calibrations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(calibration)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Calibration failed");
        }

        document.getElementById("calibrationMessage").textContent =
            "Calibration saved! Next due date: " + result.next_due_date;

        form.reset();
        await loadCalibrationTable();

    } catch (error) {
        document.getElementById("calibrationMessage").textContent =
            error.message;
    }
}

async function showWorkOrders() {
    document.getElementById("pageTitle").textContent = "Work Orders";

    document.getElementById("content").innerHTML = `
        <h3>Create Maintenance Work Order</h3>

        <form id="workOrderForm">
            <p>
                <input
                    name="asset_id"
                    type="number"
                    placeholder="Instrument ID"
                    required
                >
            </p>

            <p>
                <input
                    name="description"
                    placeholder="Maintenance Description"
                    required
                >
            </p>

            <button type="submit">Create Work Order</button>
        </form>

        <p id="workOrderMessage"></p>

        <h3>Work Order History</h3>
        <div id="workOrderTable">Loading...</div>
    `;

    document.getElementById("workOrderForm")
        .addEventListener("submit", addWorkOrder);

    await loadWorkOrderTable();
}

async function loadWorkOrderTable() {
    try {
        const rows = await getData("/work-orders");

        if (rows.length === 0) {
            document.getElementById("workOrderTable").innerHTML =
                "<p>No work orders available.</p>";
            return;
        }

        const headers = [
            "ID", "Instrument ID", "Description", "Status", "Action"
        ];

        const head = headers.map(h =>
            `<th>${escapeHTML(h)}</th>`
        ).join("");

        const body = rows.map(row => `
            <tr>
                ${row.map(value =>
                    `<td>${escapeHTML(value)}</td>`
                ).join("")}
                <td>
                    <select class="workOrderStatus" data-id="${Number(row[0])}">
                        <option value="Open" ${row[3] === "Open" ? "selected" : ""}>Open</option>
                        <option value="In Progress" ${row[3] === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Completed" ${row[3] === "Completed" ? "selected" : ""}>Completed</option>
                    </select>
                </td>
            </tr>
        `).join("");

        document.getElementById("workOrderTable").innerHTML = `
            <table>
                <thead><tr>${head}</tr></thead>
                <tbody>${body}</tbody>
            </table>
        `;

        document.querySelectorAll(".workOrderStatus").forEach(select => {
            select.addEventListener("change", () => {
                updateWorkOrderStatus(
                    Number(select.dataset.id),
                    select.value
                );
            });
        });

    } catch (error) {
        document.getElementById("workOrderTable").textContent =
            error.message;
    }
}


async function addWorkOrder(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const workOrder = {
        asset_id: Number(formData.get("asset_id")),
        description: formData.get("description")
    };

    try {
        const response = await fetch(API + "/work-orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(workOrder)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Could not create work order");
        }

        document.getElementById("workOrderMessage").textContent =
            "Work order created successfully!";

        event.target.reset();
        await loadWorkOrderTable();

    } catch (error) {
        document.getElementById("workOrderMessage").textContent =
            error.message;
    }
}


async function updateWorkOrderStatus(id, status) {
    try {
        const response = await fetch(
            API + "/work-orders/" + id + "/status",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: status })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Status update failed");
        }

        await loadWorkOrderTable();

    } catch (error) {
        alert(error.message);
    }
}


async function loadWorkOrderTable() {
    try {
        const rows = await getData("/work-orders");

        const headers = [
            "ID", "Instrument ID", "Description", "Status", "Update Status"
        ];

        const head = headers.map(h =>
            `<th>${escapeHTML(h)}</th>`
        ).join("");

        const body = rows.map(row => `
            <tr>
                <td>${escapeHTML(row[0])}</td>
                <td>${escapeHTML(row[1])}</td>
                <td>${escapeHTML(row[2])}</td>
                <td>${escapeHTML(row[3])}</td>
                <td>
                    <select onchange="updateWorkOrderStatus(${Number(row[0])}, this.value)">
                        <option value="Open" ${row[3] === "Open" ? "selected" : ""}>Open</option>
                        <option value="In Progress" ${row[3] === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Completed" ${row[3] === "Completed" ? "selected" : ""}>Completed</option>
                    </select>
                </td>
            </tr>
        `).join("");

        document.getElementById("workOrderTable").innerHTML =
            `<table>
                <thead><tr>${head}</tr></thead>
                <tbody>${body}</tbody>
            </table>`;

    } catch (error) {
        document.getElementById("workOrderTable").textContent = error.message;
    }
}

async function updateWorkOrderStatus(id, status) {
    try {
        const response = await fetch(
            `${API}/work-orders/${id}/status?status=${encodeURIComponent(status)}`,
            { method: "PUT" }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Status update failed");
        }

        alert("Work order status updated successfully!");

        await loadWorkOrderTable();

    } catch (error) {
        alert(error.message);
    }
}


async function addWorkOrder(event) {
    event.preventDefault();

    const data = new FormData(event.target);

    const workOrder = {
        asset_id: Number(data.get("asset_id")),
        description: data.get("description")
    };

    try {
        const response = await fetch(API + "/work-orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(workOrder)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Could not create work order");
        }

        document.getElementById("workOrderMessage").textContent =
            "Work order created successfully!";

        event.target.reset();

        await loadWorkOrderTable();

    } catch (error) {
        document.getElementById("workOrderMessage").textContent =
            error.message;
    }
}


async function showCertificates() {
    document.getElementById("pageTitle").textContent = "Certificates";

    document.getElementById("content").innerHTML = `
        <h3>Add Calibration Certificate</h3>

        <form id="certificateForm">
            <p>
                <input name="asset_id" type="number"
                placeholder="Instrument ID" required>
            </p>

            <p>
                <input name="certificate_number"
                placeholder="Certificate Number" required>
            </p>

            <p>
                <input name="file_path"
                placeholder="Certificate File Path">
            </p>

            <button type="submit">Save Certificate</button>
        </form>

        <p id="certificateMessage"></p>

        <h3>Certificate Records</h3>
        <div id="certificateTable">Loading...</div>
    `;

    document.getElementById("certificateForm")
        .addEventListener("submit", addCertificate);

    await loadCertificateTable();
}

async function loadCertificateTable() {
    try {
        const rows = await getData("/certificates");

        if (rows.length === 0) {
            document.getElementById("certificateTable").innerHTML =
                "<p>No certificates available.</p>";
            return;
        }

        const headers = [
            "ID", "Instrument ID",
            "Certificate Number", "File Path"
        ];

        const head = headers.map(h =>
            `<th>${escapeHTML(h)}</th>`
        ).join("");

        const body = rows.map(row => `
            <tr>
                ${row.map(value =>
                    `<td>${escapeHTML(value)}</td>`
                ).join("")}
            </tr>
        `).join("");

        document.getElementById("certificateTable").innerHTML = `
            <table>
                <thead><tr>${head}</tr></thead>
                <tbody>${body}</tbody>
            </table>
        `;

    } catch (error) {
        document.getElementById("certificateTable").textContent =
            error.message;
    }
}


async function addCertificate(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const certificate = {
        asset_id: Number(formData.get("asset_id")),
        certificate_number: formData.get("certificate_number"),
        file_path: formData.get("file_path")
    };

    try {
        const response = await fetch(API + "/certificates", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(certificate)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Could not save certificate");
        }

        document.getElementById("certificateMessage").textContent =
            "Certificate saved successfully!";

        event.target.reset();
        await loadCertificateTable();

    } catch (error) {
        document.getElementById("certificateMessage").textContent =
            error.message;
    }
}


async function loadCertificateTable() {
    try {
        const rows = await getData("/certificates");

        const headers = [
            "ID", "Instrument ID", "Certificate Number", "File Path"
        ];

        const head = headers.map(h =>
            `<th>${escapeHTML(h)}</th>`
        ).join("");

        const body = rows.map(row =>
            `<tr>${row.map(value =>
                `<td>${escapeHTML(value)}</td>`
            ).join("")}</tr>`
        ).join("");

        document.getElementById("certificateTable").innerHTML =
            `<table>
                <thead><tr>${head}</tr></thead>
                <tbody>${body}</tbody>
            </table>`;

    } catch (error) {
        document.getElementById("certificateTable").textContent =
            error.message;
    }
}

async function addCertificate(event) {
    event.preventDefault();

    const data = new FormData(event.target);

    const certificate = {
        asset_id: Number(data.get("asset_id")),
        certificate_number: data.get("certificate_number"),
        file_path: data.get("file_path") || ""
    };

    try {
        const response = await fetch(API + "/certificates", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(certificate)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Could not save certificate");
        }

        document.getElementById("certificateMessage").textContent =
            "Certificate added successfully!";

        event.target.reset();
        await loadCertificateTable();

    } catch (error) {
        document.getElementById("certificateMessage").textContent =
            error.message;
    }
}
showDashboard();


async function showReports() {
    document.getElementById("pageTitle").textContent = "Reports";

    try {
        const data = await getData("/reports");

        document.getElementById("content").innerHTML = `
            <div class="cards">
                <div class="card">
                    <h3>Total Instruments</h3>
                    <p>${data.total_instruments}</p>
                </div>
                <div class="card">
                    <h3>Total Calibrations</h3>
                    <p>${data.total_calibrations}</p>
                </div>
                <div class="card">
                    <h3>Overdue Instruments</h3>
                    <p>${data.overdue_instruments}</p>
                </div>
                <div class="card">
                    <h3>Failed Calibrations</h3>
                    <p>${data.failed_calibrations}</p>
                </div>
                <div class="card">
                    <h3>Open Work Orders</h3>
                    <p>${data.open_work_orders}</p>
                </div>
                <div class="card">
                    <h3>In Progress Work Orders</h3>
                    <p>${data.in_progress_work_orders}</p>
                </div>
                <div class="card">
                    <h3>Completed Work Orders</h3>
                    <p>${data.completed_work_orders}</p>
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById("content").textContent = error.message;
    }
}

async function showAudit() {
    document.getElementById("pageTitle").textContent = "Audit History";

    try {
        const rows = await getData("/audit");

        showTable(
            ["ID", "Action", "Details", "Date"],
            rows
        );
    } catch (error) {
        document.getElementById("content").textContent = error.message;
    }
}

async function searchInstruments() {
    const search = document.getElementById("instrumentSearch").value.toLowerCase();

    const rows = await getData("/instruments");

    const filtered = rows.filter(row =>
        String(row[1]).toLowerCase().includes(search) ||
        String(row[2]).toLowerCase().includes(search)
    );

    showTable(
        ["ID", "Instrument Code", "Name", "Type ID", "Supplier ID", "Location", "Status"],
        filtered
    );
}

async function searchInstruments() {
    const search = document
        .getElementById("instrumentSearch")
        .value.toLowerCase();

    const rows = await getData("/instruments");

    const filtered = rows.filter(row =>
        String(row[1]).toLowerCase().includes(search) ||
        String(row[2]).toLowerCase().includes(search)
    );

    const headers = [
        "ID", "Instrument Code", "Name",
        "Type ID", "Supplier ID", "Location", "Status"
    ];

    const head = headers.map(h => `<th>${escapeHTML(h)}</th>`).join("");

    const body = filtered.map(row =>
        `<tr>${row.map(value => `<td>${escapeHTML(value)}</td>`).join("")}</tr>`
    ).join("");

    document.getElementById("instrumentTable").innerHTML =
        `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}


async function showAlerts() {
    document.getElementById("pageTitle").textContent = "Alerts";

    document.getElementById("content").innerHTML =
        "<h3>Automatic Calibration Alerts</h3>" +
        "<div id='alertTable'>Loading alerts...</div>";

    try {
        const alerts = await getData("/alerts/automatic");

        if (alerts.length === 0) {
            document.getElementById("alertTable").innerHTML =
                "<p>No upcoming calibration alerts.</p>";
            return;
        }

        const headers = [
            "Instrument Code",
            "Instrument Name",
            "Due Date",
            "Days Left",
            "Status"
        ];

        const body = alerts.map(alert => `
            <tr>
                <td>${escapeHTML(alert.instrument_code)}</td>
                <td>${escapeHTML(alert.name)}</td>
                <td>${escapeHTML(alert.due_date)}</td>
                <td>${alert.days_left}</td>
                <td>${escapeHTML(alert.status)}</td>
            </tr>
        `).join("");

        document.getElementById("alertTable").innerHTML = `
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
                </thead>
                <tbody>${body}</tbody>
            </table>
        `;

    } catch (error) {
        document.getElementById("alertTable").textContent = error.message;
    }
}

async function showImpactAssessments() {
    document.getElementById("pageTitle").textContent =
        "Impact Assessment";

    document.getElementById("content").innerHTML = `
        <h3>Record Impact Assessment</h3>

        <form id="impactForm">
            <p>
                <input name="calibration_event_id"
                    type="number"
                    placeholder="Calibration Event ID"
                    required>
            </p>

            <p>
                <textarea name="findings"
                    placeholder="Assessment Findings"
                    required></textarea>
            </p>

            <p>
                <textarea name="action_taken"
                    placeholder="Corrective Action Taken"
                    required></textarea>
            </p>

            <button type="submit">Save Assessment</button>
        </form>

        <p id="impactMessage"></p>
    `;

    document.getElementById("impactForm")
        .addEventListener("submit", addImpactAssessment);
}


async function addImpactAssessment(event) {
    event.preventDefault();

    const data = new FormData(event.target);

    const assessment = {
        calibration_event_id: Number(data.get("calibration_event_id")),
        findings: data.get("findings"),
        action_taken: data.get("action_taken")
    };

    try {
        const response = await fetch(API + "/impact-assessments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(assessment)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Assessment failed");
        }

        document.getElementById("impactMessage").textContent =
            "Impact assessment saved successfully!";

        event.target.reset();

    } catch (error) {
        document.getElementById("impactMessage").textContent =
            error.message;
    }
}
async function showImpactAssessments() {
    document.getElementById("pageTitle").textContent = "Impact Assessment";

    document.getElementById("content").innerHTML = `
        <h3>Record Impact Assessment</h3>

        <form id="impactForm">
            <input name="calibration_event_id" type="number"
                placeholder="Calibration Event ID" required>

            <textarea name="findings"
                placeholder="Assessment Findings" required></textarea>

            <textarea name="action_taken"
                placeholder="Corrective Action Taken" required></textarea>

            <button type="submit">Save Assessment</button>
        </form>

        <p id="impactMessage"></p>
    `;

    document.getElementById("impactForm")
        .addEventListener("submit", addImpactAssessment);
}

async function addImpactAssessment(event) {
    event.preventDefault();

    const data = new FormData(event.target);

    const assessment = {
        calibration_event_id: Number(data.get("calibration_event_id")),
        findings: data.get("findings"),
        action_taken: data.get("action_taken")
    };

    try {
        const response = await fetch(API + "/impact-assessments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(assessment)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Could not save assessment");
        }

        document.getElementById("impactMessage").textContent =
            "Impact assessment saved successfully!";

        event.target.reset();

    } catch (error) {
        document.getElementById("impactMessage").textContent = error.message;
    }
}
