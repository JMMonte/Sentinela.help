-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN     "weatherSnapshot" JSONB;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "weatherSnapshot" JSONB;
