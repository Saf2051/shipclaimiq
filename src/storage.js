const Database = require("better-sqlite3");

const dbPath = process.env.DATABASE_PATH || "./shipclaimiq.db";
const database = new Database(dbPath);

function init() {
  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      carriers TEXT,
      volume TEXT,
      spend TEXT,
      pain TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS carrier_accounts (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      carrier TEXT NOT NULL,
      account_number TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      encrypted_credentials TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      carrier TEXT NOT NULL,
      tracking_number TEXT NOT NULL,
      service_level TEXT,
      promised_date TEXT,
      delivered_date TEXT,
      invoice_amount REAL,
      status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      shipment_id TEXT,
      carrier TEXT,
      tracking_number TEXT,
      type TEXT,
      reason TEXT,
      confidence TEXT,
      estimated_recovery REAL,
      status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function insertLead(lead) {
  database.prepare(`
    INSERT INTO leads (id, name, company, email, phone, carriers, volume, spend, pain)
    VALUES (@id, @name, @company, @email, @phone, @carriers, @volume, @spend, @pain)
  `).run(lead);
}

function listLeads() {
  return database.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
}

function insertCarrierAccount(account) {
  database.prepare(`
    INSERT INTO carrier_accounts
    (id, lead_id, carrier, account_number, auth_type, encrypted_credentials, notes)
    VALUES
    (@id, @leadId, @carrier, @accountNumber, @authType, @encryptedCredentials, @notes)
  `).run(account);
}

function listCarrierAccounts() {
  return database.prepare("SELECT * FROM carrier_accounts ORDER BY created_at DESC").all();
}

function getCarrierAccount(id) {
  return database.prepare("SELECT * FROM carrier_accounts WHERE id = ?").get(id);
}

function insertShipment(s) {
  database.prepare(`
    INSERT INTO shipments
    (id, carrier, tracking_number, service_level, promised_date, delivered_date, invoice_amount, status)
    VALUES
    (@id, @carrier, @trackingNumber, @serviceLevel, @promisedDate, @deliveredDate, @invoiceAmount, @status)
  `).run(s);
}

function listShipments() {
  return database.prepare("SELECT * FROM shipments ORDER BY created_at DESC").all();
}

function clearOpportunities() {
  database.prepare("DELETE FROM opportunities").run();
}

function insertOpportunity(o) {
  database.prepare(`
    INSERT INTO opportunities
    (id, shipment_id, carrier, tracking_number, type, reason, confidence, estimated_recovery, status)
    VALUES
    (@id, @shipmentId, @carrier, @trackingNumber, @type, @reason, @confidence, @estimatedRecovery, @status)
  `).run(o);
}

function listOpportunities() {
  return database.prepare("SELECT * FROM opportunities ORDER BY created_at DESC").all();
}

module.exports = {
  init,
  insertLead,
  listLeads,
  insertCarrierAccount,
  listCarrierAccounts,
  getCarrierAccount,
  insertShipment,
  listShipments,
  clearOpportunities,
  insertOpportunity,
  listOpportunities
};
