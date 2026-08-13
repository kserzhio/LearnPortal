# SYSTEMA Technical SEO

Оновлено: 2026-08-12 · задача T-602

## Indexing policy

Індексуємо лише сторінки, які мають реальний видимий контент і доступні без входу:

- homepage та catalog;
- опубліковану сторінку курсу High Load Architecture;
- перше публічне заняття за canonical URL `/courses/high-load-architecture/lessons/what-is-high-load`;
- перший безкоштовний рівень кожного Kids course.

Auth, profile, dashboard, API та legacy runtime не індексуються. Planned courses можуть залишатися видимими в каталозі, але їхні detail pages мають `noindex`. Закриті уроки не отримують публічні SEO-сторінки до окремого product decision, тому SEO не обходить server-side access rules.

## Metadata contract

`src/lib/seo/site.ts` є єдиним джерелом для canonical, Open Graph, Twitter, robots і site URL. Production fallback — `https://learn-portal-gamma.vercel.app`; custom domain задається через `NEXT_PUBLIC_SITE_URL`.

Course metadata походить із course definition, lesson metadata — із lesson definition та його `seo` contract. Публічний lesson slug не залежить від заголовка, тому перейменування контенту не ламає bookmarks.

## Structured data

Використовуємо лише дані, які видно на сторінці:

- `Course` — на published course page;
- `BreadcrumbList` — на course і public lesson/level pages;
- `FAQPage` — тільки поруч із фактично відображеним FAQ.

Не додаємо fake rating, price, reviews, accreditation або completion claims.

## Redirects і legacy

`/courses/high-load-architecture/preview` робить permanent redirect на canonical lesson URL. Guest-запити до `/legacy/index.html` також переходять на public lesson через server proxy. Для авторизованого користувача legacy hash-bookmarks залишаються робочими, бо це повне навчальне середовище.

## Verification

Run:

```text
npm run check:seo
npm run typecheck
npm run lint
npm run build
```

Після build перевірити `/robots.txt`, `/sitemap.xml`, canonical lesson, old preview redirect і `noindex` на auth/dashboard/profile.

