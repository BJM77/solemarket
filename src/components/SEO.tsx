import Head from 'next/head'

type Props = {
  title?: string
  description?: string
  image?: string
  url?: string
}

export default function SEO({ title, description, image, url }: Props) {
  const site = 'Benched.au'
  const titleText = title ? `${title} — ${site}` : site
  const desc = description || 'Buy and sell used basketball shoes and NBA cards on Benched.au'
  const img = image || '/og-default.jpg'

  return (
    <Head>
      <title>{titleText}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={titleText} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={titleText} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Head>
  )
}
