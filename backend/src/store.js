import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const backendRoot = path.resolve(__dirname, "..");
export const dataDir = path.join(backendRoot, "data");
export const uploadsDir = path.join(backendRoot, "uploads");
const databaseFile = path.join(dataDir, "fixigo.sqlite");

let database;

export function ensureRuntimeFolders() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function getDatabase() {
  ensureRuntimeFolders();

  if (!database) {
    database = new DatabaseSync(databaseFile);
    database.exec("PRAGMA foreign_keys = ON;");
    migrateDatabase(database);
    seedDatabase(database);
  }

  return database;
}

export function getDatabaseSummary() {
  const db = getDatabase();

  return {
    file: databaseFile,
    tables: [
      "customers",
      "providers",
      "service_categories",
      "service_requests",
      "service_media",
      "job_assignments",
      "status_history",
      "messages",
      "payments",
    ],
    counts: {
      customers: db.prepare("SELECT COUNT(*) AS count FROM customers").get().count,
      providers: db.prepare("SELECT COUNT(*) AS count FROM providers").get().count,
      serviceRequests: db.prepare("SELECT COUNT(*) AS count FROM service_requests").get().count,
      media: db.prepare("SELECT COUNT(*) AS count FROM service_media").get().count,
      messages: db.prepare("SELECT COUNT(*) AS count FROM messages").get().count,
      payments: db.prepare("SELECT COUNT(*) AS count FROM payments").get().count,
    },
  };
}

export function readCategories() {
  return getDatabase()
    .prepare("SELECT name FROM service_categories WHERE active = 1 ORDER BY sort_order, name")
    .all()
    .map((row) => row.name);
}

export function readProviders() {
  return getDatabase()
    .prepare("SELECT id, name, trade, email, phone, active FROM providers ORDER BY name")
    .all();
}

export function readServiceRequests() {
  const db = getDatabase();
  const rows = db
    .prepare(`
      SELECT
        sr.*,
        c.name AS customerName,
        c.email AS customerEmail,
        c.phone AS customerPhone
      FROM service_requests sr
      LEFT JOIN customers c ON c.id = sr.customer_id
      ORDER BY sr.created_at DESC
    `)
    .all();

  return rows.map((row) => hydrateRequest(row, db));
}

export function createServiceRequest(payload) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const requestId = `REQ-${Date.now()}`;
  const customerId = upsertCustomer({
    name: payload.customerName || "Customer",
    email: payload.customerEmail || "",
    phone: payload.customerPhone || "",
  });

  db.prepare(`
    INSERT INTO service_requests (
      id,
      customer_id,
      category,
      other_category,
      issue_type,
      other_issue,
      description,
      device_info,
      location,
      appointment_preference,
      status,
      priority,
      assigned_to,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    requestId,
    customerId,
    payload.category || "Other",
    payload.otherCategory || "",
    payload.issueType || "Other",
    payload.otherIssue || "",
    payload.description || "",
    payload.deviceInfo || "",
    payload.location || "",
    payload.appointmentPreference || "",
    "New",
    payload.priority || "Regular",
    "",
    now,
    now,
  );

  for (const item of payload.media || []) {
    db.prepare(`
      INSERT INTO service_media (
        id,
        request_id,
        file_name,
        mime_type,
        file_size,
        url,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `MEDIA-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      requestId,
      item.fileName || "",
      item.mimeType || "",
      item.size || 0,
      item.url || "",
      now,
    );
  }

  db.prepare(`
    INSERT INTO status_history (request_id, from_status, to_status, note, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(requestId, "", "New", "Customer submitted request", now);

  return getServiceRequestById(requestId);
}

export function updateServiceRequest(id, patch) {
  const db = getDatabase();
  const existing = getServiceRequestById(id);

  if (!existing) return null;

  const nextStatus = patch.status || existing.status;
  const assignedTo = typeof patch.assignedTo === "string" ? patch.assignedTo : existing.assignedTo || "";
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE service_requests
    SET status = ?, assigned_to = ?, updated_at = ?
    WHERE id = ?
  `).run(nextStatus, assignedTo, now, id);

  if (nextStatus !== existing.status) {
    db.prepare(`
      INSERT INTO status_history (request_id, from_status, to_status, note, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, existing.status, nextStatus, "Status changed from dashboard", now);
  }

  if (assignedTo && assignedTo !== existing.assignedTo) {
    db.prepare(`
      INSERT INTO job_assignments (request_id, assigned_to, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, assignedTo, "Assigned", now, now);
  }

  return getServiceRequestById(id);
}

export function createMessage({ requestId, senderRole, senderName, body }) {
  const db = getDatabase();
  const id = `MSG-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO messages (id, request_id, sender_role, sender_name, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, requestId, senderRole || "admin", senderName || "FixiGo Team", body || "", now);

  return getMessagesForRequest(requestId).find((message) => message.id === id);
}

export function getMessagesForRequest(requestId) {
  return getDatabase()
    .prepare("SELECT * FROM messages WHERE request_id = ? ORDER BY created_at ASC")
    .all(requestId)
    .map((row) => ({
      id: row.id,
      requestId: row.request_id,
      senderRole: row.sender_role,
      senderName: row.sender_name,
      body: row.body,
      createdAt: row.created_at,
    }));
}

export function createPaymentRecord({ requestId, stripePaymentIntentId, amountCents, currency, status }) {
  const db = getDatabase();
  const id = `PAY-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO payments (
      id,
      request_id,
      stripe_payment_intent_id,
      amount_cents,
      currency,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, requestId || "", stripePaymentIntentId || "", amountCents || 0, currency || "usd", status || "created", now, now);

  return id;
}

function getServiceRequestById(id) {
  const db = getDatabase();
  const row = db
    .prepare(`
      SELECT
        sr.*,
        c.name AS customerName,
        c.email AS customerEmail,
        c.phone AS customerPhone
      FROM service_requests sr
      LEFT JOIN customers c ON c.id = sr.customer_id
      WHERE sr.id = ?
    `)
    .get(id);

  return row ? hydrateRequest(row, db) : null;
}

function hydrateRequest(row, db) {
  const media = db
    .prepare("SELECT * FROM service_media WHERE request_id = ? ORDER BY created_at ASC")
    .all(row.id)
    .map((item) => ({
      id: item.id,
      fileName: item.file_name,
      mimeType: item.mime_type,
      size: item.file_size,
      url: item.url,
      createdAt: item.created_at,
    }));

  const messages = getMessagesForRequest(row.id);

  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customerName || "Customer",
    customerEmail: row.customerEmail || "",
    customerPhone: row.customerPhone || "",
    category: row.category,
    otherCategory: row.other_category,
    issueType: row.issue_type,
    otherIssue: row.other_issue,
    description: row.description,
    deviceInfo: row.device_info,
    location: row.location,
    appointmentPreference: row.appointment_preference,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media,
    messages,
  };
}

function upsertCustomer({ name, email, phone }) {
  const db = getDatabase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = String(phone || "").trim();
  const existing = normalizedEmail
    ? db.prepare("SELECT id FROM customers WHERE email = ?").get(normalizedEmail)
    : normalizedPhone
      ? db.prepare("SELECT id FROM customers WHERE phone = ?").get(normalizedPhone)
      : null;
  const now = new Date().toISOString();

  if (existing?.id) {
    db.prepare(`
      UPDATE customers
      SET name = COALESCE(NULLIF(?, ''), name),
          phone = COALESCE(NULLIF(?, ''), phone),
          updated_at = ?
      WHERE id = ?
    `).run(name || "", normalizedPhone, now, existing.id);

    return existing.id;
  }

  const id = `CUS-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  db.prepare(`
    INSERT INTO customers (id, name, email, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name || "Customer", normalizedEmail, normalizedPhone, now, now);

  return id;
}

function migrateDatabase(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trade TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      category TEXT NOT NULL,
      other_category TEXT,
      issue_type TEXT NOT NULL,
      other_issue TEXT,
      description TEXT NOT NULL,
      device_info TEXT,
      location TEXT NOT NULL,
      appointment_preference TEXT,
      status TEXT NOT NULL DEFAULT 'New',
      priority TEXT NOT NULL DEFAULT 'Regular',
      assigned_to TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_media (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      file_name TEXT,
      mime_type TEXT,
      file_size INTEGER,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      provider_id TEXT REFERENCES providers(id),
      assigned_to TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      sender_role TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      request_id TEXT REFERENCES service_requests(id),
      stripe_payment_intent_id TEXT,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
    CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);
    CREATE INDEX IF NOT EXISTS idx_service_media_request_id ON service_media(request_id);
    CREATE INDEX IF NOT EXISTS idx_messages_request_id ON messages(request_id);
  `);
}

function seedDatabase(db) {
  const now = new Date().toISOString();
  const categories = [
    "Lawn & Yard",
    "Plumbing",
    "Electrical",
    "HVAC",
    "Appliance Repair",
    "Roofing",
    "Gutter",
    "Painting",
    "Carpentry",
    "Doors & Windows",
    "Flooring",
    "Drywall",
    "Pest Control",
    "Cleaning",
    "Snow Removal",
    "General Handyman",
    "Other",
  ];
  const providers = [
    ["PRO-1", "Alex M.", "HVAC"],
    ["PRO-2", "Sam R.", "Plumbing"],
    ["PRO-3", "Jordan K.", "Electrical"],
    ["PRO-4", "FixiGo Lawn Team", "Lawn & Yard"],
  ];

  categories.forEach((name, index) => {
    db.prepare(`
      INSERT OR IGNORE INTO service_categories (id, name, sort_order, active)
      VALUES (?, ?, ?, 1)
    `).run(slugify(name), name, index + 1);
  });

  providers.forEach(([id, name, trade]) => {
    db.prepare(`
      INSERT OR IGNORE INTO providers (id, name, trade, email, phone, active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, name, trade, "", "", now);
  });
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
