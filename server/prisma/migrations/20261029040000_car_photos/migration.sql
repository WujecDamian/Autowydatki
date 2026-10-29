-- AlterTable
ALTER TABLE "cars" ADD COLUMN     "cover_photo_id" INTEGER;

-- CreateTable
CREATE TABLE "car_photos" (
    "id" SERIAL NOT NULL,
    "car_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "car_photos_car_id_idx" ON "car_photos"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "cars_cover_photo_id_key" ON "cars"("cover_photo_id");

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_cover_photo_id_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "car_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_photos" ADD CONSTRAINT "car_photos_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_photos" ADD CONSTRAINT "car_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

