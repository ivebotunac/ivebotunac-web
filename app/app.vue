<script setup lang="ts">
import GlobalStyles from '~/components/layout/GlobalStyles.vue'

const site = useSiteConfig()
const siteUrl = site.url
const siteDescription = 'Ive Botunac, PhD · AI Research Engineer, assistant professor and founder based in Zadar, Croatia.'

useSchemaOrg([
  {
    '@type': 'Person' as const,
    '@id': `${siteUrl}/#person`,
    name: 'Ive Botunac',
    honorificSuffix: 'PhD',
    jobTitle: 'AI Research Engineer & Assistant Professor',
    url: siteUrl,
    address: {
      '@type': 'PostalAddress' as const,
      addressLocality: 'Zadar',
      addressCountry: 'HR'
    },
    sameAs: [
      'https://www.linkedin.com/in/ivebotunac',
      'https://scholar.google.com/citations?user=Yr-Z7D0AAAAJ',
      'https://www.croris.hr/osobe/profil/39063',
      'https://github.com/ivebotunac',
      'https://x.com/ivebotunac'
    ],
    worksFor: [
      { '@type': 'Organization' as const, name: 'Primo Technology Ltd.', url: 'https://techprimo.ai' },
      { '@type': 'Organization' as const, name: 'ALFATEC Group', url: 'https://alfatec.ai' },
      { '@type': 'Organization' as const, name: 'University of Zadar', url: 'https://www.unizd.hr' }
    ],
    alumniOf: [
      { '@type': 'CollegeOrUniversity' as const, name: 'University of Rijeka, Faculty of Informatics and Digital Technologies' },
      { '@type': 'CollegeOrUniversity' as const, name: 'University of Zadar' }
    ]
  },
  {
    '@type': 'WebSite' as const,
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: site.name,
    description: siteDescription,
    inLanguage: 'en-US',
    publisher: { '@id': `${siteUrl}/#person` }
  }
] as const)
</script>

<template>
    <GlobalStyles />
    <NuxtLoadingIndicator color="var(--pn-accent-ui)" :height="3" error-color="var(--pn-error)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
</template>
