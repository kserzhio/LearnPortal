import type { StructuredData as StructuredDataValue } from "@/lib/seo/structured-data";

function serialize(data: StructuredDataValue) {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

export function StructuredData({ data }: Readonly<{ data: StructuredDataValue }>) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(data) }} />;
}

