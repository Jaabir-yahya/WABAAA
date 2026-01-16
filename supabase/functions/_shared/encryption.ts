type EncryptedField = {
  ciphertext: string;
  hash: string;
  key_version: string;
  algorithm: string;
};

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function getKey() {
  const keyBase64 = getEnv("ENCRYPTION_KEY_BASE64");
  const keyBytes = base64ToBytes(keyBase64);
  if (keyBytes.length !== 32) {
    throw new Error("ENCRYPTION_KEY_BASE64 must be 32 bytes for AES-256-GCM");
  }
  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSensitiveField(
  plaintext: string,
): Promise<EncryptedField> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  const cipherBytes = new Uint8Array(cipher);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, iv.length);

  const hash = await hashForSearch(plaintext);
  const keyVersion = Deno.env.get("ENCRYPTION_KEY_VERSION") ?? "v1";

  return {
    ciphertext: bytesToBase64(combined),
    hash,
    key_version: keyVersion,
    algorithm: "aes-256-gcm",
  };
}

export async function decryptField(ciphertext: string): Promise<string> {
  const key = await getKey();
  const combined = base64ToBytes(ciphertext);
  const iv = combined.slice(0, 12);
  const cipherBytes = combined.slice(12);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBytes,
  );
  return new TextDecoder().decode(plainBuffer);
}

export async function hashForSearch(plaintext: string): Promise<string> {
  const encoded = new TextEncoder().encode(plaintext);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToBase64(new Uint8Array(digest));
}
