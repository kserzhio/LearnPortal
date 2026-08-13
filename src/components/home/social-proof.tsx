import styles from "./homepage.module.css";

export type SocialProofMetric = Readonly<{ label: string; value: number }>;
export type SocialProofTestimonial = Readonly<{ quote: string; author: string }>;

export function SocialProof({ metrics = [], testimonials = [] }: { metrics?: readonly SocialProofMetric[]; testimonials?: readonly SocialProofTestimonial[] }) {
  if (metrics.length === 0 && testimonials.length === 0) return null;
  return (
    <section className={styles.socialProof} aria-labelledby="social-proof-title">
      <h2 id="social-proof-title">SYSTEMA у цифрах</h2>
      {metrics.length > 0 ? <dl>{metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value.toLocaleString("uk-UA")}</dd></div>)}</dl> : null}
      {testimonials.length > 0 ? <div>{testimonials.map((item) => <figure key={`${item.author}-${item.quote}`}><blockquote>{item.quote}</blockquote><figcaption>{item.author}</figcaption></figure>)}</div> : null}
    </section>
  );
}
