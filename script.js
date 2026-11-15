
// ======================================
// ATTENDX - SMART ATTENDANCE SYSTEM
// ======================================

const STORAGE_KEY = "ATTENDX_DATA";

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function getTime() {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
        return JSON.parse(saved);
    }

    return {
        students: [
            {
                name: "Aarav Mehta",
                roll: "CSE2301",
                course: "B.Tech CSE",
                email: "aarav@gmail.com"
            },
            {
                name: "Diya Sharma",
                roll: "CSE2302",
                course: "B.Tech CSE",
                email: "diya@gmail.com"
            },
            {
                name: "Kabir Das",
                roll: "CSE2303",
                course: "B.Tech CSE",
                email: "kabir@gmail.com"
            }
        ],

        records: [
            {
                roll: "CSE2301",
                date: getToday(),
                time: "09:00 AM",
                method: "QR Scan",
                status: "Present"
            }
        ],

        session: null
    };
}

let database = loadData();
let activeSession = database.session || null;
let html5Scanner = null;


// SAVE DATABASE

function saveData() {
    database.session = activeSession;

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(database)
    );

    renderAll();
}


// TOAST MESSAGE

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


// PAGE NAVIGATION

function showPage(page, element) {

    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
    });

    document.getElementById(page).classList.add("active");

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });

    if (element) {
        element.classList.add("active");
    } else {
        document.querySelectorAll(".nav-link").forEach(link => {
            if (link.getAttribute("onclick").includes(page)) {
                link.classList.add("active");
            }
        });
    }

    const titles = {
        dashboard: "Dashboard ✦",
        students: "Student Directory",
        attendance: "Attendance Records",
        qr: "QR Sessions",
        reports: "Attendance Reports"
    };

    document.getElementById("pageTitle").textContent = titles[page];

    renderAll();
}


// ADD STUDENT

document.getElementById("studentForm").addEventListener("submit", function(e) {

    e.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const roll = document.getElementById("studentRoll").value.trim().toUpperCase();
    const course = document.getElementById("studentCourse").value.trim();
    const email = document.getElementById("studentEmail").value.trim();

    const exists = database.students.some(student =>
        student.roll.toUpperCase() === roll
    );

    if (exists) {
        showToast("Roll number already exists!");
        return;
    }

    database.students.push({
        name,
        roll,
        course,
        email
    });

    this.reset();

    saveData();

    showToast("Student registered successfully!");
});


// DELETE STUDENT

function deleteStudent(roll) {

    if (!confirm("Are you sure you want to delete this student?")) {
        return;
    }

    database.students = database.students.filter(student =>
        student.roll !== roll
    );

    saveData();

    showToast("Student deleted.");
}


// STUDENT DIRECTORY

function renderStudents() {

    const table = document.getElementById("studentsTable");

    const search = (
        document.getElementById("studentSearch")?.value || ""
    ).toLowerCase();

    const filtered = database.students.filter(student =>
        `${student.name} ${student.roll} ${student.course}`
            .toLowerCase()
            .includes(search)
    );

    table.innerHTML = "";

    filtered.forEach(student => {

        table.innerHTML += `
            <tr>
                <td>${escapeHTML(student.name)}</td>
                <td>${escapeHTML(student.roll)}</td>
                <td>${escapeHTML(student.course)}</td>
                <td>${escapeHTML(student.email)}</td>
                <td>
                    <button class="secondary-btn"
                    onclick="deleteStudent('${escapeHTML(student.roll)}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById("totalStudents").textContent =
        database.students.length;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

document.getElementById("studentSearch").addEventListener(
    "input",
    renderStudents
);


// FIND STUDENT

function findStudent(roll) {

    return database.students.find(student =>
        student.roll.toUpperCase() === roll.trim().toUpperCase()
    );
}


// MARK ATTENDANCE

function markAttendance(roll, method = "Manual") {

    const student = findStudent(roll);

    if (!student) {
        showToast("Student not found!");
        return;
    }

    const alreadyMarked = database.records.some(record =>
        record.roll === student.roll &&
        record.date === getToday()
    );

    if (alreadyMarked) {
        showToast("Attendance already marked!");
        return;
    }

    database.records.push({
        roll: student.roll,
        date: getToday(),
        time: getTime(),
        method: method,
        status: "Present"
    });

    saveData();

    showToast("Attendance marked successfully!");
}


// QR CODE GENERATION

function generateQR() {

    const name = document.getElementById("sessionName").value.trim();

    const duration = Number(
        document.getElementById("duration").value
    );

    if (!name) {
        showToast("Enter subject name!");
        return;
    }

    activeSession = {
        id: "AX-" + Date.now(),
        name: name,
        expiresAt: Date.now() + duration * 60000
    };

    database.session = activeSession;

    saveData();

    document.getElementById("qrcode").innerHTML = "";

    if (!window.QRCode) {
        showToast("QR library unavailable. Check internet.");
        return;
    }

    new QRCode(document.getElementById("qrcode"), {
        text: JSON.stringify(activeSession),
        width: 170,
        height: 170,
        colorDark: "#10172b",
        colorLight: "#ffffff"
    });

    document.getElementById("sessionInfo").textContent =
        name + " | Valid for " + duration + " minutes";

    showToast("QR session generated!");
}


// CHECK QR SESSION

function verifySession(rawData) {

    let scanned;

    try {
        scanned = JSON.parse(rawData);
    } catch (error) {
        showToast("Invalid QR code!");
        return;
    }

    if (
        !activeSession ||
        scanned.id !== activeSession.id ||
        Date.now() > activeSession.expiresAt
    ) {
        showToast("QR session expired or invalid!");
        return;
    }

    const roll = prompt("Enter your registered roll number:");

    if (roll) {
        markAttendance(roll, "QR Scan");
    }
}


// MANUAL ATTENDANCE

function manualAttendance() {

    if (!activeSession || Date.now() > activeSession.expiresAt) {
        showToast("No active QR session!");
        return;
    }

    const roll = document.getElementById("manualRoll").value.trim();

    if (!roll) {
        showToast("Enter roll number!");
        return;
    }

    markAttendance(roll, "Manual Demo");

    document.getElementById("manualRoll").value = "";
}


// START QR SCANNER

function startScanner() {

    if (!window.Html5Qrcode) {
        showToast("QR scanner library unavailable.");
        return;
    }

    html5Scanner = new Html5Qrcode("reader");

    html5Scanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: 220
        },

        decodedText => {

            verifySession(decodedText);

            stopScanner();
        },

        () => {}
    ).catch(() => {
        showToast("Camera unavailable. Use manual attendance.");
    });
}


// STOP QR SCANNER

function stopScanner() {

    if (html5Scanner) {

        html5Scanner.stop()
            .then(() => html5Scanner.clear())
            .catch(() => {});

        html5Scanner = null;
    }
}


// ATTENDANCE TABLE

function renderAttendance() {

    const table = document.getElementById("attendanceTable");

    table.innerHTML = "";

    [...database.records].reverse().forEach(record => {

        const student = findStudent(record.roll);

        const name = student ? student.name : "Unknown";

        table.innerHTML += `
            <tr>
                <td>${escapeHTML(name)}</td>
                <td>${escapeHTML(record.roll)}</td>
                <td>${escapeHTML(record.date)}</td>
                <td>${escapeHTML(record.time)}</td>
                <td>${escapeHTML(record.method)}</td>
                <td>
                    <span class="status present">
                        ${escapeHTML(record.status)}
                    </span>
                </td>
            </tr>
        `;
    });
}


// DASHBOARD STATISTICS

function renderDashboard() {

    const todayRecords = database.records.filter(record =>
        record.date === getToday()
    );

    const uniqueRolls = new Set(
        todayRecords.map(record => record.roll)
    );

    const total = database.students.length;
    const present = uniqueRolls.size;
    const absent = Math.max(0, total - present);

    const percentage = total > 0
        ? Math.round((present / total) * 100)
        : 0;

    document.getElementById("totalStudents").textContent = total;
    document.getElementById("presentToday").textContent = present;
    document.getElementById("absentToday").textContent = absent;
    document.getElementById("attendanceRate").textContent = percentage + "%";

    document.getElementById("circlePercentage").textContent =
        percentage + "%";

    document.getElementById("progressCircle").style.background =
        `conic-gradient(#36d7e8 ${percentage}%, #29334d ${percentage}%)`;

    const recentTable = document.getElementById("recentTable");

    recentTable.innerHTML = "";

    [...todayRecords].reverse().slice(0, 5).forEach(record => {

        const student = findStudent(record.roll);

        recentTable.innerHTML += `
            <tr>
                <td>${escapeHTML(student?.name || "Unknown")}</td>
                <td>${escapeHTML(record.roll)}</td>
                <td>${escapeHTML(record.date)}</td>
                <td>${escapeHTML(record.time)}</td>
                <td><span class="status present">Present</span></td>
            </tr>
        `;
    });
}


// REPORTS

function renderReports() {

    document.getElementById("reportTotal").textContent =
        database.students.length;

    document.getElementById("reportChecks").textContent =
        database.records.length;

    const table = document.getElementById("reportsTable");

    table.innerHTML = "";

    let lowAttendance = 0;

    database.students.forEach(student => {

        const records = database.records.filter(record =>
            record.roll === student.roll
        );

        const present = records.filter(record =>
            record.status === "Present" || record.status === "Late"
        ).length;

        const percentage = records.length
            ? Math.round((present / records.length) * 100)
            : 0;

        if (records.length > 0 && percentage < 75) {
            lowAttendance++;
        }

        table.innerHTML += `
            <tr>
                <td>${escapeHTML(student.name)}</td>
                <td>${escapeHTML(student.roll)}</td>
                <td>${present}</td>
                <td>${percentage}%</td>
                <td>
                    ${records.length === 0
                        ? "No data"
                        : percentage < 75
                            ? '<span class="status absent">Low</span>'
                            : '<span class="status present">Good</span>'
                    }
                </td>
            </tr>
        `;
    });

    document.getElementById("reportLow").textContent = lowAttendance;
}


// EXPORT CSV

function exportCSV() {

    const rows = [
        ["Name", "Roll Number", "Date", "Time", "Method", "Status"]
    ];

    database.records.forEach(record => {

        const student = findStudent(record.roll);

        rows.push([
            student?.name || "Unknown",
            record.roll,
            record.date,
            record.time,
            record.method,
            record.status
        ]);
    });

    const csv = rows.map(row =>
        row.map(value =>
            '"' + String(value).replace(/"/g, '""') + '"'
        ).join(",")
    ).join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "ATTENDX_Attendance.csv";

    link.click();

    URL.revokeObjectURL(link.href);

    showToast("Attendance report downloaded!");
}


// RENDER EVERYTHING

function renderAll() {

    renderStudents();
    renderDashboard();
    renderAttendance();
    renderReports();
}


// INITIALIZE

renderAll();
