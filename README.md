readme 


# 🎓 Scholar Sync

![React](https://img.shields.io/badge/Frontend-React-blue)
![Node](https://img.shields.io/badge/Backend-Node.js-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)
![Python](https://img.shields.io/badge/ML-Python-yellow)
![Status](https://img.shields.io/badge/Status-Active-success)

> 🚀 **AI-powered study group formation platform for smarter collaborative learning**

---

## 📌 Table of Contents

* [✨ Overview](#-overview)
* [🧠 Key Features](#-key-features)
* [🏗️ Architecture](#️-architecture)
* [⚙️ Tech Stack](#️-tech-stack)
* [🔄 Application Flow](#-application-flow)
* [🤖 Matching Algorithm](#-matching-algorithm)
* [📁 Project Structure](#-project-structure)
* [🚀 Installation](#-installation)
* [🧪 Environment Variables](#-environment-variables)
* [🔐 Security](#-security)
* [📈 Future Scope](#-future-scope)
* [👨‍💻 Contributors](#-contributors)
* [📜 License](#-license)

---

## ✨ Overview

**Scholar Sync** is an intelligent full‑stack web application that forms highly compatible study groups using machine learning. Instead of random grouping, the system analyzes user skills, interests, and learning goals to recommend the best learning partners.

The platform improves:

* ✅ Collaboration quality
* ✅ Learning efficiency
* ✅ Group compatibility
* ✅ Student engagement

---

## 🧠 Key Features

### 🎯 Smart Matching

* AI-based compatibility scoring
* Skill and interest analysis
* Personalized partner recommendations

### 💬 Real-Time Communication

* One-to-one chat
* Group chat rooms
* Socket-based live messaging

### 🤖 AI Assistant

* Floating AI widget
* Instant guidance
* Learning support

### 👤 User Management

* Secure authentication
* Profile customization
* Protected routes

### 📊 Dashboard

* Activity overview
* Match insights
* Group management


```

### 📊 Dashboard

```
/screenshots/dashboard.png
```

### 🤝 Skill Matching

```
/screenshots/match.png
```

### 💬 Chat Interface

```
/screenshots/chat.png
```

---

## 🏗️ Architecture

```
User → React Frontend → Node/Express API → MongoDB
                               ↓
                        Python ML Service
                               ↓
                         Matching Results
```

**Architecture Type:** Microservice-assisted full stack

---

## ⚙️ Tech Stack

### Frontend

* React (Vite)
* React Router
* CSS3
* Socket.io Client

### Backend

* Node.js
* Express.js
* MongoDB

### Machine Learning

* Python
* TF-IDF Vectorizer
* Cosine Similarity
* PCA (visualization)

---

## 🔄 Application Flow

1. User registers and logs in
2. User completes profile with skills
3. Skills converted to vectors
4. Similarity computed via ML model
5. Best matches recommended
6. Users connect via chat
7. AI assistant provides help

---

## 🤖 Matching Algorithm

Scholar Sync uses a **content-based similarity approach**:

### Step 1: Text Vectorization

* TF-IDF converts skills into numerical vectors

### Step 2: Similarity Computation

* Cosine similarity measures compatibility

### Step 3: Ranking

* Users ranked by highest similarity score

### Step 4 (Optional): Visualization

* PCA reduces dimensions for cluster view

**Why this works:**

* Fast
* Scalable
* Interpretable
* Works well for skill matching

---

## 📁 Project Structure

```
Scholar-Sync/
│
├── backend/
│   ├── server.js
│   └── ...
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIChat.jsx
│   │   │   ├── AIWidget.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── GroupChat.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── SignUp.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Groups.jsx
│   │   │   └── SkillMatch.jsx
│   │   │
│   │   ├── services/
│   │   │   └── socketService.jsx
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
└── README.md

```

---

## 🚀 Installation

###  Clone Repository

```bash
git clone https://github.com/Revathi054/Scholar-Sync-
cd scholar-sync
```

## 💻 System Requirements

- Node.js 18+ (LTS Recommended)
- npm 9+
- MongoDB 6+
- Python 3.10+
- pip (latest)

Download Node.js (LTS): https://nodejs.org

---



## ⚙️ Installation & Run (Development Mode)

### Backend

cd backend
npm install
npm install mailer groq-sdk
node server.js
### Start Development Server

Backend runs on:
http://localhost:5000


---

### Frontend

Open a new terminal:

cd frontend
npm install
npm run dev



App runs at:

```
http://localhost:5173
```

---

## 🧪 Environment Variables

Create a `.env` file in the root:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🔐 Security

* Protected routes
* Token-based authentication
* Secure API communication
* Input validation

---

## 📈 Future Scope

* 🧠 Deep learning recommendations
* 📱 Mobile application
* 🎥 Video conferencing integration
* 📊 Advanced analytics
* 🌐 Multi-language support
* 🧩 Graph-based matching

---

## 👨‍💻 Contributors

-N.Siri Lasya Priya-[nsiri369](https://github.com/nsiri369)

-K.Deekshitha - [Deekshitha Kammela](https://github.com/Deekshithaa-06 )

-K.Lalitha Sri-[K.Lalitha sri](https://github.com/Lalitha-2006 )

-K.Venkata Naga Sowmya-[SowmyaKurapati26](https://github.com/SowmyaKurapati26 )

-K.Revathi-[K.Revathi](https://github.com/Deekshithaa-06 )



---

## ⭐ Support

If you like this project:

* ⭐ Star the repository
* 🍴 Fork the project
* 🐛 Report issues
* 💡 Suggest features

---

## 📜 License

This project is developed for academic and educational purposes.

---

> 💡 *Scholar Sync — Making collaborative learning intelligent.*
