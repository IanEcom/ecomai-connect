import { createCipheriv, randomBytes } from "crypto";

type ShopInstallationPayload = {
  shopDomain: string;
  accessToken: string;
  scopes: string[];
};

const CONNECT_SUPABASE_URL = process.env.CONNECT_SUPABASE_URL;
const CONNECT_SUPABASE_SERVICE_ROLE_KEY = process.env.CONNECT_SUPABASE_SERVICE_ROLE_KEY;
const CONNECT_ENCRYPTION_KEY = process.env.CONNECT_ENCRYPTION_KEY;

class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

function ensureSupabaseConfig(): void {
  if (!CONNECT_SUPABASE_URL) {
    throw new SupabaseConfigError("Missing CONNECT_SUPABASE_URL environment variable");
  }
  if (!CONNECT_SUPABASE_SERVICE_ROLE_KEY) {
    throw new SupabaseConfigError(
      "Missing CONNECT_SUPABASE_SERVICE_ROLE_KEY environment variable",
    );
  }
}

function resolveEncryptionKey(): Buffer {
  if (!CONNECT_ENCRYPTION_KEY) {
    throw new SupabaseConfigError(
      "Missing CONNECT_ENCRYPTION_KEY environment variable",
    );
  }

  const trimmed = CONNECT_ENCRYPTION_KEY.trim();

  // Prefer base64, fall back to hex.
  const base64Buffer = (() => {
    try {
      return Buffer.from(trimmed, "base64");
    } catch {
      return null;
    }
  })();
  if (base64Buffer && base64Buffer.length === 32) {
    return base64Buffer;
  }

  const hexBuffer = (() => {
    try {
      return Buffer.from(trimmed, "hex");
    } catch {
      return null;
    }
  })();
  if (hexBuffer && hexBuffer.length === 32) {
    return hexBuffer;
  }

  throw new SupabaseConfigError(
    "CONNECT_ENCRYPTION_KEY must be a 32-byte value (base64 or hex encoded)",
  );
}

function encryptAccessToken(token: string, key: Buffer): Buffer {
  const iv = randomBytes(12); // recommended length for AES-GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Concatenate IV + AuthTag + Ciphertext so we can reconstruct during decrypt.
  return Buffer.concat([iv, authTag, ciphertext]);
}

function encodeBinaryPayload(buffer: Buffer): string {
  return buffer.toString("base64"); // PostgREST expects base64 for bytea
}

type SupabaseHeaders = HeadersInit & Record<string, string>;

function buildSupabaseHeaders(extra?: HeadersInit): SupabaseHeaders {
  ensureSupabaseConfig();

  const headers: SupabaseHeaders = {
    apikey: CONNECT_SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${CONNECT_SUPABASE_SERVICE_ROLE_KEY!}`,
    "Content-Type": "application/json",
  };

  if (extra) {
    for (const [key, value] of Object.entries(extra as Record<string, string>)) {
      headers[key] = value;
    }
  }

  return headers;
}

async function supabaseFetch(path: string, init: RequestInit): Promise<Response> {
  ensureSupabaseConfig();

  const url = `${CONNECT_SUPABASE_URL}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: buildSupabaseHeaders(init.headers),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "<unavailable>");
    throw new Error(
      `Supabase request failed (${response.status} ${response.statusText}): ${details}`,
    );
  }

  return response;
}

type ExistingShopRecord = {
  token_created_at: string | null;
};

export async function fetchExistingShop(
  shopDomain: string,
): Promise<ExistingShopRecord | null> {
  const response = await supabaseFetch(
    `/rest/v1/shops?select=token_created_at&shop_domain=eq.${encodeURIComponent(shopDomain)}&limit=1`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  const payload = (await response.json()) as ExistingShopRecord[];
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  return payload[0];
}

export async function saveShopInstallation({
  shopDomain,
  accessToken,
  scopes,
}: ShopInstallationPayload): Promise<void> {
  ensureSupabaseConfig();
  const key = resolveEncryptionKey();

  const encrypted = encryptAccessToken(accessToken, key);
  const existing = await fetchExistingShop(shopDomain);
  const nowIso = new Date().toISOString();

  const record: Record<string, unknown> = {
    shop_domain: shopDomain,
    access_scopes: scopes,
    is_active: true,
    deleted_at: null,
    token_updated_at: nowIso,
    access_token: encodeBinaryPayload(encrypted),
  };

  if (!existing || !existing.token_created_at) {
    record.token_created_at = nowIso;
  }

  await supabaseFetch("/rest/v1/shops?on_conflict=shop_domain", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(record),
  });
}

export async function markShopAsUninstalled(shopDomain: string): Promise<void> {
  ensureSupabaseConfig();
  const nowIso = new Date().toISOString();

  const updatePayload = {
    access_token: null,
    access_scopes: [],
    is_active: false,
    token_updated_at: nowIso,
    deleted_at: nowIso,
  };

  await supabaseFetch(
    `/rest/v1/shops?shop_domain=eq.${encodeURIComponent(shopDomain)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(updatePayload),
    },
  );
}
