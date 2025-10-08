import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac, timingSafeEqual } from "crypto";
import { pushInstallationUpdate } from "../../../lib/ecomai-connect";
import { markShopAsUninstalled } from "../../../lib/supabase-admin";

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string | undefined;
  if (!hmacHeader) return res.status(401).end();

  const chunks: Uint8Array[] = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);

  const digest = createHmac("sha256", process.env.SHOPIFY_API_SECRET!).update(buf).digest("base64");
  const received = Buffer.from(hmacHeader, "base64");
  const expected = Buffer.from(digest, "base64");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return res.status(401).end();
  }

  const shop = req.headers["x-shopify-shop-domain"] as string | undefined;
  if (!shop) {
    console.warn("[connect] Ontbrekend shop-domein in app/uninstalled webhook");
    return res.status(400).end();
  }

  try {
    await markShopAsUninstalled(shop);
  } catch (error) {
    console.error("[supabase] Markeren van uninstall in Supabase mislukt", error);
  }

  try {
    await pushInstallationUpdate({
      shopDomain: shop,
      accessToken: "",
      scopes: [],
      status: "uninstalled",
    });
  } catch (error) {
    console.error("[connect] Push na app/uninstalled mislukt", error);
  }

  res.status(200).end();
}
