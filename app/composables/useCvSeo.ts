// The share card; a redraw gets the next /images/share-<n>.jpg, since /images is cached immutable.
export const CV_SHARE_IMAGE: string | undefined = '/images/share-1.jpg'

export const CV_TITLE = 'Ive Botunac, PhD · AI Research Engineer & Assistant Professor'

export function useCvSeo(): void {
  const site = useSiteConfig()
  const siteUrl = site.url
  const description = 'Ive Botunac, PhD · AI Research Engineer, assistant professor and founder based in Zadar, Croatia. Experience, projects, publications, education and more.'
  const shareDescription = 'AI Research Engineer, assistant professor and founder based in Zadar, Croatia.'
  const image = CV_SHARE_IMAGE ? `${siteUrl}${CV_SHARE_IMAGE}` : undefined

  // An undefined value drops the tag.
  useSeoMeta({
    title: CV_TITLE,
    description,
    ogType: 'website',
    ogTitle: CV_TITLE,
    ogDescription: shareDescription,
    ogUrl: siteUrl,
    ogSiteName: site.name,
    ogImage: image,
    ogImageWidth: image ? 1200 : undefined,
    ogImageHeight: image ? 630 : undefined,
    ogImageType: image ? 'image/jpeg' : undefined,
    ogImageAlt: image ? CV_TITLE : undefined,
    twitterCard: 'summary_large_image',
    twitterTitle: CV_TITLE,
    twitterDescription: shareDescription,
    twitterImage: image
  })

  useHead({ link: [{ rel: 'canonical', href: siteUrl }] })

  useSchemaOrg([
    {
      '@type': 'ProfilePage' as const,
      '@id': `${siteUrl}/#webpage`,
      url: siteUrl,
      name: CV_TITLE,
      description,
      isPartOf: { '@id': `${siteUrl}/#website` },
      mainEntity: { '@id': `${siteUrl}/#person` },
      inLanguage: 'en-US'
    }
  ])
}
