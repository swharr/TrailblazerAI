-- CreateTable
CREATE TABLE IF NOT EXISTS "AIProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "keyIv" TEXT,
    "keyAuthTag" TEXT,
    "encryptedSecretKey" TEXT,
    "secretKeyIv" TEXT,
    "secretKeyAuthTag" TEXT,
    "awsRegion" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isJudgeModel" BOOLEAN NOT NULL DEFAULT false,
    "defaultModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AIProviderConfig_provider_key" ON "AIProviderConfig"("provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIProviderConfig_provider_idx" ON "AIProviderConfig"("provider");

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrailSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "location" TEXT NOT NULL,
    "searchRadius" INTEGER,
    "difficultyPref" TEXT,
    "tripLength" TEXT,
    "sceneryTypes" TEXT[],
    "results" JSONB NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "searchSummary" TEXT,
    "vehicleCapabilityScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrailSearch_userId_idx" ON "TrailSearch"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrailSearch_createdAt_idx" ON "TrailSearch"("createdAt");

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrailSearch_userId_fkey') THEN
        ALTER TABLE "TrailSearch" ADD CONSTRAINT "TrailSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrailSearch_vehicleId_fkey') THEN
        ALTER TABLE "TrailSearch" ADD CONSTRAINT "TrailSearch_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "VehicleProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add columns to PlannedRoute if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PlannedRoute' AND column_name = 'isPublic') THEN
        ALTER TABLE "PlannedRoute" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PlannedRoute' AND column_name = 'shareToken') THEN
        ALTER TABLE "PlannedRoute" ADD COLUMN "shareToken" TEXT;
    END IF;
END $$;

-- CreateIndex for PlannedRoute shareToken
CREATE UNIQUE INDEX IF NOT EXISTS "PlannedRoute_shareToken_key" ON "PlannedRoute"("shareToken");
CREATE INDEX IF NOT EXISTS "PlannedRoute_shareToken_idx" ON "PlannedRoute"("shareToken");
