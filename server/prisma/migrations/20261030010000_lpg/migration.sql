-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'LPG');

-- AlterTable
ALTER TABLE "cars" ADD COLUMN     "has_lpg" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "fuel_entries" ADD COLUMN     "fuel_type" "FuelType" NOT NULL DEFAULT 'PETROL';

