import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma client with adapter
const prisma = new PrismaClient({
  adapter,
});

// Sample route: Mojave Road - a famous off-road trail in California
const DEMO_ROUTE = {
  name: 'Mojave Road Adventure',
  description:
    'The historic Mojave Road stretches 138 miles across the Mojave Desert, following an ancient Native American trade route. This challenging trail features sandy washes, rocky climbs, and stunning desert vistas.',
  status: 'planned',
  isDemo: true,
  totalDistance: 138.0,
  estimatedTime: 720, // 12 hours
  elevationGain: 4500,
  waypoints: [
    {
      lat: 35.0089,
      lng: -115.4739,
      name: 'Camp Rock Spring',
      type: 'start',
      elevation: 4200,
    },
    {
      lat: 35.0756,
      lng: -115.3267,
      name: 'Marl Springs',
      type: 'water',
      elevation: 3100,
    },
    {
      lat: 35.1442,
      lng: -115.0542,
      name: 'Kelso Dunes Viewpoint',
      type: 'viewpoint',
      elevation: 2800,
    },
    {
      lat: 35.1617,
      lng: -115.0153,
      name: 'Kelso Depot',
      type: 'waypoint',
      elevation: 2126,
    },
    {
      lat: 35.2106,
      lng: -114.8789,
      name: 'Rock House Ruins',
      type: 'waypoint',
      elevation: 2450,
    },
    {
      lat: 35.1053,
      lng: -114.6753,
      name: 'Fort Piute Campsite',
      type: 'campsite',
      elevation: 3200,
    },
    {
      lat: 35.0789,
      lng: -114.5867,
      name: 'Piute Creek Crossing',
      type: 'hazard',
      elevation: 2900,
    },
    {
      lat: 35.0272,
      lng: -114.5431,
      name: 'Needles - End Point',
      type: 'end',
      elevation: 500,
    },
  ],
};

async function main() {
  console.log('Seeding demo route...');

  // Check if demo route already exists
  const existingDemo = await prisma.plannedRoute.findFirst({
    where: { isDemo: true },
  });

  if (existingDemo) {
    console.log('Demo route already exists. Updating...');
    await prisma.plannedRoute.update({
      where: { id: existingDemo.id },
      data: {
        name: DEMO_ROUTE.name,
        description: DEMO_ROUTE.description,
        status: DEMO_ROUTE.status,
        waypoints: DEMO_ROUTE.waypoints,
        totalDistance: DEMO_ROUTE.totalDistance,
        estimatedTime: DEMO_ROUTE.estimatedTime,
        elevationGain: DEMO_ROUTE.elevationGain,
      },
    });
    console.log('Demo route updated:', existingDemo.id);
  } else {
    const demoRoute = await prisma.plannedRoute.create({
      data: {
        userId: null, // No user for demo route
        name: DEMO_ROUTE.name,
        description: DEMO_ROUTE.description,
        status: DEMO_ROUTE.status,
        isDemo: true,
        waypoints: DEMO_ROUTE.waypoints,
        totalDistance: DEMO_ROUTE.totalDistance,
        estimatedTime: DEMO_ROUTE.estimatedTime,
        elevationGain: DEMO_ROUTE.elevationGain,
      },
    });
    console.log('Demo route created:', demoRoute.id);
  }

  console.log('Demo route seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding demo route:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
