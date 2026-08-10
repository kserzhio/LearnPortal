import Link from "next/link";

export default function NotFound() {
  return <main className="state-page"><span>404</span><h1>Цю сторінку ще не спроєктовано.</h1><p>Перевір адресу або повернися до каталогу курсів.</p><Link className="primary-link" href="/courses">До курсів <span>→</span></Link></main>;
}
