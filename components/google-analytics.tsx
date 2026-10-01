import Script from "next/script";

/**
 * Google Analytics 4 (gtag.js).
 *
 * The ID is baked in so the tag works without anyone remembering to set a
 * variable, but `NEXT_PUBLIC_GA_MEASUREMENT_ID` overrides it — and setting
 * that to an empty string turns the tag off for an environment, which is the
 * escape hatch a future staging deploy will want.
 *
 * Production only. A dev machine and a preview deploy both report as the live
 * property otherwise, and the resulting traffic is indistinguishable from real
 * visitors after the fact. This mirrors how PostHog behaves here, which no-ops
 * when its key is absent.
 *
 * next/script rather than raw tags: `afterInteractive` (its default) loads
 * gtag after hydration, so analytics cannot delay first paint on the landing
 * page. The inline block needs an `id` for Next to track it.
 *
 * Client-side navigation is already covered — GA4's enhanced measurement
 * listens to History API changes by default, so App Router route changes are
 * counted without a custom listener. If that setting is ever turned off in the
 * GA property, this component is where the manual page_view would go.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-K697V9YS8C";

export function GoogleAnalytics() {
  if (!GA_ID || process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
