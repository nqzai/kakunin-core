import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Archivo_Black, Archivo } from "next/font/google";
import { GoogleTagManagerConsentSync } from "@/components/site/GoogleTagManagerConsentSync";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "./landing.css";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-TPK6DKMT";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kakunin.ai"),
  title: {
    default: "Kakunin — KYC for AI Agents",
    template: "%s | Kakunin",
  },
  description:
    "KYC compliance infrastructure for AI agents. X.509 identities, behaviour monitoring, MiCA & EU AI Act compliance reports.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    type: "website",
    url: "https://www.kakunin.ai",
    title: "Kakunin — KYC for AI Agents",
    description: "KYC compliance infrastructure for AI agents. X.509 identities, behaviour monitoring, MiCA & EU AI Act compliance reports.",
    siteName: "Kakunin",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Kakunin — KYC for AI Agents" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kakunin — KYC for AI Agents",
    description: "KYC compliance infrastructure for AI agents. X.509 identities, behaviour monitoring, MiCA & EU AI Act compliance reports.",
    images: ["/og-image.png"],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kakunin",
  url: "https://www.kakunin.ai",
  logo: "https://www.kakunin.ai/logo.png",
  description: "KYC compliance platform for AI agents — X.509 identities, behaviour monitoring, MiCA & EU AI Act reports.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@kakunin.ai",
    contactType: "customer support",
  },
  sameAs: [
    "https://www.linkedin.com/company/kakunin",
    "https://github.com/kakunin-ai",
    "https://twitter.com/kakuninai",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivoBlack.variable} ${archivo.variable} h-full antialiased`}
    >
      <head>
        {/* Organization schema — site-wide, enables Google Knowledge Panel */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {GTM_ID && (
          /* Consent Mode v2 — must run BEFORE the GTM snippet so tags hold
             until ConsentButton grants. Without this gtag stub, the consent
             update from GoogleTagManagerConsentSync had no function to call,
             so GA4 never received analytics_storage=granted (0 sessions). */
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('consent','default',{
                  ad_storage:'denied',
                  ad_user_data:'denied',
                  ad_personalization:'denied',
                  analytics_storage:'denied',
                  wait_for_update: 500
                });
              `,
            }}
          />
        )}
        {GTM_ID && (
          /* eslint-disable-next-line @next/next/next-script-for-ga */
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){
                  w[l]=w[l]||[];
                  w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
                  var f=d.getElementsByTagName(s)[0],
                      j=d.createElement(s),
                      dl=l!='dataLayer'?'&l='+l:'';
                  j.async=true;
                  j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
                  f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
              `,
            }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              aria-hidden="true"
            />
          </noscript>
        )}
        {GTM_ID && <GoogleTagManagerConsentSync />}
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
