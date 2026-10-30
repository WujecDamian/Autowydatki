-- CreateEnum
CREATE TYPE "Powertrain" AS ENUM ('PETROL', 'ELECTRIC');

-- AlterEnum
ALTER TYPE "FuelType" ADD VALUE 'ELECTRIC';

-- AlterTable
ALTER TABLE "cars" ADD COLUMN     "powertrain" "Powertrain" NOT NULL DEFAULT 'PETROL';

-- The amount is litres for petrol and LPG, kWh for electric cars.
ALTER TABLE "fuel_entries" RENAME COLUMN "liters" TO "quantity";
ALTER TABLE "fuel_entries" RENAME CONSTRAINT "fuel_entries_liters_max_check" TO "fuel_entries_quantity_max_check";

-- AlterTable
ALTER TABLE "fuel_stations" ADD COLUMN     "is_charging" BOOLEAN NOT NULL DEFAULT false;

-- Built-in charging networks (user_id NULL)
INSERT INTO "fuel_stations" ("name", "is_charging") VALUES
    ('Ładowanie w domu', true),
    ('Orlen Charge', true),
    ('GreenWay', true),
    ('Tesla Supercharger', true),
    ('Ionity', true),
    ('PowerDot', true),
    ('Shell Recharge', true),
    ('Elocity', true);
