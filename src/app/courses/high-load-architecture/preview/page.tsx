import { permanentRedirect } from "next/navigation";

export default function LegacyPreviewRedirectPage() {
  permanentRedirect("/courses/high-load-architecture/lessons/what-is-high-load");
}
