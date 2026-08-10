"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="state-page"><span>!</span><h1>Не вдалося завантажити сторінку.</h1><p>Спробуй повторити запит. Якщо помилка залишиться, повернися до каталогу.</p><button className="primary-link" type="button" onClick={reset}>Спробувати ще раз <span>→</span></button></main>;
}
