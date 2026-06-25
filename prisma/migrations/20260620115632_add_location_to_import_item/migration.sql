-- AlterTable
ALTER TABLE "ImportItem" ADD COLUMN     "locationId" TEXT;

-- AddForeignKey
ALTER TABLE "ImportItem" ADD CONSTRAINT "ImportItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
