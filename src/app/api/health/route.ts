import { NextResponse } from 'next/server';

export async function GET() {
  const healthcheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  return NextResponse.json(healthcheck, { status: 200 });
}
