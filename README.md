# AuraMed Hub: Transaction-Safe Inventory Reservation Platform
Live Demo
[
🌐 AuraMed Hub Live Application](https://allo-inventory-reservation-system-bu2m.onrender.com/?utm_source=chatgpt.com)
A production-ready full-stack warehouse inventory reservation system built with **Prisma ORM**, **PostgreSQL**, and **React 19**. This repository implements optimistic and pessimistic row-level transaction safety designed to eliminate stock race conditions (double allocation/overselling) under high-concurrency checkout volumes.

---

## 🏗️ System Architecture & Concurrency Strategy

In high-concurrency checkout environments, a race condition occurs when concurrent threads check inventory availability before writing reservation entries. If multiple requests proceed simultaneously, they can collectively reserve more stock than is physically available, resulting in a negative inventory state (overbooking).

### 1. Pessimistic Row Locking (`SELECT FOR UPDATE`)

To guarantee absolute inventory consistency at the database level, the checking and reserve sequence are wrapped inside an exclusive relational transaction:

1. **Transaction Ingress:** Start a serial database transaction context.
2. **Deterministic Locking:** Issue a pessimistic row lock using `SELECT * FROM "Inventory" WHERE "productId" = $1 AND "warehouseId" = $2 FOR UPDATE`. This blocks concurrent PostgreSQL requests from modifying or reading this specific inventory record until the active transaction commits or aborts.
3. **Availability Assertion:** Calculate matching stock level boundaries (`totalQuantity - reservedQuantity`). If the requested quantity exceeds the available balance, roll back the transaction and return an `HTTP 409 Conflict` payload.
4. **Atomic Decrement:** Increment the target `reservedQuantity` inside the isolated database block.
5. **Reservation Capture:** Insert a new `Reservation` record with the status `PENDING` and a precise expiration timestamp (TTL).
6. **Commit:** Release the row lock and persist the changes.

```typescript
// PostgreSQL Native Connection Row Locking Flow
const result = await prisma.$transaction(async (tx) => {
  const inventoryRows = await tx.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Inventory" WHERE "productId" = $1 AND "warehouseId" = $2 FOR UPDATE`,
    productId,
    warehouseId
  );
  // ... check stock, update reservedQuantity, and return reservation
});
```

### 2. Idempotency Control (Double-Click Protection)

To prevent duplicate stock deductions from network retries or user double-clicking, write actions support an robust **Idempotency Key Protocol**:
- Clients send a unique request signature in the `Idempotency-Key` HTTP header.
- The server caches resolved response payloads in the `IdempotencyRecord` table.
- Repeat requests with the same key instantly bypass database engines and retrieve the cached response payload.

### 3. Automated Lazy Hold Reclamations & Cleanup Daemon

To ensure that abandoned reservations do not permanently lock stock, we enforce a customizable Time-to-Live (TTL):
- **Lazy Evaluation:** Before querying catalog volumes, the system resolves and releases expired `PENDING` states on matching SKUs on the fly.
- **Active Cleanup Daemon:** A lightweight internal system background runner tick-cycles every 1000ms checking for expired `PENDING` holds, releasing the stock back to the reservoir, and transitioning the reservation records to the `EXPIRED` status.

---

## 🗄️ Database Schema & Models

Our PostgreSQL Prisma schema uses indexed relations to optimize frequent lookup queries:

- **`Product`**: Healthcare and wellness catalog definition.
- **`Warehouse`**: Regional logistics fulfillment centers (Seattle, New Jersey, Austin).
- **`Inventory`**: Joining table tracking `totalQuantity` and `reservedQuantity` per SKU (`productId` + `warehouseId`).
- **`Reservation`**: Individual customer checkout hold logs with an explicit `ReservationStatus` enum (`PENDING`, `CONFIRMED`, `RELEASED`, `EXPIRED`).
- **`IdempotencyRecord`**: Caches response objects paired with client session transaction keys.

---

## 🛠️ Quick Start & Local Execution

### 1. Project Setup
Install packages:
```bash
npm install
```

### 2. Configure Environment Secrets
Create a `.env` file at the root:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auramed_reservations?schema=public"
APP_URL="http://localhost:3000"
```

### 3. Generate the Prisma Client
Generate production types for the PostgreSQL schema:
```bash
npx prisma generate
```

### 4. Apply Schema Migrations & Database Seeding
To deploy schema definitions to your active PostgreSQL instance and seed standard healthcare/wellness products:
```bash
# Push schema structure directly to the database
npx prisma db push

# Execute database seeding
npx tsx prisma/seed.ts
```

### 5. Start Development Server
```bash
npm run dev
```

---

## 🚀 Production Deployment Configurations

### 1. Database Provisioning
Our architecture is optimized out of the box for hosted PostgreSQL vendors like **Supabase** or **Neon**. Create an instance and extract your pooled `DATABASE_URL` connection string.

### 2. App Platform Setup (e.g., Render, Vercel, Cloud Run)
Configure environment secrets:
- Set `DATABASE_URL` to your hosted Postgres URL.
- Run database migrations prior to launch:
  ```bash
  npx prisma db push && npx tsx prisma/seed.ts
  ```

---

## ⏳ Architectural Trade-offs in Distributed Scale

| Strategy | Technical Isolation | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Pessimistic Row Locking (This System)** | Relational Row Locking (`SELECT FOR UPDATE`) | 100% atomic consistency; handles deep relations safely inside Database transaction bounds. | Concurrently queuing transaction threads can bottleneck database input pools under extreme hot-key traffic. |
| **Optimistic Concurrency Control (OCC)** | Version / Timestamp Verification on update | Higher concurrent read throughput under low-conflict conditions. | Concurrent collisions trigger elevated retry overhead and rollback transaction loops. |
| **Distributed Memory Locks** | Redis / Redlock lease keys | Ultra-low API latency bounds; horizontal scaling decoupled from database engines. | Relies heavily on external system synchronization; requires precise failure-scenario handle design. |
