import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data in correct structural sequence
  await prisma.idempotencyRecord.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.product.deleteMany();

  // Create products
  const products = [
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

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  // Create warehouses
  const warehouses = [
    { id: "w1", name: "Seattle Central Hub", location: "Seattle, WA" },
    { id: "w2", name: "New Jersey Logistics", location: "Newark, NJ" },
    { id: "w3", name: "Austin Depot", location: "Austin, TX" }
  ];

  for (const w of warehouses) {
    await prisma.warehouse.create({ data: w });
  }

  // Create inventory links
  const inventoryData = [
    // Sleep Wellness Kit
    { productId: "p1", warehouseId: "w1", totalQuantity: 1, reservedQuantity: 0 },
    { productId: "p1", warehouseId: "w2", totalQuantity: 10, reservedQuantity: 0 },
    { productId: "p1", warehouseId: "w3", totalQuantity: 5, reservedQuantity: 0 },
    
    // Smart Health Band
    { productId: "p2", warehouseId: "w1", totalQuantity: 4, reservedQuantity: 0 },
    { productId: "p2", warehouseId: "w2", totalQuantity: 1, reservedQuantity: 0 },
    { productId: "p2", warehouseId: "w3", totalQuantity: 12, reservedQuantity: 0 },

    // Digital Thermometer
    { productId: "p3", warehouseId: "w1", totalQuantity: 2, reservedQuantity: 0 },
    { productId: "p3", warehouseId: "w2", totalQuantity: 3, reservedQuantity: 0 },
    { productId: "p3", warehouseId: "w3", totalQuantity: 0, reservedQuantity: 0 },

    // Digital Blood Pressure Monitor
    { productId: "p4", warehouseId: "w1", totalQuantity: 15, reservedQuantity: 0 },
    { productId: "p4", warehouseId: "w2", totalQuantity: 8, reservedQuantity: 0 },
    { productId: "p4", warehouseId: "w3", totalQuantity: 6, reservedQuantity: 0 },

    // Skincare Essentials
    { productId: "p5", warehouseId: "w1", totalQuantity: 8, reservedQuantity: 0 },
    { productId: "p5", warehouseId: "w2", totalQuantity: 12, reservedQuantity: 0 },
    { productId: "p5", warehouseId: "w3", totalQuantity: 15, reservedQuantity: 0 },

    // Vitamin Supplement Pack
    { productId: "p6", warehouseId: "w1", totalQuantity: 20, reservedQuantity: 0 },
    { productId: "p6", warehouseId: "w2", totalQuantity: 25, reservedQuantity: 0 },
    { productId: "p6", warehouseId: "w3", totalQuantity: 18, reservedQuantity: 0 },

    // Personal Care Bundle
    { productId: "p7", warehouseId: "w1", totalQuantity: 6, reservedQuantity: 0 },
    { productId: "p7", warehouseId: "w2", totalQuantity: 4, reservedQuantity: 0 },
    { productId: "p7", warehouseId: "w3", totalQuantity: 10, reservedQuantity: 0 },

    // Fitness Recovery Kit
    { productId: "p8", warehouseId: "w1", totalQuantity: 10, reservedQuantity: 0 },
    { productId: "p8", warehouseId: "w2", totalQuantity: 12, reservedQuantity: 0 },
    { productId: "p8", warehouseId: "w3", totalQuantity: 5, reservedQuantity: 0 },

    // Posture Support Device
    { productId: "p9", warehouseId: "w1", totalQuantity: 4, reservedQuantity: 0 },
    { productId: "p9", warehouseId: "w2", totalQuantity: 8, reservedQuantity: 0 },
    { productId: "p9", warehouseId: "w3", totalQuantity: 11, reservedQuantity: 0 },

    // Hydration Wellness Pack
    { productId: "p10", warehouseId: "w1", totalQuantity: 12, reservedQuantity: 0 },
    { productId: "p10", warehouseId: "w2", totalQuantity: 5, reservedQuantity: 0 },
    { productId: "p10", warehouseId: "w3", totalQuantity: 14, reservedQuantity: 0 }
  ];

  for (const inv of inventoryData) {
    await prisma.inventory.create({ data: inv });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
