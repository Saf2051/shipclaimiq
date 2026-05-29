async function testConnection({ carrier, credentials }) {
  const normalized = String(carrier || "").toLowerCase();

  if (normalized.includes("fedex")) {
    return fedexToken(credentials);
  }

  if (normalized.includes("ups")) {
    return upsToken(credentials);
  }

  if (normalized.includes("dhl")) {
    return dhlCheck(credentials);
  }

  if (normalized.includes("ltl")) {
    return {
      ok: true,
      carrier: "LTL",
      message: "Generic LTL account saved. Add carrier-specific APIs or EDI/SFTP connection."
    };
  }

  return {
    ok: false,
    message: "Unknown carrier."
  };
}

async function fedexToken(credentials) {
  const clientId = credentials.clientId || process.env.FEDEX_CLIENT_ID;
  const clientSecret = credentials.clientSecret || process.env.FEDEX_CLIENT_SECRET;
  const env = process.env.FEDEX_ENV || "sandbox";
  const url = env === "production"
    ? "https://apis.fedex.com/oauth/token"
    : "https://apis-sandbox.fedex.com/oauth/token";

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      carrier: "FedEx",
      message: "Missing FedEx clientId/clientSecret."
    };
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    carrier: "FedEx",
    status: response.status,
    tokenReceived: Boolean(data.access_token),
    expiresIn: data.expires_in || null,
    raw: response.ok ? undefined : data
  };
}

async function upsToken(credentials) {
  const clientId = credentials.clientId || process.env.UPS_CLIENT_ID;
  const clientSecret = credentials.clientSecret || process.env.UPS_CLIENT_SECRET;
  const env = process.env.UPS_ENV || "sandbox";
  const url = env === "production"
    ? "https://onlinetools.ups.com/security/v1/oauth/token"
    : "https://wwwcie.ups.com/security/v1/oauth/token";

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      carrier: "UPS",
      message: "Missing UPS clientId/clientSecret."
    };
  }

  const body = new URLSearchParams({ grant_type: "client_credentials" });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    },
    body
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    carrier: "UPS",
    status: response.status,
    tokenReceived: Boolean(data.access_token),
    expiresIn: data.expires_in || null,
    raw: response.ok ? undefined : data
  };
}

async function dhlCheck(credentials) {
  const apiKey = credentials.apiKey || process.env.DHL_API_KEY;
  const apiSecret = credentials.apiSecret || process.env.DHL_API_SECRET;

  if (!apiKey) {
    return {
      ok: false,
      carrier: "DHL",
      message: "Missing DHL API key. DHL authentication varies by product/API."
    };
  }

  return {
    ok: true,
    carrier: "DHL",
    message: "DHL credential format present. Add the exact DHL API endpoint you are approved for.",
    hasSecret: Boolean(apiSecret)
  };
}

module.exports = { testConnection };
