const crypto = require("crypto");

function getKey() {
  const hex = process.env.ENCRYPTION_KEY_HEX || "";
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) return null;
  return Buffer.from(hex, "hex");
}

function hasEncryptionKey() {
  return Boolean(getKey());
}

function encryptJson(value) {
  const key = getKey();
  if (!key) throw new Error("ENCRYPTION_KEY_HEX must be a 64-character hex string.");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

function decryptJson(payload) {
  const key = getKey();
  if (!key) throw new Error("ENCRYPTION_KEY_HEX must be configured.");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

module.exports = {
  encryptJson,
  decryptJson,
  hasEncryptionKey
};
