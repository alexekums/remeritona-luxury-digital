import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { IntroAnimation } from "@/components/IntroAnimation";
import "@/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Remeritona Hotel and Suites — Luxury Stay in Abakaliki" },
      { name: "description", content: "Remeritona Hotel and Suites offers industrial-chic luxury accommodation, fine dining and event spaces in the heart of Abakaliki, Ebonyi State, Nigeria." },
      { property: "og:title", content: "Remeritona Hotel and Suites" },
      { property: "og:description", content: "Industrial-chic luxury in the heart of Abakaliki, Ebonyi State." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Montserrat:wght@300;400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      { src: "https://js.paystack.co/v1/inline.js" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

const GTRANSLATE_INIT = `
  function googleTranslateElementInit() {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'en,ig,yo,ha,fr,es,it',
      autoDisplay: false,
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    }, 'google_translate_element');
  }
`;

const GTRANSLATE_CSS = `
  .goog-te-banner-frame, .skiptranslate { display: none !important; }
  body { top: 0 !important; }
  #google_translate_element { display: none !important; }
  .goog-tooltip, .goog-tooltip:hover { display: none !important; }
  .goog-text-highlight { background: transparent !important; box-shadow: none !important; }
  font[style*="background-color"] { background: transparent !important; }
`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: GTRANSLATE_CSS }} />
      </head>
      <body>
        {children}
        <div id="google_translate_element" />
        <script dangerouslySetInnerHTML={{ __html: GTRANSLATE_INIT }} />
        <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <IntroAnimation />
      <Outlet />
      <WhatsAppButton />
    </>
  );
}
