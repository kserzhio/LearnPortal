const DEFAULT_AUTH_REDIRECT = "/dashboard";

export function getSafeAuthRedirect(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const parsed = new URL(value, "https://systema.invalid");
    if (parsed.origin !== "https://systema.invalid") return DEFAULT_AUTH_REDIRECT;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
