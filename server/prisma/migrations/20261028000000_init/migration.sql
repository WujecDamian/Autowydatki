-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cars" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "purchase_price" DECIMAL(12,2),

    CONSTRAINT "cars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_entries" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "car_id" INTEGER NOT NULL,
    "entry_date" DATE NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "liters" DECIMAL(8,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "fuel_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_entries" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "car_id" INTEGER NOT NULL,
    "entry_date" DATE NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "service_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_entries" ADD CONSTRAINT "service_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_entries" ADD CONSTRAINT "service_entries_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CHECK constraints (Prisma schema cannot express these)
ALTER TABLE "cars" ADD CONSTRAINT "cars_purchase_price_check" CHECK ("purchase_price" >= 0);
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_odometer_km_check" CHECK ("odometer_km" >= 0);
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_liters_check" CHECK ("liters" > 0);
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_total_cost_check" CHECK ("total_cost" >= 0);
ALTER TABLE "service_entries" ADD CONSTRAINT "service_entries_odometer_km_check" CHECK ("odometer_km" >= 0);
ALTER TABLE "service_entries" ADD CONSTRAINT "service_entries_cost_check" CHECK ("cost" >= 0);
