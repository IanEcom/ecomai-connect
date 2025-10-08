import { createHmac } from "crypto";

type InstallationPayload = {
  shopDomain: string;
  accessToken: string | null;
  scopes: string[];
  status?: "installed" | "uninstalled";
};

function getConnectBaseUrl(): string | null {
  return process.env.ECOMAI_CONNECT_BASE ?? null;
}

function getWebhookSecret(): string | null {
  return process.env.CONNECT_WEBHOOK_SECRET ?? null;
}

export async function pushInstallationUpdate({
  shopDomain,
  accessToken,
  scopes,
  status,
}: InstallationPayload): Promise<void> {
  const baseUrl = getConnectBaseUrl();
  const secret = getWebhookSecret();

  if (!baseUrl || !secret) {
    console.warn(
      "[connect] Skipping installation push — missing",
      !baseUrl ? "ECOMAI_CONNECT_BASE" : "CONNECT_WEBHOOK_SECRET",
    );
    return;
  }

  const body: Record<string, unknown> = {
    shop_domain: shopDomain,
    access_token: accessToken ?? "",
    scopes,
  };

  if (status) {
    body.status = status;
  }

  const rawBody = JSON.stringify(body);
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  const targetUrl = new URL("/api/shopify/installed", baseUrl).toString();

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Connect-Signature": signature,
    },
    body: rawBody,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "<unavailable>");
    throw new Error(
      `Push naar Ecomai mislukt (${response.status} ${response.statusText}): ${errorBody}`,
    );
  }
}
