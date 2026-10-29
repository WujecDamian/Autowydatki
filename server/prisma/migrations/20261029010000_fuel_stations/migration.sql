-- AlterTable
ALTER TABLE "fuel_entries" ADD COLUMN     "station_id" INTEGER;

-- CreateTable
CREATE TABLE "fuel_stations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" TEXT NOT NULL,

    CONSTRAINT "fuel_stations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fuel_stations_user_id_idx" ON "fuel_stations"("user_id");

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "fuel_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_stations" ADD CONSTRAINT "fuel_stations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Built-in Polish fuel station brands (user_id NULL)
INSERT INTO "fuel_stations" ("name") VALUES
    ('Orlen'),
    ('BP'),
    ('Shell'),
    ('Circle K'),
    ('MOL'),
    ('Moya'),
    ('Amic Energy'),
    ('Avia'),
    ('Huzar'),
    ('Auchan'),
    ('Carrefour'),
    ('Intermarché'),
    ('Leclerc');
