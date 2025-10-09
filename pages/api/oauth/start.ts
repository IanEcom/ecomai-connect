import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const shop = String(req.query.shop || "");
  if (!shop.endsWith(".myshopify.com")) return res.status(400).send("Missing or invalid shop");
  const scopes = process.env.SCOPES!;
  const redirectUri = `${process.env.APP_URL}/api/oauth/callback`;
  const state = randomUUID();
  res.setHeader(
    "Set-Cookie",
    `shopifyState=${state}; Path=/; HttpOnly; SameSite=None; Secure`
  );
  console.info("[oauth] start redirect", { shop, redirectUri });
  const url =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_API_KEY}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;
  res.redirect(url);
}
