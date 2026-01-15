-- CreateTable
CREATE TABLE "PlannedRoute" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "waypoints" JSONB NOT NULL,
    "totalDistance" DOUBLE PRECISION,
    "estimatedTime" INTEGER,
    "elevationGain" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannedRoute_userId_idx" ON "PlannedRoute"("userId");

-- CreateIndex
CREATE INDEX "PlannedRoute_isDemo_idx" ON "PlannedRoute"("isDemo");

-- AddForeignKey
ALTER TABLE "PlannedRoute" ADD CONSTRAINT "PlannedRoute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
