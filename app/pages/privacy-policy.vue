<script setup lang="ts">
import { CV_SHARE_IMAGE } from '~/composables/useCvSeo'

const site = useSiteConfig()
const siteUrl = site.url
const pageUrl = `${siteUrl}/privacy-policy`
const pageTitle = 'Privacy Policy | Ive Botunac'
const pageDescription = 'How ivebotunac.com handles personal data: hosting logs, Google Analytics, email you send, how long it is kept and your rights.'
const image = CV_SHARE_IMAGE ? `${siteUrl}${CV_SHARE_IMAGE}` : undefined

const { loadGoogleAnalytics } = useGoogleAnalytics()

onMounted(() => {
  loadGoogleAnalytics()
})

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogType: 'website',
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogSiteName: site.name,
  ogImage: image,
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
  <section class="pn-section">
    <div class="container container--prose">
      <header class="privacy__head">
        <h1 class="privacy__title">Privacy Policy</h1>
        <p class="privacy__updated">Last updated: October 25, 2026</p>
      </header>

      <article class="pn-prose">
        <h2 id="controller">Who I Am</h2>
        <p>
          This is the personal website of Ive Botunac, Zadar, Croatia. I decide how the personal data described here is
          used, so I am its controller. Questions about this policy go to the address under
          <a href="#contact">Contact</a>.
        </p>

        <h2 id="scope">What This Policy Covers</h2>
        <p>
          This policy covers this website: its pages and the small game that runs on them. It does not cover the sites
          and profiles it links to, such as LinkedIn, Google Scholar, the app stores or the sites of the companies I
          work with, which follow their own policies.
        </p>
        <p>
          In short: you can read the site without an account and there is no form to fill in. The hosting provider
          keeps short request logs, and Google Analytics measures visits. I do not sell your data or use it for
          advertising.
        </p>

        <h2 id="data">What I Collect and Why</h2>
        <h3>Visiting the site</h3>
        <ul>
          <li>
            <strong>What:</strong> your IP address, the address of the page you open, the time, your browser's user
            agent and the page that linked here. Every browser sends these with each request, and the hosting provider
            records them in its request logs.
          </li>
          <li><strong>Why:</strong> to deliver the pages, keep the site secure and find errors.</li>
          <li>
            <strong>Legal basis:</strong> my legitimate interest in running a working and secure website
            (Art. 6(1)(f) GDPR).
          </li>
        </ul>

        <h3 id="analytics">Google Analytics</h3>
        <ul>
          <li>
            <strong>What:</strong> Google Analytics 4 records the pages you view, how you arrived, your device and
            browser, an approximate location derived from your IP address (Google Analytics does not store the IP
            address itself) and actions such as scrolling a page or following a link to another site. It sets a cookie
            that expires after two hours, so a later visit is not linked to an earlier one.
          </li>
          <li><strong>Why:</strong> to see which parts of the site people read and how they find it.</li>
          <li>
            <strong>Legal basis:</strong> my legitimate interest in understanding how the site is used (Art. 6(1)(f)
            GDPR). You can object at any time by writing to the address under <a href="#contact">Contact</a>, or block
            it with a browser setting or extension; the site works the same without it.
          </li>
        </ul>
        <p>
          Apart from that cookie the site sets no cookies. The little robot on the page remembers, in your browser's
          local storage, which of its tricks you have tried, your best combo and how many times you have visited, so it
          can greet you instead of explaining itself again. That record never leaves your browser and is not sent to me
          or anyone else; clearing the site's data in your browser deletes it. Fonts and images come from the site's own
          hosting, so reading a page sends nothing to a font or advertising service.
        </p>

        <h3>Email you send me</h3>
        <ul>
          <li><strong>What:</strong> your email address, your name if you include it, and your message.</li>
          <li><strong>Why:</strong> to read your message and reply to it.</li>
          <li>
            <strong>Legal basis:</strong> taking the steps you ask for (Art. 6(1)(b) GDPR), and otherwise my legitimate
            interest in answering messages sent to me (Art. 6(1)(f) GDPR).
          </li>
        </ul>

        <h2 id="recipients">Who Receives It</h2>
        <p>These providers process data for me, on my instructions:</p>
        <ul>
          <li>
            <strong>Google Cloud</strong> (Firebase App Hosting) hosts the site and keeps the request logs.
            <a href="https://cloud.google.com/terms/cloud-privacy-notice" target="_blank" rel="noopener">Google Cloud Privacy Notice</a>
          </li>
          <li>
            <strong>Google Analytics</strong> measures visits as described above.
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google Privacy Policy</a>
          </li>
          <li>
            <strong>Google</strong> (Gmail) receives and stores the email you send me.
          </li>
        </ul>
        <p>
          I do not sell your data or share it for advertising. I disclose it to authorities only where the law requires
          it.
        </p>

        <h2 id="transfers">Transfers Outside the EU</h2>
        <p>
          Google may process this data in the United States. Google LLC is certified under the EU-US Data Privacy
          Framework, which covers those transfers; where it does not apply, the Standard Contractual Clauses in Google's
          data processing terms do.
        </p>

        <h2 id="retention">How Long It Is Kept</h2>
        <ul>
          <li><strong>Server request logs:</strong> 30 days, after which the hosting provider deletes them.</li>
          <li><strong>Analytics:</strong> Google Analytics keeps event data for no longer than 14 months.</li>
          <li>
            <strong>Email:</strong> until the conversation is finished and no follow-up is expected, then I delete it.
            A message that becomes part of an agreement is kept as long as contract and accounting law require.
          </li>
        </ul>

        <h2 id="children">Children</h2>
        <p>
          This site is meant for adults and does not knowingly collect data from children under 16. If you are under 16,
          please ask a parent or guardian before writing to me.
        </p>

        <h2 id="rights">Your Rights</h2>
        <p>
          You can ask for a copy of your data, to correct it, to delete it, to restrict how it is used, to receive it in a
          portable form, and to object to processing based on legitimate interest, analytics included. Write to the
          address under <a href="#contact">Contact</a>; I answer within one month. You can also lodge a complaint with
          the Croatian Personal Data Protection Agency (AZOP) or the supervisory authority where you live.
        </p>

        <h2 id="changes">Changes to This Policy</h2>
        <p>When this policy changes, I update this page and the date at the top.</p>

        <h2 id="contact">Contact</h2>
        <p>
          Ive Botunac, Zadar, Croatia,
          <a href="mailto:removed@example.invalid">removed@example.invalid</a>.
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.privacy__head { margin-bottom: var(--pn-space-48); }
.privacy__title {
  margin: 0 0 var(--pn-space-8);
  font-size: var(--pn-size-2xl);
  color: var(--pn-text);
}
.privacy__updated {
  margin: 0;
  color: var(--pn-text-muted);
  font-size: var(--pn-size-sm);
}
</style>
