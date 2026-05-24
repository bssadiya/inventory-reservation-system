# Inventory Reservation System

An AI-assisted real-time inventory reservation platform designed to manage product reservations, prevent stock conflicts, and simulate concurrent user transactions efficiently.

## Live Demo

🌐 Deployment: [https://allo-inventory-reservation-system-bu2m.onrender.com/](https://allo-inventory-reservation-system-bu2m.onrender.com/)

---

# Features

* Real-time inventory reservation system
* Concurrent reservation simulation
* Product availability monitoring
* Reservation tracking dashboard
* Checkout workflow implementation
* Authentication-based access flow
* Responsive and interactive UI
* Prisma-based database integration
* REST API backend using Express
* Modern React frontend with Vite

---

# Tech Stack

## Frontend

* React 19
* TypeScript
* Vite
* Tailwind CSS
* Framer Motion
* Lucide React

## Backend

* Node.js
* Express.js
* TypeScript

## Database & ORM

* Prisma ORM

## Deployment

* Render

---

# Project Structure

```bash
inventory-reservation-system/
│
├── components/                 # Shared UI components
├── lib/services/               # Reservation business logic
├── prisma/                     # Prisma schema and seed data
├── src/                        # Frontend source files
│   ├── components/
│   ├── App.tsx
│   └── main.tsx
│
├── server.ts                   # Express server
├── vite.config.ts              # Vite configuration
├── package.json
└── README.md
```

---

# Installation & Setup

## 1. Clone the Repository

```bash
git clone <your-repository-url>
cd inventory-reservation-system
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment Variables

Create a `.env` file in the root directory.

Example:

```env
DATABASE_URL="your_database_url"
PORT=3000
```

---

# Database Setup

## Generate Prisma Client

```bash
npx prisma generate
```

## Run Database Migrations

```bash
npx prisma migrate dev
```

## Seed Sample Data

```bash
npx prisma db seed
```

---

# Running the Project

## Development Mode

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Start Production Server

```bash
npm start
```

---

# Key Functionalities

## Reservation Management

The system temporarily locks inventory items during checkout to avoid overselling and race conditions.

## Concurrency Simulation

Simulates multiple users reserving products simultaneously to test system consistency and reliability.

## Monitoring Dashboard

Tracks reservation states, product availability, and transaction activity in real time.

---

# API Overview

Example endpoints used in the project:

```http
GET    /api/products
POST   /api/reserve
POST   /api/checkout
GET    /api/reservations
```

---

# Screens Included

* Login Page
* Product Listing
* Reservation Flow
* Checkout Interface
* Reservation Monitor
* Concurrency Simulator

---

# Future Enhancements

* Redis-based distributed locking
* WebSocket real-time updates
* Payment gateway integration
* Role-based admin dashboard
* Inventory analytics dashboard
* Notification system
* Multi-warehouse support

---

# Learning Outcomes

This project demonstrates:

* Full-stack application development
* Real-time reservation logic
* Handling concurrent transactions
* Backend API design
* Database schema modeling using Prisma
* State management in React
* Deployment and production hosting

---

# Author

**Sadiya**

Built as a full-stack project focused on inventory management, concurrency handling, and scalable reservation workflows.

---

# License

This project is licensed under the MIT License.
