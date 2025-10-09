import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac, timingSafeEqual } from "crypto";
import { saveShopInstallation } from "../../../lib/supabase-admin";

function verifyHmac(query: Record<string, any>) {
  const { hmac, ...rest } = query;
  const sorted = new URLSearchParams(
    Object.entries(rest).sort(([a],[b]) => (a>b?1:-1)).map(([k,v]) => [k,String(v)])
  ).toString();
  const digest = createHmac("sha256", process.env.SHOPIFY_API_SECRET!).update(sorted).digest("hex");
  return typeof hmac==="string" && timingSafeEqual(Buffer.from(hmac,"utf-8"), Buffer.from(digest,"utf-8"));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { shop, code, host, state } = req.query;
  if (!shop || !code) return res.status(400).send("Missing params");
  if (!verifyHmac(req.query as any)) return res.status(400).send("Invalid HMAC");

  const shopDomain = Array.isArray(shop) ? shop[0] : shop;
  const codeValue = Array.isArray(code) ? code[0] : code;
  const stateValue = Array.isArray(state) ? state[0] : state;
  const hostValue = Array.isArray(host) ? host[0] : host;

  const cookieHeader = String(req.headers.cookie || "");
  const stateCookie = cookieHeader.split("; ").find(c=>c.startsWith("shopifyState="))?.split("=")[1];
  if (!stateCookie || String(stateValue)!==stateCookie) return res.status(400).send("Invalid state");

  const tokenRes = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ client_id:process.env.SHOPIFY_API_KEY, client_secret:process.env.SHOPIFY_API_SECRET, code: codeValue })
  });
  if (!tokenRes.ok) return res.status(502).send("Token exchange failed");
  const tokenPayload = await tokenRes.json(); // { access_token, scope }
  const accessToken = tokenPayload?.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    return res.status(502).send("Token exchange returned invalid payload");
  }

  const scopes = typeof tokenPayload.scope === "string"
    ? tokenPayload.scope.split(",").map((scope: string) => scope.trim()).filter(Boolean)
    : [];

  try {
    await saveShopInstallation({
      shopDomain,
      accessToken,
      scopes,
    });
    console.info("[supabase] shop installation saved", { shopDomain });
  } catch (error) {
    console.error("[supabase] Kon shop-installatie niet opslaan", error);
    return res.status(500).send("Kon installatie niet opslaan");
  }

  res.setHeader("Set-Cookie", [
    `shop=${shopDomain}; Path=/; HttpOnly; SameSite=None; Secure`,
    `tok=${accessToken}; Path=/; HttpOnly; SameSite=None; Secure`
  ]);

  // Webhook registreren (niet fataal als dit faalt)
  try {
    await fetch(`https://${shopDomain}/admin/api/2025-10/webhooks.json`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "X-Shopify-Access-Token": accessToken },
      body: JSON.stringify({ webhook:{ topic:"app/uninstalled", address:`${process.env.APP_URL}/api/webhooks/app-uninstalled`, format:"json" }})
    });
  } catch {}

  const hostQ = hostValue ? `?host=${encodeURIComponent(String(hostValue))}` : "";
  res.redirect(`/admin${hostQ}`);
}
