DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  name TEXT NOT NULL, -- 品牌/型号
  supplier TEXT, -- 期货商
  price REAL DEFAULT 0, -- 单价
  stock INTEGER DEFAULT 0, -- 当前库存
  image_key TEXT, -- R2 中的图片文件名
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'IN' (入库) or 'OUT' (出库)
  quantity INTEGER NOT NULL,
  transaction_date TEXT NOT NULL, -- YYYY-MM-DD
  department TEXT, -- 部门
  user TEXT, -- 使用人
  note TEXT, -- 备注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

-- 插入一些默认分类
INSERT INTO categories (name, description) VALUES ('打印耗材', '墨盒、碳粉、色带等');
INSERT INTO categories (name, description) VALUES ('办公文具', '笔、纸张、文件夹等');
INSERT INTO categories (name, description) VALUES ('电脑配件', 'U盘、鼠标、键盘、插排等');
