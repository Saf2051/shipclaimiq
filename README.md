# ShipClaimIQ Functional Starter

This is a real local starter app for a UPS/FedEx/DHL/LTL refund and rebate recovery platform.

## What works now

- Lead capture saves to SQLite.
- Customer carrier accounts save to SQLite.
- Sensitive carrier credentials are encrypted server-side using AES-256-GCM.
- Browser never stores carrier secrets.
- Dashboard reads live app data from the backend.
- FedEx/UPS/DHL connector files are structured for real API/OAuth credentials.
- Claim opportunity engine creates starter audit flags from sample shipments.
- Built so you can open it in Codex and keep improving it.

## What is intentionally not included

- Real carrier username/password collection.
- Fake OAuth tokens.
- Carrier refund guarantees hard-coded as fact.
- Production claim filing without carrier approval and legal agreements.

## Install

```bash
cd shipclaimiq-functional-starter
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste that 64-character key into `ENCRYPTION_KEY_HEX` in `.env`.

Then run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Real launch path

1. Create developer accounts for UPS, FedEx, and DHL.
2. Get approved API access for rating, tracking, invoices, claims, or shipping services.
3. Put client IDs/secrets/API keys in `.env`.
4. Replace connector placeholder endpoints where needed based on the exact carrier products you are approved for.
5. Use PostgreSQL instead of SQLite before production.
6. Add login/authentication before letting customers access dashboards.
7. Add Terms of Service, Privacy Policy, Letter of Authorization, Data Processing Agreement, and carrier account authorization language.

## Codex prompt to paste

```text
You are working on my ShipClaimIQ starter app. It is a Node/Express/SQLite web app for carrier refund and rebate recovery. Improve it into a production-ready SaaS. Keep secrets only on the backend. Add login, organizations, user roles, PostgreSQL support, carrier connector services, shipment import by CSV, claim opportunity rules, claim workflow statuses, and clean dashboard pages. Do not put carrier credentials in frontend code.
```
