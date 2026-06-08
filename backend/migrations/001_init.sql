-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_premium BOOLEAN DEFAULT false,
    premium_expires_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farms
CREATE TABLE IF NOT EXISTS farms (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animals
CREATE TABLE IF NOT EXISTS animals (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT REFERENCES farms(id) ON DELETE CASCADE,
    mother_id BIGINT REFERENCES animals(id) ON DELETE SET NULL,
    tag_number VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    type VARCHAR(50) NOT NULL,
    breed VARCHAR(100),
    gender VARCHAR(10) NOT NULL,
    date_of_birth DATE,
    photo_url VARCHAR(500),
    is_sold BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animal Purchases
CREATE TABLE IF NOT EXISTS animal_purchases (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT REFERENCES animals(id) ON DELETE CASCADE,
    bought_at DATE NOT NULL,
    buying_price DECIMAL(10,2) NOT NULL,
    bought_from VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animal Sales
CREATE TABLE IF NOT EXISTS animal_sales (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT REFERENCES animals(id) ON DELETE CASCADE,
    sold_at DATE NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    sold_to VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pregnancies
CREATE TABLE IF NOT EXISTS pregnancies (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT REFERENCES animals(id) ON DELETE CASCADE,
    conceived_at DATE NOT NULL,
    expected_birth_at DATE NOT NULL,
    actual_birth_at DATE,
    status VARCHAR(20) DEFAULT 'pregnant',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Births
CREATE TABLE IF NOT EXISTS births (
    id BIGSERIAL PRIMARY KEY,
    pregnancy_id BIGINT REFERENCES pregnancies(id) ON DELETE CASCADE,
    mother_id BIGINT REFERENCES animals(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL,
    total_offspring INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health Records
CREATE TABLE IF NOT EXISTS health_records (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT REFERENCES animals(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    done_at DATE NOT NULL,
    next_due_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT REFERENCES farms(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_animals_farm_id ON animals(farm_id);
CREATE INDEX IF NOT EXISTS idx_animals_tag_number ON animals(tag_number);
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_pregnancies_animal_id ON pregnancies(animal_id);
CREATE INDEX IF NOT EXISTS idx_health_records_animal_id ON health_records(animal_id);