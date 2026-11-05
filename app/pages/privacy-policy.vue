<script setup lang="ts">
import { CV_SHARE_IMAGE, CV_TITLE } from '~/composables/useCvSeo'

const site = useSiteConfig()
const siteUrl = site.url
const pageUrl = `${siteUrl}/privacy-policy`
const pageTitle = 'Privacy Policy | Ive Botunac'
const pageDescription = 'How Primo Technology Ltd. handles personal data on ivebotunac.com: hosting logs, Google Analytics, email you send, how long it is kept and your rights.'
const image = `${siteUrl}${CV_SHARE_IMAGE}`

const { loadGoogleAnalytics } = useGoogleAnalytics()

onMounted(() => {
  loadGoogleAnalytics()
})

// Reachable and linked, but only the homepage is for search.
useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  robots: 'noindex, follow',
  ogType: 'website',
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogSiteName: site.name,
  ogImage: image,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/jpeg',
  ogImageAlt: CV_TITLE,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: image
})

useHead({ link: [{ rel: 'canonical', href: pageUrl }] })

useSchemaOrg([
  {
    '@type': 'WebPage' as const,
    '@id': `${pageUrl}/#webpage`,
    url: pageUrl,
    name: 'Privacy Policy',
    description: pageDescription,
    isPartOf: { '@id': `${siteUrl}/#website` },
    inLanguage: 'en-US'
  },
  {
    '@type': 'BreadcrumbList' as const,
    '@id': `${pageUrl}/#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem' as const, position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem' as const, position: 2, name: 'Privacy Policy', item: pageUrl }
    ]
  }
] as const)
</script>

<template>
  <section class="pn-section privacy">
    <div class="container privacy__doc">
      <header class="privacy__head">
        <h1 class="privacy__title">Privacy Policy</h1>
        <p class="privacy__updated">Last updated: October 27, 2026</p>
      </header>

      <article class="pn-prose">
        <h2 id="controller">Who We Are</h2>
        <p>
          ivebotunac.com is the personal website of Ive Botunac, run by his company, Primo Technology Ltd. (“we”, “us”),
          which is the controller of the personal data described here. You can reach us at the address under
          <a href="#contact">Contact</a>. The site has no account and no form, and we do not sell your data or use it
          for advertising.
        </p>

        <h2 id="data">What We Collect and Why</h2>
        <ul>
          <li>
            <strong>Visits:</strong> your IP address, the page you open, the time, your browser’s user agent and the
            referring page, which every browser sends and our hosting provider logs. We use them to deliver the site,
            keep it secure and find errors, under our legitimate interest (Art. 6(1)(f) GDPR).
          </li>
          <li id="analytics">
            <strong>Analytics:</strong> Google Analytics 4 records the pages you view, how you arrived, your device and
            browser, an approximate location (the IP address itself is not stored) and actions such as following a
            link. Its cookie expires after two hours. We use it to see what people read, under our legitimate interest
            (Art. 6(1)(f) GDPR); you can object by writing to us or block it in your browser, and the site works the
            same without it.
          </li>
          <li>
            <strong>The robot game:</strong> the little robot remembers, in your browser’s local storage, which tricks
            you have tried, your best combo, how many times you have popped it, how often you have visited, which
            sub-agents you found, how long you have spent on the page while finding them and how long the whole team took,
            which of its forms you have seen, and your best boss time, plus whether you have already seen the two first-visit tips. Clearing the site’s data deletes it. The finished team time is also sent to our server for the
            site-wide totals described next, and game events (hits, pops, agents found, the team time, boss fights and
            their times, new forms seen, and clicks on the team card) go to Google Analytics as described under <a href="#analytics">Analytics</a>.
          </li>
          <li>
            <strong>Game counters:</strong> the game sends anonymous events (a finished team with its time, a boss fight and its time)
            to our server, which adds them to site-wide totals stored in Google Cloud Firestore. No IP address is stored in Firestore; the IP address is held in memory for about ten minutes only to stop abuse,
            under our legitimate interest (Art. 6(1)(f) GDPR), and the request itself appears in the hosting logs
            described under Visits.
          </li>
          <li>
            <strong>Leaderboard:</strong> when a boss fight starts, our server stores a record of that fight (a random
            id, the start time and later the finish time) so it can time it itself; the id of your fastest fight is kept
            in your browser’s local storage. If you sign it, the three letters you type and your best time are shown
            publicly on the leaderboard. Choose letters that do not identify you if you prefer. To remove an entry, write
            to us with the letters and the time. Legal basis: our legitimate interest in running the game (Art. 6(1)(f)
            GDPR).
          </li>
          <li>
            <strong>Email you send us:</strong> your address, name and message, used to reply (Art. 6(1)(b) and (f)
            GDPR).
          </li>
        </ul>
        <p>Fonts and images come from the site’s own hosting, so reading a page sends nothing to a font or ad service.</p>

        <h2 id="recipients">Who Receives It</h2>
        <ul>
          <li>
            <strong>Google Cloud</strong> (Firebase App Hosting and Firestore) hosts the site, keeps the request logs
            and stores the game totals.
            <a href="https://cloud.google.com/terms/cloud-privacy-notice" target="_blank" rel="noopener">Google Cloud Privacy Notice</a>
          </li>
          <li>
            <strong>Google Analytics</strong> measures visits as described above.
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google Privacy Policy</a>
          </li>
          <li>
            <strong>SiteGround</strong> hosts our email and stores the messages you send us.
            <a href="https://www.siteground.com/privacy.htm" target="_blank" rel="noopener">SiteGround Privacy Policy</a>
          </li>
        </ul>
        <p>
          Google may process data in the United States under the EU-US Data Privacy Framework, or otherwise the Standard
          Contractual Clauses in its data processing terms. SiteGround is an EU-based company. We disclose data to
          authorities only where the law requires it.
        </p>

        <h2 id="retention">How Long It Is Kept</h2>
        <p>
          Request logs for 30 days; analytics data for no longer than 14 months; email until the conversation is
          finished, or as long as contract and accounting law require if it becomes part of an agreement.
        </p>

        <h2 id="rights">Your Rights</h2>
        <p>
          You can ask for a copy of your data, to correct or delete it, to restrict its use, to receive it in a portable
          form, and to object to processing based on legitimate interest, analytics included. Write to us and we answer
          within one month. You can also complain to the Croatian Personal Data Protection Agency (AZOP) or the
          supervisory authority where you live. The site is not meant for children under 16.
        </p>

        <h2 id="changes">Changes</h2>
        <p>When this policy changes, we update this page and the date at the top.</p>

        <h2 id="contact">Contact</h2>
        <p>Primo Technology Ltd. Email: <a href="mailto:info@techprimo.ai">info@techprimo.ai</a>.</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.privacy__doc { max-width: 860px; }
.privacy__head { margin-bottom: var(--pn-space-48); }
.privacy__title {
  margin: 0 0 var(--pn-space-8);
  font-size: var(--pn-size-2xl);
  color: var(--pn-text);
}
.privacy__updated {
  color: var(--pn-text-muted);
  font-size: var(--pn-size-sm);
}
</style>
