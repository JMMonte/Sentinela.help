-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('COMMENT', 'ESCALATE', 'DEESCALATE', 'SOLVED');

-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN     "type" "ContributionType" NOT NULL DEFAULT 'COMMENT';
