-- Fuel limits are now 2000 litres/kWh and 50 000 zł per entry.
-- NOT VALID like the originals: new and edited rows are checked, rows saved under the old limits are left alone.
ALTER TABLE "fuel_entries" DROP CONSTRAINT "fuel_entries_quantity_max_check";
ALTER TABLE "fuel_entries" DROP CONSTRAINT "fuel_entries_total_cost_max_check";
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_quantity_max_check" CHECK ("quantity" <= 2000) NOT VALID;
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_total_cost_max_check" CHECK ("total_cost" <= 50000) NOT VALID;
