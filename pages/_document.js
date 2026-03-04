import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1a1a1a" />
        <meta name="description" content="AlphaMind — Your structured thinking partner. Type an idea, get a breakdown." />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}