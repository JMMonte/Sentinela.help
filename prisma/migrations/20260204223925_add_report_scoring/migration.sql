-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "deescalateCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "escalateCount" INTEGER NOT NULL DEFAULT 0;
