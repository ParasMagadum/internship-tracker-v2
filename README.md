# 🎓 InternLog — Internship Daily Report Tracker

A full-stack web application for tracking internship daily reports with Student and Mentor portals.

## ✨ Features

### Student Portal
- 📝 Submit daily reports with multiple tasks
- 📅 View all past reports and their review status
- 💡 Log learnings, challenges, and next-day plans
- ⬇️ Export personal reports to Excel
- 📊 Dashboard with stats (total, reviewed, monthly)

### Mentor Portal
- 👨‍🎓 View all registered students at a glance
- 📋 Browse all student reports with filters
- 💬 Add feedback and star ratings to reports
- ⬇️ Export all or filtered reports to Excel
- 🔔 See pending review count

### Excel Export
- Two sheets: "Daily Reports" and "Student Summary"
- Color-coded rows (reviewed = green)
- Proper formatting with headers and column widths

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB (local or MongoDB Atlas)
- npm

### 1. Clone / Extract the project
```bash
cd internship-tracker
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment
Edit `backend/.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/internship_tracker
JWT_SECRET=your_secret_key_here
```

For MongoDB Atlas, replace MONGO_URI with your connection string.

### 4. Start MongoDB (if using local)
```bash
mongod
```

### 5. Start the Backend Server
```bash
cd backend
npm run dev    # development (with nodemon)
# or
npm start      # production
```

### 6. Open the App
Open your browser and go to:
```
http://localhost:5000
```

---

## 📁 Project Structure

```
internship-tracker/
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema (student & mentor)
│   │   └── Report.js        # Daily report schema
│   ├── routes/
│   │   ├── auth.js          # Login, register, user routes
│   │   ├── reports.js       # CRUD for reports + feedback
│   │   └── export.js        # Excel export
│   ├── middleware/
│   │   └── auth.js          # JWT authentication
│   ├── server.js            # Express app
│   ├── .env                 # Environment variables
│   └── package.json
└── frontend/
    ├── index.html           # Main HTML
    ├── css/
    │   └── style.css        # All styles
    └── js/
        └── app.js           # Frontend logic
```

---

## 🔐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register student or mentor |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/auth/students | Get all students (mentor) |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reports | Submit report (student) |
| GET | /api/reports/my | Get my reports (student) |
| GET | /api/reports/stats/my | Get my stats (student) |
| PUT | /api/reports/:id | Update report (student) |
| GET | /api/reports/all | Get all reports (mentor) |
| PATCH | /api/reports/:id/feedback | Add feedback (mentor) |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/export/excel | Download Excel file |
| GET | /api/export/excel?studentId=xxx | Export specific student |

---

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Excel**: excel4node
- **Password Hashing**: bcryptjs
