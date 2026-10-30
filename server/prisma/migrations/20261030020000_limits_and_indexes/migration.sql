-- Upper bounds and a missing lower bound. The API validates the same limits (server/src/schemas.js);
-- these are the last line of defence if a bug or a direct database write skips the API.
-- NOT VALID checks every new or changed row but does not scan rows that already exist,
-- so this migration cannot fail on old data.
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_odometer_km_max_check" CHECK ("odometer_km" <= 9999999) NOT VALID;
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_liters_max_check" CHECK ("liters" <= 1000) NOT VALID;
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_total_cost_max_check" CHECK ("total_cost" <= 100000) NOT VALID;
ALTER TABLE "service_entries" ADD CONSTRAINT "service_entries_odometer_km_max_check" CHECK ("odometer_km" <= 9999999) NOT VALID;
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_cost_check" CHECK ("cost" >= 0) NOT VALID;
ALTER TABLE "cars" ADD CONSTRAINT "cars_purchase_price_max_check" CHECK ("purchase_price" <= 100000000) NOT VALID;

-- Every list screen loads one car's entries newest first.
CREATE INDEX "fuel_entries_car_id_entry_date_idx" ON "fuel_entries"("car_id", "entry_date");
CREATE INDEX "service_entries_car_id_entry_date_idx" ON "service_entries"("car_id", "entry_date");
