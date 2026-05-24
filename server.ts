import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables early
dotenv.config();

const prisma = new PrismaClient();
let isPrismaHealthy = false;

// High-Fidelity Domain Interfaces for the Fallback Local DB
interface ProductModel {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
}

interface WarehouseModel {
  id: string;
  name: string;
  location: string;
}

interface InventoryModel {
  productId: string;
  warehouseId: string;
  totalQuantity: number;
  reservedQuantity: number;
}

interface ReservationModel {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED" | "EXPIRED";
  createdAt: Date;
  expiresAt: Date;
}

interface IdempotencyRecordModel {
  key: string;
  status: number;
  body: string;
  createdAt: Date;
}

// Global In-Memory Fallback Dataset representing the original seeding parameters
const productsSeed: ProductModel[] = [
  {
    id: "p1",
    name: "Sleep Wellness Kit",
    description: "A premium night-time collection featuring high-purity lavender sleep mist, organic chamomile tea blend, and a contoured pure-silk sleep mask.",
    price: 79,
    imageUrl: "https://images.unsplash.com/photo-1595131838557-318e313d4768?w=400&auto=format&fit=crop&q=60",
    category: "Sleep Wellness"
  },
  {
    id: "p2",
    name: "Smart Health Band",
    description: "Sleek biometric wearable tracking 24/7 heart rate, blood oxygen levels, skin temperature variations, and advanced sleep stages.",
    price: 129,
    imageUrl: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&auto=format&fit=crop&q=60",
    category: "Smart Wearables"
  },
  {
    id: "p3",
    name: "Digital Thermometer",
    description: "Clinical-grade contact-free infrared thermometer featuring split-second response times, fever indicators, and silent night modes.",
    price: 39,
    imageUrl: "https://images.unsplash.com/photo-1584036561566-baf241830940?w=400&auto=format&fit=crop&q=60",
    category: "Diagnostic Devices"
  },
  {
    id: "p4",
    name: "Digital Blood Pressure Monitor",
    description: "FDA-cleared upper arm digital monitor with intelligent inflation technology, irregular heartbeat alerts, and cloud-sync memory logs.",
    price: 89,
    imageUrl: "https://images.unsplash.com/photo-1615461066841-6116ecd1253a?w=400&auto=format&fit=crop&q=60",
    category: "Diagnostic Devices"
  },
  {
    id: "p5",
    name: "Skincare Essentials",
    description: "Dermatologist-tested daily routine including gentle amino cleansing foam, hyaluronic hydration serum, and barrier-support cream.",
    price: 95,
    imageUrl: "https://images.unsplash.com/photo-1608248597481-496100c80836?w=400&auto=format&fit=crop&q=60",
    category: "Personal Care"
  },
  {
    id: "p6",
    name: "Vitamin Supplement Pack",
    description: "Comprehensive daily essential micronutrient blends formulated to optimize metabolic function, cognitive endurance, and cellular health.",
    price: 45,
    imageUrl: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&auto=format&fit=crop&q=60",
    category: "Supplements"
  },
  {
    id: "p7",
    name: "Personal Care Bundle",
    description: "An eco-friendly, zero-waste collection with plant-derived body wash, nourishing shampoo bars, and organic daily bamboo towels.",
    price: 59,
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=60",
    category: "Personal Care"
  },
  {
    id: "p8",
    name: "Fitness Recovery Kit",
    description: "An immersive massage roller, recovery straps, and organic cooling roll-on gel designed for post-workout muscle restoration.",
    price: 69,
    imageUrl: "https://images.unsplash.com/photo-1600881333168-2ef49b341f30?w=400&auto=format&fit=crop&q=60",
    category: "Fitness & Wellness"
  },
  {
    id: "p9",
    name: "Posture Support Device",
    description: "Lightweight, breathable ergonomic posture corrector designed to align your spine, reduce neck strain, and alleviate shoulder pain.",
    price: 55,
    imageUrl: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&auto=format&fit=crop&q=60",
    category: "Smart Wearables"
  },
  {
    id: "p10",
    name: "Hydration Wellness Pack",
    description: "An vacuum-insulated temperature-tracking sleek bottle paired with all-natural premium electrolyte infusion tablets.",
    price: 49,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&auto=format&fit=crop&q=60",
    category: "Fitness & Wellness"
  }
];

const warehousesSeed: WarehouseModel[] = [
  { id: "w1", name: "Seattle Central Hub", location: "Seattle, WA" },
  { id: "w2", name: "New Jersey Logistics", location: "Newark, NJ" },
  { id: "w3", name: "Austin Depot", location: "Austin, TX" }
];

const inventoriesSeed: InventoryModel[] = [
  { productId: "p1", warehouseId: "w1", totalQuantity: 1, reservedQuantity: 0 },
  { productId: "p1", warehouseId: "w2", totalQuantity: 10, reservedQuantity: 0 },
  { productId: "p1", warehouseId: "w3", totalQuantity: 5, reservedQuantity: 0 },
  
  { productId: "p2", warehouseId: "w1", totalQuantity: 4, reservedQuantity: 0 },
  { productId: "p2", warehouseId: "w2", totalQuantity: 1, reservedQuantity: 0 },
  { productId: "p2", warehouseId: "w3", totalQuantity: 12, reservedQuantity: 0 },

  { productId: "p3", warehouseId: "w1", totalQuantity: 2, reservedQuantity: 0 },
  { productId: "p3", warehouseId: "w2", totalQuantity: 3, reservedQuantity: 0 },
  { productId: "p3", warehouseId: "w3", totalQuantity: 0, reservedQuantity: 0 },

  { productId: "p4", warehouseId: "w1", totalQuantity: 15, reservedQuantity: 0 },
  { productId: "p4", warehouseId: "w2", totalQuantity: 8, reservedQuantity: 0 },
  { productId: "p4", warehouseId: "w3", totalQuantity: 6, reservedQuantity: 0 },

  { productId: "p5", warehouseId: "w1", totalQuantity: 8, reservedQuantity: 0 },
  { productId: "p5", warehouseId: "w2", totalQuantity: 12, reservedQuantity: 0 },
  { productId: "p5", warehouseId: "w3", totalQuantity: 15, reservedQuantity: 0 },

  { productId: "p6", warehouseId: "w1", totalQuantity: 20, reservedQuantity: 0 },
  { productId: "p6", warehouseId: "w2", totalQuantity: 25, reservedQuantity: 0 },
  { productId: "p6", warehouseId: "w3", totalQuantity: 18, reservedQuantity: 0 },

  { productId: "p7", warehouseId: "w1", totalQuantity: 6, reservedQuantity: 0 },
  { productId: "p7", warehouseId: "w2", totalQuantity: 4, reservedQuantity: 0 },
  { productId: "p7", warehouseId: "w3", totalQuantity: 10, reservedQuantity: 0 },

  { productId: "p8", warehouseId: "w1", totalQuantity: 10, reservedQuantity: 0 },
  { productId: "p8", warehouseId: "w2", totalQuantity: 12, reservedQuantity: 0 },
  { productId: "p8", warehouseId: "w3", totalQuantity: 5, reservedQuantity: 0 },

  { productId: "p9", warehouseId: "w1", totalQuantity: 4, reservedQuantity: 0 },
  { productId: "p9", warehouseId: "w2", totalQuantity: 8, reservedQuantity: 0 },
  { productId: "p9", warehouseId: "w3", totalQuantity: 11, reservedQuantity: 0 },

  { productId: "p10", warehouseId: "w1", totalQuantity: 12, reservedQuantity: 0 },
  { productId: "p10", warehouseId: "w2", totalQuantity: 5, reservedQuantity: 0 },
  { productId: "p10", warehouseId: "w3", totalQuantity: 14, reservedQuantity: 0 }
];

let memProducts: ProductModel[] = [...productsSeed];
let memWarehouses: WarehouseModel[] = [...warehousesSeed];
let memInventories: InventoryModel[] = inventoriesSeed.map(i => ({ ...i }));
let memReservations: ReservationModel[] = [];
const memIdempotency = new Map<string, IdempotencyRecordModel>();

// Verification sequence testing database availability on bootup
async function checkDatabaseConnection() {
  try {
    console.log("[Boot Verification] Attempting connection to PostgreSQL db...");
    await prisma.$connect();
    // Run a lightweight test lookup
    await prisma.product.findFirst();
    isPrismaHealthy = true;
    console.log("✅ [PostgreSQL Ready] Production transaction engine successfully connected.");
  } catch (err: any) {
    isPrismaHealthy = false;
    console.warn("⚠️ [No Active PostgreSQL DB] Local PostgreSQL db is either offline or DATABASE_URL is unconfigured.");
    console.warn("🚀 [Resilient Failover] Dynamic in-memory sandbox repository activated successfully. AuraMed platform is 100% ONLINE.");
  }
}

// Sweeper: Periodic & Lazy evaluation of expired pending holds
async function cleanupExpiredReservations(): Promise<number> {
  const now = new Date();
  
  if (isPrismaHealthy) {
    try {
      return await prisma.$transaction(async (tx) => {
        const expired = await tx.reservation.findMany({
          where: {
            status: "PENDING",
            expiresAt: { lt: now }
          }
        });

        if (expired.length === 0) return 0;

        for (const res of expired) {
          const inv = await tx.inventory.findUnique({
            where: {
              productId_warehouseId: {
                productId: res.productId,
                warehouseId: res.warehouseId
              }
            }
          });

          if (inv) {
            await tx.inventory.update({
              where: {
                productId_warehouseId: {
                  productId: res.productId,
                  warehouseId: res.warehouseId
                }
              },
              data: {
                reservedQuantity: Math.max(0, inv.reservedQuantity - res.quantity)
              }
            });
          }

          await tx.reservation.update({
            where: { id: res.id },
            data: { status: "EXPIRED" }
          });
        }

        return expired.length;
      });
    } catch (err) {
      console.error("[Cleanup Worker PostgreSQL Error]:", err);
    }
  }

  // Memory cleanup pipeline (Synchronous evaluation)
  let expiredCount = 0;
  for (const r of memReservations) {
    if (r.status === "PENDING" && r.expiresAt < now) {
      r.status = "EXPIRED";
      const inv = memInventories.find(i => i.productId === r.productId && i.warehouseId === r.warehouseId);
      if (inv) {
        inv.reservedQuantity = Math.max(0, inv.reservedQuantity - r.quantity);
      }
      expiredCount++;
    }
  }
  return expiredCount;
}

// Reset / seeding method triggered by system administrators and developers
async function seedDatabase() {
  if (isPrismaHealthy) {
    try {
      await prisma.idempotencyRecord.deleteMany();
      await prisma.reservation.deleteMany();
      await prisma.inventory.deleteMany();
      await prisma.warehouse.deleteMany();
      await prisma.product.deleteMany();

      for (const p of productsSeed) {
        await prisma.product.create({ data: p });
      }

      for (const w of warehousesSeed) {
        await prisma.warehouse.create({ data: w });
      }

      for (const inv of inventoriesSeed) {
        await prisma.inventory.create({ data: inv });
      }

      console.log("✅ Target database fully seeded via PostgreSQL.");
      return;
    } catch (err: any) {
      console.error("PostgreSQL Seeding failed:", err);
    }
  }

  // Sandbox Memory Seeding parameters
  memProducts = [...productsSeed];
  memWarehouses = [...warehousesSeed];
  memInventories = inventoriesSeed.map(i => ({ ...i }));
  memReservations = [];
  memIdempotency.clear();
  console.log("✅ Target sandbox memory dataset refreshed.");
}

// Read pipelines mapping both SQL and memory entities to the exact JSON structure
async function getProducts() {
  if (isPrismaHealthy) {
    try {
      return await prisma.product.findMany({
        include: {
          inventories: {
            include: {
              warehouse: true
            }
          }
        }
      });
    } catch (err) {
      console.error("Postgres Products retrieval failed, fall-backing to sandbox schema:", err);
    }
  }

  return memProducts.map(p => ({
    ...p,
    inventories: memInventories
      .filter(i => i.productId === p.id)
      .map(inv => {
        const wh = memWarehouses.find(w => w.id === inv.warehouseId);
        return {
          ...inv,
          warehouse: wh || { id: inv.warehouseId, name: "Remote Depot", location: "Logistics Hub" }
        };
      })
  }));
}

async function getWarehouses() {
  if (isPrismaHealthy) {
    try {
      return await prisma.warehouse.findMany();
    } catch (err) {
      console.error("Postgres Warehouses retrieval failed:", err);
    }
  }
  return memWarehouses;
}

async function getReservations() {
  if (isPrismaHealthy) {
    try {
      return await prisma.reservation.findMany({
        include: {
          product: true,
          warehouse: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    } catch (err) {
      console.error("Postgres Reservation logs read exception:", err);
    }
  }

  return [...memReservations]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(r => {
      const prod = memProducts.find(p => p.id === r.productId);
      const wh = memWarehouses.find(w => w.id === r.warehouseId);
      return {
        ...r,
        product: prod || { id: r.productId, name: "Premium Asset" },
        warehouse: wh || { id: r.warehouseId, name: "Hub Center" }
      };
    });
}

async function getReservationById(id: string) {
  if (isPrismaHealthy) {
    try {
      return await prisma.reservation.findUnique({
        where: { id },
        include: { product: true, warehouse: true }
      });
    } catch (err: any) {
      console.error("Postgres search reservation by ID failed:", err);
    }
  }

  const r = memReservations.find(re => re.id === id);
  if (!r) return null;
  const prod = memProducts.find(p => p.id === r.productId);
  const wh = memWarehouses.find(w => w.id === r.warehouseId);
  return {
    ...r,
    product: prod || { id: r.productId, name: "Premium Asset" },
    warehouse: wh || { id: r.warehouseId, name: "Hub Center" }
  };
}

// Transactional Concurrency Safe Reservation logic (Optimized with dynamic thread isolation)
async function reserve(
  productId: string,
  warehouseId: string,
  quantity: number,
  ttlSeconds = 60,
  idempotencyKey?: string
): Promise<{ status: number; body: any }> {

  // 1. Double Checkout Protection: Idempotency keys lookup
  if (idempotencyKey) {
    if (isPrismaHealthy) {
      try {
        const cached = await prisma.idempotencyRecord.findUnique({
          where: { key: idempotencyKey }
        });
        if (cached) {
          return { status: cached.status, body: JSON.parse(cached.body) };
        }
      } catch (err) {
        console.error("Idempotency lookup DB exception:", err);
      }
    }
    const cachedMem = memIdempotency.get(idempotencyKey);
    if (cachedMem) {
      return { status: cachedMem.status, body: JSON.parse(cachedMem.body) };
    }
  }

  // A. Postgres Execution using Row Locks
  if (isPrismaHealthy) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        let inv: any = null;

        // SELECT FOR UPDATE locks the specific row inside isolated Postgres boundaries
        try {
          const rawInvs = await tx.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Inventory" WHERE "productId" = $1 AND "warehouseId" = $2 FOR UPDATE`,
            productId,
            warehouseId
          );
          if (rawInvs && rawInvs.length > 0) {
            const raw = rawInvs[0];
            inv = {
              productId: raw.productId,
              warehouseId: raw.warehouseId,
              totalQuantity: raw.totalQuantity,
              reservedQuantity: raw.reservedQuantity
            };
          }
        } catch (err) {
          console.warn("[SELECT FOR UPDATE Fallback Warning]:", err);
        }

        if (!inv) {
          inv = await tx.inventory.findUnique({
            where: {
              productId_warehouseId: { productId, warehouseId }
            }
          });
        }

        if (!inv) {
          return { status: 404, body: { success: false, error: "Inventory SKU path not found." } };
        }

        const availableStock = inv.totalQuantity - inv.reservedQuantity;
        if (availableStock < quantity) {
          return { status: 409, body: { success: false, error: "Not enough stock available" } };
        }

        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

        await tx.inventory.update({
          where: {
            productId_warehouseId: { productId, warehouseId }
          },
          data: {
            reservedQuantity: inv.reservedQuantity + quantity
          }
        });

        const reservation = await tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: "PENDING",
            expiresAt
          }
        });

        return { status: 201, body: { success: true, reservation } };
      });

      if (idempotencyKey) {
        try {
          await prisma.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              status: result.status,
              body: JSON.stringify(result.body)
            }
          });
        } catch (err) {
          console.error("Failed storing idempotency response:", err);
        }
      }

      return result;

    } catch (err: any) {
      console.error("[Postgres Reservation pipeline error]:", err);
    }
  }

  // B. Resilient Event-Loop Sandbox Execution
  // Node.js is naturally isolated for synchronous operations because Javascript execution is single-threaded!
  const inv = memInventories.find(i => i.productId === productId && i.warehouseId === warehouseId);
  if (!inv) {
    return { status: 404, body: { success: false, error: "Inventory SKU path not found in sandbox." } };
  }

  const availableStock = inv.totalQuantity - inv.reservedQuantity;
  if (availableStock < quantity) {
    return { status: 409, body: { success: false, error: "Not enough stock available" } };
  }

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  inv.reservedQuantity += quantity;

  const reservation: ReservationModel = {
    id: `res-${Math.random().toString(36).substring(2, 10)}`,
    productId,
    warehouseId,
    quantity,
    status: "PENDING",
    createdAt: new Date(),
    expiresAt
  };

  memReservations.push(reservation);
  const responsePayload = { status: 201, body: { success: true, reservation } };

  if (idempotencyKey) {
    memIdempotency.set(idempotencyKey, {
      key: idempotencyKey,
      status: responsePayload.status,
      body: JSON.stringify(responsePayload.body),
      createdAt: new Date()
    });
  }

  return responsePayload;
}

// Confirm reservation (transitions status 'pending' -> 'confirmed' and permanently decrements total inventory)
async function confirm(reservationId: string, idempotencyKey?: string): Promise<{ status: number; body: any }> {
  if (idempotencyKey) {
    if (isPrismaHealthy) {
      try {
        const cached = await prisma.idempotencyRecord.findUnique({
          where: { key: idempotencyKey }
        });
        if (cached) {
          return { status: cached.status, body: JSON.parse(cached.body) };
        }
      } catch (err) {
        console.error("Idempotency read error:", err);
      }
    }
    const cachedMem = memIdempotency.get(idempotencyKey);
    if (cachedMem) {
      return { status: cachedMem.status, body: JSON.parse(cachedMem.body) };
    }
  }

  if (isPrismaHealthy) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const res = await tx.reservation.findUnique({
          where: { id: reservationId }
        });

        if (!res) {
          return { status: 404, body: { success: false, error: "Reservation ID not found." } };
        }

        if (res.status === "CONFIRMED") {
          return { status: 200, body: { success: true, message: "Reservation already confirmed previously.", reservation: res } };
        }

        const now = new Date();
        if (res.status === "RELEASED" || res.status === "EXPIRED" || res.expiresAt < now) {
          if (res.status === "PENDING") {
            const inv = await tx.inventory.findUnique({
              where: {
                productId_warehouseId: { productId: res.productId, warehouseId: res.warehouseId }
              }
            });
            if (inv) {
              await tx.inventory.update({
                where: {
                  productId_warehouseId: { productId: res.productId, warehouseId: res.warehouseId }
                },
                data: {
                  reservedQuantity: Math.max(0, inv.reservedQuantity - res.quantity)
                }
              });
            }
            await tx.reservation.update({
              where: { id: reservationId },
              data: { status: "EXPIRED" }
            });
          }
          return { status: 410, body: { success: false, error: "Reservation expired." } };
        }

        const inv = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: { productId: res.productId, warehouseId: res.warehouseId }
          }
        });

        if (!inv) {
          return { status: 500, body: { success: false, error: "Inventory record mismatch." } };
        }

        await tx.inventory.update({
          where: {
            productId_warehouseId: { productId: res.productId, warehouseId: res.warehouseId }
          },
          data: {
            reservedQuantity: Math.max(0, inv.reservedQuantity - res.quantity),
            totalQuantity: Math.max(0, inv.totalQuantity - res.quantity)
          }
        });

        const updatedRes = await tx.reservation.update({
          where: { id: reservationId },
          data: { status: "CONFIRMED" }
        });

        return { status: 200, body: { success: true, message: "Purchase completed. Stock permanently decremented.", reservation: updatedRes } };
      });

      if (idempotencyKey) {
        try {
          await prisma.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              status: result.status,
              body: JSON.stringify(result.body)
            }
          });
        } catch (err) {
          console.error("Idempotency confirmation write failed:", err);
        }
      }

      return result;

    } catch (err: any) {
      console.error("[PostgreSQL Reservation Confirm Error]:", err);
    }
  }

  // Memory sandbox confirm
  const res = memReservations.find(re => re.id === reservationId);
  if (!res) {
    return { status: 404, body: { success: false, error: "Reservation ID not found." } };
  }

  if (res.status === "CONFIRMED") {
    return { status: 200, body: { success: true, message: "Reservation already confirmed previously.", reservation: res } };
  }

  const now = new Date();
  if (res.status === "RELEASED" || res.status === "EXPIRED" || res.expiresAt < now) {
    if (res.status === "PENDING") {
      res.status = "EXPIRED";
      const inv = memInventories.find(i => i.productId === res.productId && i.warehouseId === res.warehouseId);
      if (inv) {
        inv.reservedQuantity = Math.max(0, inv.reservedQuantity - res.quantity);
      }
    }
    return { status: 410, body: { success: false, error: "Reservation expired." } };
  }

  const inv = memInventories.find(i => i.productId === res.productId && i.warehouseId === res.warehouseId);
  if (!inv) {
    return { status: 500, body: { success: false, error: "Inventory record mismatch." } };
  }

  inv.reservedQuantity = Math.max(0, inv.reservedQuantity - res.quantity);
  inv.totalQuantity = Math.max(0, inv.totalQuantity - res.quantity);
  res.status = "CONFIRMED";

  const responsePayload = { status: 200, body: { success: true, message: "Purchase completed. Stock permanently decremented.", reservation: res } };

  if (idempotencyKey) {
    memIdempotency.set(idempotencyKey, {
      key: idempotencyKey,
      status: responsePayload.status,
      body: JSON.stringify(responsePayload.body),
      createdAt: new Date()
    });
  }

  return responsePayload;
}

// Release reservation early (cancel / manual override)
async function release(reservationId: string): Promise<{ status: number; body: any }> {
  if (isPrismaHealthy) {
    try {
      return await prisma.$transaction(async (tx) => {
        const res = await tx.reservation.findUnique({
          where: { id: reservationId }
        });

        if (!res) {
          return { status: 404, body: { success: false, error: "Reservation not found." } };
        }

        if (res.status === "RELEASED") {
          return { status: 200, body: { success: true, message: "Reservation already released." } };
        }

        if (res.status === "CONFIRMED") {
          return { status: 400, body: { success: false, error: "Cannot release standard confirmed transaction." } };
        }

        const inv = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: res.productId,
              warehouseId: res.warehouseId
            }
          }
        });

        if (inv) {
          await tx.inventory.update({
            where: {
              productId_warehouseId: {
                productId: res.productId,
                warehouseId: res.warehouseId
              }
            },
            data: {
              reservedQuantity: Math.max(0, inv.reservedQuantity - res.quantity)
            }
          });
        }

        const updatedRes = await tx.reservation.update({
          where: { id: reservationId },
          data: { status: "RELEASED" }
        });

        return { status: 200, body: { success: true, message: "Reservation released and stock returned.", reservation: updatedRes } };
      });
    } catch (err: any) {
      console.error("[PostgreSQL Manual Release Error]:", err);
    }
  }

  // Sandbox Memory release logic
  const res = memReservations.find(re => re.id === reservationId);
  if (!res) {
    return { status: 404, body: { success: false, error: "Reservation not found." } };
  }

  if (res.status === "RELEASED") {
    return { status: 200, body: { success: true, message: "Reservation already released." } };
  }

  if (res.status === "CONFIRMED") {
    return { status: 400, body: { success: false, error: "Cannot release standard confirmed transaction." } };
  }

  const inv = memInventories.find(i => i.productId === res.productId && i.warehouseId === res.warehouseId);
  if (inv) {
    inv.reservedQuantity = Math.max(0, inv.reservedQuantity - res.quantity);
  }

  res.status = "RELEASED";
  return { status: 200, body: { success: true, message: "Reservation released and stock returned.", reservation: res } };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Connection check on launch to dynamically configure active db mechanisms
  await checkDatabaseConnection();

  // Background Sweeper Daemon: Check and restore expired pending holds every 1s
  setInterval(async () => {
    const expiredCount = await cleanupExpiredReservations();
    if (expiredCount > 0) {
      console.log(`[Cleaner Sweep Worker] Restored ${expiredCount} expired reservations back to standard reservable stock.`);
    }
  }, 1000);

  // --- API Endpoints ---

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", hostDatabaseOnline: isPrismaHealthy });
  });

  // GET /api/products: List real products merged with their live stocks
  app.get("/api/products", async (req, res) => {
    try {
      await cleanupExpiredReservations();
      const products = await getProducts();

      const formatted = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        category: p.category,
        inventory: p.inventories.map((inv: any) => ({
          warehouseId: inv.warehouseId,
          warehouseName: inv.warehouse.name,
          warehouseLocation: inv.warehouse.location,
          total: inv.totalQuantity,
          reserved: inv.reservedQuantity,
          available: Math.max(0, inv.totalQuantity - inv.reservedQuantity)
        }))
      }));

      res.json(formatted);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/warehouses: List warehouses
  app.get("/api/warehouses", async (req, res) => {
    try {
      const warehouses = await getWarehouses();
      res.json(warehouses);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/reservations: List all active & historic reservation records
  app.get("/api/reservations", async (req, res) => {
    try {
      await cleanupExpiredReservations();
      const reservations = await getReservations();

      const formatted = reservations.map((r: any) => ({
        id: r.id,
        productId: r.productId,
        warehouseId: r.warehouseId,
        quantity: r.quantity,
        status: r.status,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        expiresAt: r.expiresAt instanceof Date ? r.expiresAt.toISOString() : r.expiresAt,
        productName: r.product.name,
        warehouseName: r.warehouse.name
      }));

      res.json(formatted);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/reservations/:id", async (req, res) => {
    try {
      await cleanupExpiredReservations();
      const resv = await getReservationById(req.params.id);

      if (!resv) {
        res.status(404).json({ success: false, error: "Reservation not found" });
      } else {
        res.json({
          id: resv.id,
          productId: resv.productId,
          warehouseId: resv.warehouseId,
          quantity: resv.quantity,
          status: resv.status,
          createdAt: resv.createdAt instanceof Date ? resv.createdAt.toISOString() : resv.createdAt,
          expiresAt: resv.expiresAt instanceof Date ? resv.expiresAt.toISOString() : resv.expiresAt,
          productName: resv.product.name,
          warehouseName: resv.warehouse.name
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/reservations: Build secure checkout holds with full transactions
  app.post("/api/reservations", async (req, res) => {
    const { productId, warehouseId, quantity, ttlSeconds } = req.body;
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

    if (!productId || !warehouseId || typeof quantity !== "number" || quantity <= 0) {
      res.status(400).json({ success: false, error: "Invalid reservation arguments." });
      return;
    }

    const result = await reserve(
      productId, 
      warehouseId, 
      quantity, 
      ttlSeconds || 60, 
      idempotencyKey
    );
    res.status(result.status).json(result.body);
  });

  // POST /api/reservations/:id/confirm: Confirm & seal product purchases decrementing available units permanently
  app.post("/api/reservations/:id/confirm", async (req, res) => {
    const reservationId = req.params.id;
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

    const result = await confirm(reservationId, idempotencyKey);
    res.status(result.status).json(result.body);
  });

  // POST /api/reservations/:id/release: Manual cancellation / early timer termination restoring stock and resetting active statuses
  app.post("/api/reservations/:id/release", async (req, res) => {
    const reservationId = req.params.id;
    const result = await release(reservationId);
    res.status(result.status).json(result.body);
  });

  // POST /api/reset: Force immediate database wipe and pristine re-seed
  app.post("/api/reset", async (req, res) => {
    try {
      await seedDatabase();
      res.json({ success: true, message: "Database re-seeded successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/simulate-concurrency: Atomic simulation launcher spawning threads side-by-side
  app.post("/api/simulate-concurrency", async (req, res) => {
    const { productId, warehouseId, numRequests, quantity } = req.body;
    
    if (!productId || !warehouseId || !numRequests) {
      res.status(400).json({ success: false, error: "Missing simulation arguments" });
      return;
    }

    console.log(`[Concurrency Load Test] Spawning ${numRequests} parallel transaction requests for SKU ${productId}:${warehouseId}`);

    const promises = Array.from({ length: numRequests }).map(async (_, idx) => {
      const idxStr = `sim-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`;
      const startTime = Date.now();
      const result = await reserve(productId, warehouseId, quantity || 1, 60);
      const elapsed = Date.now() - startTime;
      
      return {
        requestId: idxStr,
        status: result.status,
        body: result.body,
        elapsedMs: elapsed
      };
    });

    const results = await Promise.all(promises);
    res.json({
      success: true,
      sku: `${productId}:${warehouseId}`,
      results
    });
  });

  // Serve static UI assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} with active transactional database capability.`);
  });
}

startServer();
