export type ShareChannel = "linkedin" | "telegram" | "x";

export type SharePayload = Readonly<{
  title: string;
  text: string;
  url: string;
}>;

export function buildShareUrl(channel: ShareChannel, payload: SharePayload) {
  const url = new URL({
    linkedin: "https://www.linkedin.com/sharing/share-offsite/",
    telegram: "https://t.me/share/url",
    x: "https://x.com/intent/post",
  }[channel]);

  if (channel === "linkedin") url.searchParams.set("url", payload.url);
  if (channel === "telegram") {
    url.searchParams.set("url", payload.url);
    url.searchParams.set("text", payload.text);
  }
  if (channel === "x") {
    url.searchParams.set("url", payload.url);
    url.searchParams.set("text", payload.text);
  }

  return url.toString();
}

export function isSafePublicShareUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
}
