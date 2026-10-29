-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('REPAIR', 'INSPECTION');

-- CreateTable
CREATE TABLE "service_items" (
    "id" SERIAL NOT NULL,
    "service_entry_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_items_service_entry_id_idx" ON "service_items"("service_entry_id");

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_service_entry_id_fkey" FOREIGN KEY ("service_entry_id") REFERENCES "service_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Each existing entry becomes one "Inne" item, so its total stays the same.
INSERT INTO "service_items" ("service_entry_id", "category", "name", "cost")
SELECT "id", 'Inne', "title", "cost" FROM "service_entries";

-- AlterTable
ALTER TABLE "service_entries" DROP COLUMN "cost",
ADD COLUMN     "kind" "ServiceKind" NOT NULL DEFAULT 'REPAIR',
ALTER COLUMN "title" DROP NOT NULL;
