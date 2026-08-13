"use client";

import { useId, useState } from "react";
import { SystemIcon } from "@/components/ui/system-icon";
import { buildShareUrl, isSafePublicShareUrl, type SharePayload } from "@/features/sharing/share-links";

type SharePanelProps = Readonly<{
  heading: string;
  description: string;
  payload: SharePayload;
  compact?: boolean;
}>;

async function copyText(value: string) {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function SharePanel({ heading, description, payload, compact = false }: SharePanelProps) {
  const [message, setMessage] = useState("");
  const headingId = useId();
  const validUrl = isSafePublicShareUrl(payload.url);

  async function shareNatively() {
    if (!validUrl) return setMessage("Посилання недоступне для поширення.");
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return setMessage("Поширення завершено.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return setMessage("");
      }
    }
    setMessage(await copyText(payload.url) ? "Посилання скопійовано." : "Скопіюй посилання з поля нижче.");
  }

  async function copyLink() {
    if (!validUrl) return setMessage("Посилання недоступне для копіювання.");
    setMessage(await copyText(payload.url) ? "Посилання скопійовано." : "Скопіюй посилання з поля нижче.");
  }

  return (
    <section className={`share-panel${compact ? " compact" : ""}`} aria-labelledby={headingId}>
      <div className="share-panel-copy">
        <p>SHARE · SYSTEMA</p>
        <h2 id={headingId}>{heading}</h2>
        <span>{description}</span>
      </div>
      <div className="share-panel-actions">
        <button type="button" onClick={shareNatively} disabled={!validUrl}><SystemIcon name="share" /> Поділитися</button>
        <button type="button" onClick={copyLink} disabled={!validUrl}><SystemIcon name="copy" /> Копіювати</button>
        <a aria-label="Поділитися в LinkedIn, відкриється нова вкладка" href={buildShareUrl("linkedin", payload)} target="_blank" rel="noopener noreferrer">LinkedIn <SystemIcon name="arrow-up-right" /></a>
        <a aria-label="Поділитися в Telegram, відкриється нова вкладка" href={buildShareUrl("telegram", payload)} target="_blank" rel="noopener noreferrer">Telegram <SystemIcon name="arrow-up-right" /></a>
        <a aria-label="Поділитися в X, відкриється нова вкладка" href={buildShareUrl("x", payload)} target="_blank" rel="noopener noreferrer">X <SystemIcon name="arrow-up-right" /></a>
      </div>
      <label className="share-panel-url">Публічне посилання<input type="text" value={payload.url} readOnly onFocus={(event) => event.currentTarget.select()} /></label>
      <p className="share-panel-status" role="status" aria-live="polite">{message}</p>
    </section>
  );
}
