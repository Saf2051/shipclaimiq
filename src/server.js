require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { nanoid } = require("nanoid");
const db = require("./storage");
const { encryptJson, decryptJson, hasEncryptionKey } = require("./vault");
const carriers = require("./carriers");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

db.init();

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "ShipClaimIQ",
    encryptionReady: hasEncryptionKey()
  });
});

app.post("/api/leads", (req, res) => {
  const {
    name,
    company,
    email,
    phone,
    carriers,
    volume,
    spend,
    pain
  } = req.body || {};

  if (!name || !company || !email) {
    return res.status(400).json({ error: "Name, company, and email are required." });
  }

  const id = nanoid();
  db.insertLead({
    id,
    name,
    company,
    email,
    phone: phone || "",
    carriers: carriers || "",
    volume: volume || "",
    spend: spend || "",
    pain: pain || ""
  });

  res.status(201).json({ id, message: "Lead saved." });
});

app.get("/api/leads", (req, res) => {
  res.json(db.listLeads());
});

app.post("/api/carrier-accounts", (req, res) => {
  if (!hasEncryptionKey()) {
    return res.status(500).json({
      error: "Missing ENCRYPTION_KEY_HEX. Add a 32-byte hex key to .env before storing credentials."
    });
  }

  const {
    leadId,
    carrier,
    accountNumber,
    authType,
    credentials,
    notes
  } = req.body || {};

  if (!carrier || !accountNumber || !authType || !credentials) {
    return res.status(400).json({
      error: "carrier, accountNumber, authType, and credentials are required."
    });
  }

  const id = nanoid();
  const encrypted = encryptJson(credentials);

  db.insertCarrierAccount({
    id,
    leadId: leadId || null,
    carrier,
    accountNumber,
    authType,
    encryptedCredentials: JSON.stringify(encrypted),
    notes: notes || ""
  });

  res.status(201).json({
    id,
    message: "Carrier account saved with encrypted credentials.",
    carrier,
    accountNumberMasked: mask(accountNumber)
  });
});

app.get("/api/carrier-accounts", (req, res) => {
  const accounts = db.listCarrierAccounts().map((a) => ({
    id: a.id,
    leadId: a.lead_id,
    carrier: a.carrier,
    accountNumberMasked: mask(a.account_number),
    authType: a.auth_type,
    notes: a.notes,
    createdAt: a.created_at
  }));

  res.json(accounts);
});

app.post("/api/carrier-accounts/:id/test-token", async (req, res) => {
  const account = db.getCarrierAccount(req.params.id);
  if (!account) return res.status(404).json({ error: "Carrier account not found." });

  try {
    const credentials = decryptJson(JSON.parse(account.encrypted_credentials));
    const result = await carriers.testConnection({
      carrier: account.carrier,
      authType: account.auth_type,
      credentials
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Carrier connection failed.",
      detail: error.message
    });
  }
});

app.post("/api/shipments/import-sample", (req, res) => {
  const sample = [
    {
      id: nanoid(),
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      serviceLevel: "Next Day Air",
      promisedDate: "2026-05-21",
      deliveredDate: "2026-05-22",
      invoiceAmount: 42.87,
      status: "Delivered late"
    },
    {
      id: nanoid(),
      carrier: "FedEx",
      trackingNumber: "794612345678",
      serviceLevel: "Priority Overnight",
      promisedDate: "2026-05-20",
      deliveredDate: "2026-05-20",
      invoiceAmount: 88.15,
      status: "Duplicate residential surcharge"
    },
    {
      id: nanoid(),
      carrier: "DHL",
      trackingNumber: "JD014600006789123456",
      serviceLevel: "Express Worldwide",
      promisedDate: "2026-05-18",
      deliveredDate: "2026-05-19",
      invoiceAmount: 127.99,
      status: "Damaged exception"
    },
    {
      id: nanoid(),
      carrier: "LTL",
      trackingNumber: "BOL-882140",
      serviceLevel: "Standard Freight",
      promisedDate: "2026-05-17",
      deliveredDate: "2026-05-20",
      invoiceAmount: 610.42,
      status: "Reclass/reweigh variance"
    }
  ];

  sample.forEach(db.insertShipment);
  res.status(201).json({ imported: sample.length });
});

app.get("/api/shipments", (req, res) => {
  res.json(db.listShipments());
});

app.post("/api/audit/run", (req, res) => {
  const shipments = db.listShipments();
  const opportunities = shipments.map((s) => {
    const lower = String(s.status || "").toLowerCase();
    let reason = "General shipment review";
    let type = "Audit Review";
    let confidence = "Medium";
    let estimatedRecovery = Number(s.invoice_amount || 0) * 0.2;

    if (lower.includes("late")) {
      type = "Late Delivery Refund";
      reason = "Delivered after promised date. Review carrier guarantee and customer contract waiver language.";
      confidence = "High";
      estimatedRecovery = Number(s.invoice_amount || 0);
    } else if (lower.includes("duplicate") || lower.includes("surcharge")) {
      type = "Invoice Overcharge";
      reason = "Potential duplicate or incorrect accessorial fee.";
      confidence = "Medium";
      estimatedRecovery = Number(s.invoice_amount || 0) * 0.35;
    } else if (lower.includes("damage")) {
      type = "Damage Claim";
      reason = "Damage exception requires photos, invoice value, packing proof, and delivery notes.";
      confidence = "Medium";
      estimatedRecovery = Number(s.invoice_amount || 0) * 0.75;
    } else if (lower.includes("reclass") || lower.includes("reweigh")) {
      type = "LTL Variance";
      reason = "Review NMFC class, weight proof, BOL, quote, and final invoice variance.";
      confidence = "Medium";
      estimatedRecovery = Number(s.invoice_amount || 0) * 0.18;
    }

    return {
      id: nanoid(),
      shipmentId: s.id,
      carrier: s.carrier,
      trackingNumber: s.tracking_number,
      type,
      reason,
      confidence,
      estimatedRecovery: Number(estimatedRecovery.toFixed(2)),
      status: "Open"
    };
  });

  db.clearOpportunities();
  opportunities.forEach(db.insertOpportunity);

  res.json({
    created: opportunities.length,
    opportunities
  });
});

app.get("/api/opportunities", (req, res) => {
  res.json(db.listOpportunities());
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

function mask(value) {
  const raw = String(value || "");
  if (raw.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`;
}

app.listen(PORT, () => {
  console.log(`ShipClaimIQ running at http://localhost:${PORT}`);
});
