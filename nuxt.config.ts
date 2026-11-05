// https://nuxt.com/docs/api/configuration/nuxt-config

// The CDN keeps prerendered pages an hour and serves stale while refetching; browsers always revalidate.
const htmlCache = { 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' }

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  experimental: { viewTransition: true },

  modules: [
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    'nuxt-vitalizer',
    'nuxt-schema-org',
    '@nuxt/fonts',
    '@nuxt/eslint',
  ],

  // For LCP. 'entry' strips the entry CSS on every route, so global CSS must ship from a component.
  vitalizer: {
    disableStylesheets: 'entry',
    disablePrefetchLinks: true,
  },

  // Only .vue files are components, so data and helpers can sit beside the component that uses them.
  components: [
    { path: '~/components', extensions: ['.vue'] },
  ],

  // Self-hosted; the families are named here because the CSS only names them inside the font tokens.
  // One entry per family, so weights and styles cross: Plex Mono also declares italic 500 and 600, never fetched unless used.
  // No metric fallbacks: the old page fell back to the stacks in its font tokens, unchanged.
  fonts: {
    processCSSVariables: true,
    families: [
      { name: 'IBM Plex Mono', weights: [400, 500, 600], styles: ['normal', 'italic'], fallbacks: [] },
      { name: 'Space Mono', weights: [400, 700], styles: ['normal', 'italic'], fallbacks: [] },
    ],
  },

  // Site configuration for SEO and sitemap
  site: {
    url: 'https://ivebotunac.com',
    name: 'Ive Botunac',
    indexable: true
  },

  // Only the homepage is for search: the PDF CV's source page and the privacy policy stay out.
  sitemap: { exclude: ['/cv-print', '/privacy-policy'] },

  robots: {
    allow: ['/'],
    sitemap: ['/sitemap.xml']
  },

  // Global head, a fallback only; pages set their own.
  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      link: [
        // Brand icons, declared once globally; a per-page icon link would fetch them twice.
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/images/favicon-ib.svg'
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '64x64',
          href: '/images/favicon-ib-64.png'
        },
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/images/apple-touch-icon-ib-180.png'
        },
      ]
    },
  },

  routeRules: {
    // Static assets: an image gets a new filename when replaced, so a year and immutable are safe.
    // /_nuxt/** is absent on purpose: its filenames are hashed and Nitro sets its headers.
    '/images/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    // Named, unhashed and occasionally replaced: a short max-age, then revalidate.
    '/robots.txt': { headers: { 'cache-control': 'public, max-age=86400' } },
    '/sitemap.xml': { headers: { 'cache-control': 'public, max-age=3600' } },

    // The old static site was served as /index.html.
    '/index.html': { redirect: { to: '/', statusCode: 301 }, prerender: false },

    // Enable prerendering for public pages (SEO)
    '/': { prerender: true, headers: htmlCache },
    '/privacy-policy': { prerender: true, headers: htmlCache },
    // The PDF has no head, so the header carries its noindex.
    '/ive-botunac-cv.pdf': { headers: { 'x-robots-tag': 'noindex' } },
    // The PDF CV's source page: built so the script can print it; the page itself says noindex.
    '/cv-print': { prerender: true },
  },

  nitro: {
    compressPublicAssets: true,
  },
});
