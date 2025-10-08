import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Nodig voor Polaris Web Components */}
          <meta name="shopify-api-key" content={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY} />
          <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
          <script src="https://cdn.shopify.com/shopifycloud/polaris.js" />
          {/* (Je gebruikt nog steeds je NPM app-bridge in /admin voor redirects; dit is prima samen) */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
