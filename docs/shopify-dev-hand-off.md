# 📦 Shopify → Ecomai Hand-off

Een overzicht voor de Shopify-app developer zodat de nieuwe Ecomai-koppeling soepel werkt.

## 1. SSO-redirect
- **Doel:** merchant vanuit Shopify naar Ecomai sturen.
- **URL:** `http://localhost:3000/sso#token=<JWT>`
- **JWT-vereisten:**
  - `aud`: `ecomai`
  - `iss`: `ecomai-connect`
  - `exp`: maximaal 120s in de toekomst
  - `shop`: Shopify-domain (`my-store.myshopify.com`)
- **Secret:** gedeeld `CONNECT_SSO_JWT_SECRET` (zelfde waarde client/server).

## 2. Installatie push (optioneel maar aanbevolen)
Gebruik deze call direct na een succesvolle OAuth-flow zodat Ecomai alvast tokens/scopes kan opslaan.

```
POST http://localhost:3000/api/shopify/installed
Headers: X-Connect-Signature: <HMAC-SHA256(body, CONNECT_WEBHOOK_SECRET)>
Body (JSON): { "shop_domain": "my-store.myshopify.com", "access_token": "shpat_...", "scopes": ["read_products", "write_products"] }
```

### Belangrijke details
- **HMAC:** hex- of base64-string van de SHA256-HMAC over de ruwe body.
- **Secrets:** `SHOPIFY_WEBHOOK_SECRET` (zelfde waarde als `CONNECT_WEBHOOK_SECRET`) wordt gebruikt om webhooks te signeren én te valideren.
- **scopes:** array (of comma-separated string) met alle toegekende scopes.
- **Tokens:** stuur de plain token; Ecomai versleutelt deze server-side.
- **Retries:** stuur bij errors opnieuw (idempotent upsert).

## 3. Overige webhooks (optioneel)
- *Aanbevolen:* `app/uninstalled` webhook → POST naar dezelfde endpoint met lege token of status zodat Ecomai de connectie kan pauzeren.

## 4. Verwachte response
- `200 { "ok": true }` bij succes.
- `401` bij invalide HMAC.
- `400` bij ontbrekende velden.
- `500` bij interne fout (in dat geval retry met backoff).

## 5. Test checklist
1. OAuth-flow → `POST /api/shopify/installed` ontvangt payload (`200`).
2. Via Shopify App Bridge openen → redirect naar `/sso#token=…` → wizard start.
3. Wizard kan bestaande koppeling herkennen en store preselecteren.

## 6. Supabase opslag
- **ENV:** `CONNECT_SUPABASE_URL`, `CONNECT_SUPABASE_SERVICE_ROLE_KEY`, `CONNECT_ENCRYPTION_KEY` (32-byte sleutel in base64 of hex).
- **Opslag:** access tokens worden AES-256-GCM versleuteld en opgeslagen in `shops.access_token`.
- **Uninstall:** webhook zet `is_active` op false, leegt scopes en token, en vult `deleted_at`.

---

_Onzekerheden_
- `SHOPIFY_WEBHOOK_SECRET` / `CONNECT_WEBHOOK_SECRET` in `.env.local` gebruikt nog een placeholder; stem het gedeelde secret af met het Ecomai-team.
