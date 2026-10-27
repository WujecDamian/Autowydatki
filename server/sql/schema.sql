CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cars (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  name TEXT NOT NULL,
  purchase_price NUMERIC(12, 2) CHECK (purchase_price >= 0)
);

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2) CHECK (purchase_price >= 0);

CREATE TABLE IF NOT EXISTS fuel_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  car_id INTEGER NOT NULL REFERENCES cars (id),
  entry_date DATE NOT NULL,
  odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0),
  liters NUMERIC(8, 2) NOT NULL CHECK (liters > 0),
  total_cost NUMERIC(10, 2) NOT NULL CHECK (total_cost >= 0)
);

CREATE TABLE IF NOT EXISTS service_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  car_id INTEGER NOT NULL REFERENCES cars (id),
  entry_date DATE NOT NULL,
  odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0),
  title TEXT NOT NULL,
  cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0)
);

ALTER TABLE fuel_entries
  ADD COLUMN IF NOT EXISTS car_id INTEGER REFERENCES cars (id);

ALTER TABLE service_entries
  ADD COLUMN IF NOT EXISTS car_id INTEGER REFERENCES cars (id);
