CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  brand TEXT,
  model TEXT NOT NULL,
  supplier TEXT,
  price REAL DEFAULT 0,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('IN', 'OUT', 'ADJUST')) NOT NULL,
  quantity INTEGER NOT NULL,
  department TEXT,
  handler_name TEXT,
  date TEXT DEFAULT (datetime('now')),
  note TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Initial Categories
INSERT INTO categories (name, slug) VALUES ('Printing Supplies', 'printing-supplies');
INSERT INTO categories (name, slug) VALUES ('Storage Devices', 'storage-devices');
INSERT INTO categories (name, slug) VALUES ('Cables & Adapters', 'cables-adapters');
INSERT INTO categories (name, slug) VALUES ('Peripherals', 'peripherals');
