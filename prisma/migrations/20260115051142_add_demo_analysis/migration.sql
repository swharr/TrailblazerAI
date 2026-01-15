-- AlterTable
ALTER TABLE "TrailAnalysis" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "TrailAnalysis_isDemo_idx" ON "TrailAnalysis"("isDemo");
