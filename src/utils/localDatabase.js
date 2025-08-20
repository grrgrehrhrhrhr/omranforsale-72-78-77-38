const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * مدير قاعدة البيانات المحلية لـ Electron
 * يدعم جميع عمليات المبيعات والمخزون بدون إنترنت
 */
class LocalDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.isInitialized = false;
  }

  /**
   * تهيئة قاعدة البيانات
   */
  async initialize() {
    try {
      // إنشاء مجلد البيانات
      const userDataPath = app.getPath('userData');
      const dbDir = path.join(userDataPath, 'Database');
      
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.dbPath = path.join(dbDir, 'omran-sales.db');
      
      // إنشاء اتصال قاعدة البيانات
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('خطأ في إنشاء قاعدة البيانات:', err);
          throw err;
        }
        console.log('تم الاتصال بقاعدة البيانات المحلية');
      });

      // إنشاء الجداول
      await this.createTables();
      
      // إدراج البيانات الافتراضية
      await this.seedDefaultData();
      
      this.isInitialized = true;
      console.log('تم تهيئة قاعدة البيانات بنجاح');
      
    } catch (error) {
      console.error('فشل في تهيئة قاعدة البيانات:', error);
      throw error;
    }
  }

  /**
   * إنشاء جداول قاعدة البيانات
   */
  async createTables() {
    const tables = [
      // جدول الشركات/الحسابات
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // جدول العملاء
      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        credit_limit REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      )`,

      // جدول الموردين
      `CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      )`,

      // جدول الفئات
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      )`,

      // جدول المنتجات
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        category_id TEXT,
        barcode TEXT,
        sku TEXT,
        cost_price REAL DEFAULT 0,
        selling_price REAL DEFAULT 0,
        min_stock REAL DEFAULT 0,
        current_stock REAL DEFAULT 0,
        unit TEXT DEFAULT 'قطعة',
        image_url TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,

      // جدول فواتير المبيعات
      `CREATE TABLE IF NOT EXISTS sales_invoices (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        invoice_number TEXT NOT NULL,
        customer_id TEXT,
        invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATETIME,
        subtotal REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      )`,

      // جدول تفاصيل فواتير المبيعات
      `CREATE TABLE IF NOT EXISTS sales_invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        notes TEXT,
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // جدول فواتير المشتريات
      `CREATE TABLE IF NOT EXISTS purchase_invoices (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        invoice_number TEXT NOT NULL,
        supplier_id TEXT,
        invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATETIME,
        subtotal REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
      )`,

      // جدول تفاصيل فواتير المشتريات
      `CREATE TABLE IF NOT EXISTS purchase_invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        notes TEXT,
        FOREIGN KEY (invoice_id) REFERENCES purchase_invoices (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // جدول المصاريف
      `CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        payment_method TEXT,
        receipt_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      )`,

      // جدول الأقساط
      `CREATE TABLE IF NOT EXISTS installments (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        customer_id TEXT,
        invoice_id TEXT,
        amount REAL NOT NULL,
        due_date DATETIME NOT NULL,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        paid_at DATETIME,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices (id)
      )`,

      // جدول الشيكات
      `CREATE TABLE IF NOT EXISTS checks (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        type TEXT NOT NULL, -- incoming/outgoing
        customer_id TEXT,
        supplier_id TEXT,
        check_number TEXT NOT NULL,
        bank_name TEXT,
        amount REAL NOT NULL,
        check_date DATETIME NOT NULL,
        due_date DATETIME NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        cleared_at DATETIME,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
      )`,

      // جدول حركات المخزون
      `CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL, -- in/out/adjustment
        quantity REAL NOT NULL,
        unit_cost REAL,
        reference_id TEXT,
        reference_type TEXT,
        notes TEXT,
        movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // جدول المدفوعات
      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        type TEXT NOT NULL, -- sales/purchase/expense
        reference_id TEXT,
        amount REAL NOT NULL,
        payment_method TEXT,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      )`,

      // جدول الموظفين
      `CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        position TEXT,
        salary REAL DEFAULT 0,
        hire_date DATETIME,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      )`,

      // جدول إعدادات الشركة
      `CREATE TABLE IF NOT EXISTS company_settings (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        company_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        tax_number TEXT,
        logo_url TEXT,
        currency TEXT DEFAULT 'ريال',
        tax_rate REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      )`
    ];

    for (const table of tables) {
      await this.runQuery(table);
    }

    // إنشاء الفهارس
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_customers_account ON customers(account_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_account ON products(account_id)',
      'CREATE INDEX IF NOT EXISTS idx_sales_account ON sales_invoices(account_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_account ON purchase_invoices(account_id)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_account ON expenses(account_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_installments_customer ON installments(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_checks_account ON checks(account_id)'
    ];

    for (const index of indexes) {
      await this.runQuery(index);
    }
  }

  /**
   * إدراج البيانات الافتراضية
   */
  async seedDefaultData() {
    // إنشاء حساب افتراضي
    const defaultAccountId = 'default';
    await this.runQuery(
      `INSERT OR IGNORE INTO accounts (id, name) VALUES (?, ?)`,
      [defaultAccountId, 'الشركة الافتراضية']
    );

    // إنشاء فئات افتراضية
    const categories = [
      { id: 'cat_1', name: 'منتجات غذائية' },
      { id: 'cat_2', name: 'إلكترونيات' },
      { id: 'cat_3', name: 'ملابس' },
      { id: 'cat_4', name: 'منتجات منزلية' }
    ];

    for (const category of categories) {
      await this.runQuery(
        `INSERT OR IGNORE INTO categories (id, account_id, name) VALUES (?, ?, ?)`,
        [category.id, defaultAccountId, category.name]
      );
    }

    // إنشاء إعدادات شركة افتراضية
    await this.runQuery(
      `INSERT OR IGNORE INTO company_settings (id, account_id, company_name, currency, tax_rate) 
       VALUES (?, ?, ?, ?, ?)`,
      ['default_settings', defaultAccountId, 'عمران للمبيعات', 'ريال', 15.0]
    );
  }

  /**
   * تنفيذ استعلام
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * جلب جميع الصفوف
   */
  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * جلب صف واحد
   */
  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * إنشاء نسخة احتياطية
   */
  async createBackup(backupPath) {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {}
      };

      // تصدير جميع البيانات
      const tables = [
        'accounts', 'customers', 'suppliers', 'categories', 'products',
        'sales_invoices', 'sales_invoice_items', 'purchase_invoices',
        'purchase_invoice_items', 'expenses', 'installments', 'checks',
        'inventory_movements', 'payments', 'employees', 'company_settings'
      ];

      for (const table of tables) {
        const rows = await this.allQuery(`SELECT * FROM ${table}`);
        backupData.data[table] = rows;
      }

      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      return { success: true, path: backupPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * استيراد نسخة احتياطية
   */
  async restoreBackup(backupPath) {
    try {
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      // مسح البيانات الحالية (اختياري)
      // await this.clearAllData();

      // استيراد البيانات
      for (const [tableName, rows] of Object.entries(backupData.data)) {
        if (Array.isArray(rows)) {
          for (const row of rows) {
            const columns = Object.keys(row).join(', ');
            const placeholders = Object.keys(row).map(() => '?').join(', ');
            const values = Object.values(row);
            
            await this.runQuery(
              `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`,
              values
            );
          }
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * إغلاق قاعدة البيانات
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('خطأ في إغلاق قاعدة البيانات:', err);
        } else {
          console.log('تم إغلاق قاعدة البيانات');
        }
      });
    }
  }
}

module.exports = LocalDatabase;