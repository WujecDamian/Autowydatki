-- DropForeignKey
ALTER TABLE "fuel_entries" DROP CONSTRAINT "fuel_entries_car_id_fkey";

-- DropForeignKey
ALTER TABLE "service_entries" DROP CONSTRAINT "service_entries_car_id_fkey";

-- AlterTable
ALTER TABLE "cars" ADD COLUMN     "ac_valid_until" DATE,
ADD COLUMN     "inspection_valid_until" DATE,
ADD COLUMN     "oc_valid_until" DATE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_entries" ADD CONSTRAINT "service_entries_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

