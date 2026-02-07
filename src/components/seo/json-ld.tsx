type JsonLdData = Record<string, unknown>;

type JsonLdProps = {
  data: JsonLdData;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Organization schema for the root site
export function OrganizationJsonLd() {
  const data: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sentinela",
    url: "https://sentinela.help",
    logo: "https://sentinela.help/favicon.png",
    description:
      "Crowdsourced emergency reporting platform. Report disasters, fires, floods, and emergencies on a map. Community-validated alerts sent to local government.",
    parentOrganization: {
      "@type": "Organization",
      name: "Darkmatter AI Labs",
      url: "https://darkmatter.is",
    },
  };

  return <JsonLd data={data} />;
}

// WebSite schema for search features
export function WebSiteJsonLd() {
  const data: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sentinela",
    url: "https://sentinela.help",
    description:
      "Crowdsourced emergency reporting platform for community safety.",
    creator: {
      "@type": "Organization",
      name: "Darkmatter AI Labs",
      url: "https://darkmatter.is",
    },
  };

  return <JsonLd data={data} />;
}

// Breadcrumb schema
type BreadcrumbItem = {
  name: string;
  url: string;
};

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}

// Article schema for report pages
type ArticleJsonLdProps = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  datePublished: string;
  dateModified: string;
};

export function ArticleJsonLd({
  title,
  description,
  url,
  imageUrl,
  datePublished,
  dateModified,
}: ArticleJsonLdProps) {
  const data: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: imageUrl || "https://sentinela.help/og_share.png",
    datePublished,
    dateModified,
    author: {
      "@type": "Organization",
      name: "Sentinela Community",
      url: "https://sentinela.help",
    },
    publisher: {
      "@type": "Organization",
      name: "Sentinela",
      url: "https://sentinela.help",
      logo: {
        "@type": "ImageObject",
        url: "https://sentinela.help/favicon.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return <JsonLd data={data} />;
}

// Emergency/Incident report schema (uses NewsArticle for breaking news semantics)
type IncidentReportJsonLdProps = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  datePublished: string;
  dateModified: string;
  latitude: number;
  longitude: number;
  address?: string;
  incidentType: string;
};

export function IncidentReportJsonLd({
  title,
  description,
  url,
  imageUrl,
  datePublished,
  dateModified,
  latitude,
  longitude,
  address,
  incidentType,
}: IncidentReportJsonLdProps) {
  const data: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    url,
    image: imageUrl || "https://sentinela.help/og_share.png",
    datePublished,
    dateModified,
    author: {
      "@type": "Organization",
      name: "Sentinela Community",
      url: "https://sentinela.help",
    },
    publisher: {
      "@type": "Organization",
      name: "Sentinela",
      url: "https://sentinela.help",
      logo: {
        "@type": "ImageObject",
        url: "https://sentinela.help/favicon.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: [incidentType, "emergency", "incident report", "community safety"],
    contentLocation: {
      "@type": "Place",
      name: address || `${latitude}, ${longitude}`,
      geo: {
        "@type": "GeoCoordinates",
        latitude,
        longitude,
      },
    },
  };

  return <JsonLd data={data} />;
}
