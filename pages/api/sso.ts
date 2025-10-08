import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

function isShopDomain(x?: string): x is string {
  return !!x && /\.myshopify\.com$/i.test(x);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) cookie
  let shop = req.cookies.shop as string | undefined;

  // 2) fallback: query (?shop=...)
  if (!isShopDomain(shop)) {
    const q = (req.query.shop as string | undefined) || undefined;
    if (isShopDomain(q)) shop = q;
  }

  if (!isShopDomain(shop)) return res.status(401).send("No shop session");

  const secret = process.env.CONNECT_SSO_JWT_SECRET;
  if (!secret) return res.status(500).send("Missing CONNECT_SSO_JWT_SECRET");

  const token = jwt.sign(
    { shop, nonce: randomUUID() },
    secret,
    { expiresIn: "120s", audience: "ecomai", issuer: "ecomai-connect" }
  );

  const target = process.env.ECOMAI_SSO_TARGET || "http://localhost:3000/sso";

  res.status(200).json({
    url: `${target}#token=${encodeURIComponent(token)}`
  });
}
