import type { GetServerSideProps } from "next";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CloudAlert, CloudCheck, CloudCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Logo from "../logo.svg";

type ConnectionStatus = "connected" | "not_connected" | "error";

export default function Admin() {
  const redirectRemoteRef = useRef<null | ((url: string) => void)>(null);
  const shopRef = useRef<string | null>(null);
  const [hostMissing, setHostMissing] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("not_connected");
  const [statusMessage, setStatusMessage] = useState("We controleren je koppeling…");
  const [shopDomain, setShopDomain] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openFaqs, setOpenFaqs] = useState<number[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host");
    const shop = params.get("shop"); // door Shopify meegegeven

    if (!host) {
      setHostMissing(true); // toon fallback-install UI
      setStatus("not_connected");
      setStatusMessage("Open deze pagina via Shopify Admin om de koppeling te voltooien.");
      return;
    }

    setHostMissing(false);

    if (shop) {
      shopRef.current = shop;
      setShopDomain(shop);
      setLastError(null);
      setStatus("connected");
      setStatusMessage("Je Shopify store is gekoppeld met Ecomai.");
    } else {
      shopRef.current = null;
      setShopDomain(null);
      setStatus("error");
      setStatusMessage("Kan shop-informatie niet ophalen van Shopify.");
      setLastError("Parameter 'shop' ontbreekt in de URL.");
    }

    (async () => {
      const { default: createApp } = await import("@shopify/app-bridge");
      const { Redirect } = await import("@shopify/app-bridge/actions");
      const app = createApp({
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
        host,
        forceRedirect: true,
      });
      redirectRemoteRef.current = (url: string) => {
        Redirect.create(app).dispatch(Redirect.Action.REMOTE, url);
      };
    })();
  }, []);

  async function openEcomai() {
    try {
      setIsOpening(true);
      setLastError(null);
      setStatusMessage("We maken een veilige sessie voor je aan…");

      const qs = shopRef.current ? `?shop=${encodeURIComponent(shopRef.current)}` : "";
      const r = await fetch(`/api/sso${qs}`, { method: "POST" });
      if (!r.ok) {
        throw new Error(`SSO-fout (${r.status})`);
      }

      const { url } = await r.json();
      setStatus("connected");
      setStatusMessage("Je wordt doorgestuurd naar Ecomai.");
      redirectRemoteRef.current?.(url);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setStatusMessage("We konden geen sessie openen. Probeer het opnieuw.");
      setLastError(error instanceof Error ? error.message : "Onbekende fout");
      alert("SSO kon niet worden gestart. Probeer het opnieuw.");
    } finally {
      setIsOpening(false);
    }
  }

  const handleManualInstall = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const shopInput = event.currentTarget.elements.namedItem("shop") as HTMLInputElement | null;
    const value = shopInput?.value.trim() ?? "";
    if (!value.endsWith(".myshopify.com")) {
      alert("Gebruik volledige domein, bv. mystore.myshopify.com");
      return;
    }
    window.location.href = `/api/oauth/start?shop=${encodeURIComponent(value)}`;
  };

  const statusDescriptors: Record<
    ConnectionStatus,
    { label: string; tone: "success" | "warning" | "critical"; icon: LucideIcon }
  > = {
    connected: { label: "Connected", tone: "success", icon: CloudCheck },
    not_connected: { label: "Not connected", tone: "warning", icon: CloudCog },
    error: { label: "Error", tone: "critical", icon: CloudAlert },
  };
  const statusDescriptor = statusDescriptors[status];
  const StatusIcon = statusDescriptor.icon;
  const faqItems: Array<{ question: string; answer: string }> = [
    {
      question: "Hoe start ik een nieuwe sessie met Ecomai?",
      answer:
        "Klik op “Go to E-comai” om een veilige SSO-sessie te openen. We sturen je automatisch door naar de juiste omgeving zodra de sessie actief is.",
    },
    {
      question: "Ik krijg een foutmelding bij het openen van de sessie. Wat nu?",
      answer:
        "Controleer of je Shopify-winkel momenteel verbonden is en probeer het daarna opnieuw. Blijft het probleem bestaan, neem dan contact op met support@ecomai.com met de foutmelding.",
    },
    {
      question: "Kan ik handmatig opnieuw inloggen met mijn shopdomein?",
      answer:
        "Ja. Gebruik het formulier voor handmatige installatie en vul het volledige .myshopify.com-domein in om de OAuth-stroom opnieuw te starten.",
    },
    {
      question: "Waar vind ik meer documentatie?",
      answer:
        "Bekijk de handleiding in het Ecomai Dashboard of raadpleeg onze onboarding-documenten in de Shopify App Store listing.",
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqs((previous) => {
      if (previous.includes(index)) {
        return previous.filter((item) => item !== index);
      }
      return [...previous, index];
    });
  };

  return (
    <s-page>
      <div className="page">
        <header className="page-header">
          <div>
            <h1>Setup and status</h1>
            <p>
              Beheer hier de koppeling tussen je Shopify-winkel en je Ecomai-account. Start direct een sessie of bekijk
              de status van de integratie.
            </p>
          </div>
        </header>

        <section className="status-indicator-section">
          <div className={`indicator-card ${statusDescriptor.tone}`}>
            <span className="indicator-icon" role="img" aria-hidden="true">
              <StatusIcon size={24} aria-hidden="true" />
            </span>
            <span className="indicator-status" aria-live="polite">
              {statusDescriptor.label}
            </span>
          </div>
        </section>

        <section className="card spotlight-card">
          <div className="spotlight-media" aria-hidden="true">
            <img src={Logo.src} alt="" className="spotlight-logo" />
          </div>
          <div className="spotlight-content">
            <div className="text">
              <h2>Connect store your to E-comai</h2>
              <p>
                This app is intended to connect your Shopify store to E-comai. You need an E-comai account to use this app.
              </p>
            </div>
            <s-button kind="primary" onClick={openEcomai} disabled={isOpening}>
              {isOpening ? "Opening..." : status === "connected" ? "Go to E-comai" : "Connect to E-comai"}
            </s-button>
          </div>
        </section>

        <section className="card faq-section">
          <div>
            <h2>Veelgestelde vragen</h2>
            <p className="faq-subtitle">Een snel overzicht van de meest voorkomende vragen over de koppeling.</p>
          </div>
          <div className="faq-list">
            {faqItems.map((faq, index) => {
              const isOpen = openFaqs.includes(index);
              return (
                <div key={faq.question} className={`faq-item ${isOpen ? "open" : ""}`}>
                  <button
                    type="button"
                    className="faq-question"
                    aria-expanded={isOpen}
                    onClick={() => toggleFaq(index)}
                  >
                    <span>{faq.question}</span>
                    <span className="faq-icon" aria-hidden="true">
                      {isOpen ? "-" : "+"}
                    </span>
                  </button>
                  <div className="faq-answer" hidden={!isOpen}>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px;
          min-height: 100vh;

          color: var(--p-text, #202223);
          box-sizing: border-box;
        }

        .page-header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .page-header p {
          margin: 8px 0 0;
          color: var(--p-text-subdued, #6d7175);
          max-width: 600px;
        }

        .layout {
          display: grid;
          gap: 24px;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        }

        .status-indicator-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 0;
        }

        .indicator-card {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: var(--indicator-bg, #ffffff);
          box-shadow: 0 18px 32px var(--indicator-shadow-low, rgba(15, 23, 42, 0.12));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 1px;
          animation: indicatorPulse 3s ease-in-out infinite;
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }

        .indicator-icon {
          width: 79px;
          height: 79px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff6a00;
        }

        .indicator-icon svg {
          width: 100%;
          height: 100%;
        }

        .indicator-status {
          padding: 4px 12px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 11px;
          background: var(--indicator-pill-bg, #eef2ff);
          color: var(--indicator-pill-color, #4338ca);
          transition: background 0.3s ease, color 0.3s ease;
        }

        .indicator-card.success {
          --indicator-bg: radial-gradient(circle at 40% 35%, rgba(220, 252, 231, 0.7), #ffffff 65%);
          --indicator-shadow-low: rgba(22, 163, 74, 0.25);
          --indicator-shadow-high: rgba(22, 163, 74, 0.4);
          --indicator-pill-bg: #dcfce7;
          --indicator-pill-color: #15803d;
          --indicator-accent: #fbbf24;
        }

        .indicator-card.warning {
          --indicator-bg: radial-gradient(circle at 40% 35%, rgba(254, 243, 199, 0.7), #ffffff 65%);
          --indicator-shadow-low: rgba(217, 119, 6, 0.25);
          --indicator-shadow-high: rgba(217, 119, 6, 0.4);
          --indicator-pill-bg: #fef3c7;
          --indicator-pill-color: #b45309;
          --indicator-accent: #f59e0b;
        }

        .indicator-card.critical {
          --indicator-bg: radial-gradient(circle at 40% 35%, rgba(254, 226, 226, 0.7), #ffffff 65%);
          --indicator-shadow-low: rgba(220, 38, 38, 0.25);
          --indicator-shadow-high: rgba(220, 38, 38, 0.45);
          --indicator-pill-bg: #fee2e2;
          --indicator-pill-color: #b91c1c;
          --indicator-accent: #fb7185;
        }

        @keyframes indicatorPulse {
          0%,
          100% {
            box-shadow: 0 18px 32px var(--indicator-shadow-low, rgba(15, 23, 42, 0.12));
          }
          50% {
            box-shadow: 0 24px 48px var(--indicator-shadow-high, rgba(15, 23, 42, 0.2));
          }
        }

        .card {
          background: var(--p-surface, #ffffff);
          border-radius: 16px;
          border: 1px solid rgba(32, 34, 35, 0.08);
          box-shadow: 0 1px 0 rgba(32, 34, 35, 0.1), 0 1px 3px rgba(32, 34, 35, 0.05);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .spotlight-card {
          flex-direction: row;
          flex-wrap: wrap;
          gap: 0;
          padding: 0;
          overflow: hidden;
        }

        .spotlight-media {
          flex: 0 0 240px;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(69deg, rgba(255, 106, 0, 0.62) 0%, #ff6a00 45%, #fff1eb 100%);
        }

        .spotlight-logo {
          width: 140px;
          max-width: 100%;
          height: auto;
          display: block;
        }

        .spotlight-content {
          flex: 1 1 320px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          justify-content: space-between;
        }

        .spotlight-content h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .spotlight-content p {
          margin: 0;
          color: var(--p-text-subdued, #6d7175);
          max-width: 520px;
        }

        .spotlight-content s-button {
          align-self: flex-start;
        }

        .faq-section {
          gap: 20px;
        }

        .faq-subtitle {
          margin: 8px 0 0;
          color: var(--p-text-subdued, #6d7175);
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-item {
          border: 1px solid rgba(32, 34, 35, 0.12);
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .faq-item.open {
          border-color: rgba(0, 128, 96, 0.3);
          box-shadow: 0 4px 12px rgba(32, 34, 35, 0.08);
        }

        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 20px;
          border: none;
          background: transparent;
          font-size: 15px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          color: var(--p-text, #202223);
        }

        .faq-question:hover {
          background: rgba(32, 34, 35, 0.04);
        }

        .faq-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid rgba(32, 34, 35, 0.15);
          font-size: 18px;
          line-height: 1;
        }

        .faq-answer {
          padding: 0 20px 16px 20px;
          color: var(--p-text-subdued, #6d7175);
          font-size: 14px;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .card-header h2 {
          margin: 0;
          font-size: 18px;
        }

        .card-subtitle {
          margin: 4px 0 0;
          color: var(--p-text-subdued, #6d7175);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 6px 12px;
          font-weight: 600;
          font-size: 14px;
          background: var(--badge-bg, #f1f2f3);
          color: var(--badge-color, #202223);
        }

        .status-badge__dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: currentColor;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.6);
        }

        .status-badge.success {
          --badge-bg: #ecfdf3;
          --badge-color: #047857;
        }

        .status-badge.warning {
          --badge-bg: #fdf7ed;
          --badge-color: #b54708;
        }

        .status-badge.critical {
          --badge-bg: #fef3f2;
          --badge-color: #b42318;
        }

        .status-message {
          margin: 0;
          color: var(--p-text, #202223);
        }

        .status-meta {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 4px 12px;
          background: var(--p-surface-subdued, #f1f2f3);
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
        }

        .status-meta .label {
          color: var(--p-text-subdued, #6d7175);
          font-weight: 500;
        }

        .status-meta .value {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          word-break: break-all;
        }

        .status-error {
          padding: 12px 16px;
          border-radius: 12px;
          background: #fef3f2;
          color: #b42318;
          font-size: 14px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .actions .secondary {
          appearance: none;
          border: 1px solid rgba(32, 34, 35, 0.2);
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 14px;
          background: #ffffff;
          color: #202223;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .actions .secondary:hover {
          background: #f1f2f3;
          border-color: rgba(32, 34, 35, 0.3);
        }

        .helper-card .info-list {
          margin: 0;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: var(--p-text, #202223);
        }

        .helper-card .info-list a {
          color: inherit;
          text-decoration: underline;
        }

        .manual-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .manual-form label {
          font-weight: 500;
          color: var(--p-text, #202223);
        }

        .manual-form input {
          border: 1px solid rgba(32, 34, 35, 0.2);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
        }

        .manual-form input:focus {
          outline: none;
          border-color: #008060;
          box-shadow: 0 0 0 3px rgba(0, 128, 96, 0.2);
        }

        .manual-form .primary {
          appearance: none;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 15px;
          font-weight: 600;
          background: #008060;
          color: #ffffff;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .manual-form .primary:hover {
          background: #006e52;
        }

        @media (max-width: 720px) {
          .status-indicator-section {
            justify-content: center;
            text-align: center;
          }

          .spotlight-media {
            flex: 1 1 100%;
            min-height: 160px;
          }

          .spotlight-content {
            padding: 24px;
          }
        }

        @media (max-width: 960px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 16px;
          }

          .card {
            padding: 20px;
          }
        }
      `}</style>
    </s-page>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const shopParam = context.query.shop;
  const shop = Array.isArray(shopParam) ? shopParam[0] : shopParam;
  const hasToken = Boolean(context.req.cookies?.tok);

  if (shop && !hasToken) {
    return {
      redirect: {
        destination: `/api/oauth/start?shop=${encodeURIComponent(shop)}`,
        permanent: false,
      },
    };
  }

  return { props: {} };
};
