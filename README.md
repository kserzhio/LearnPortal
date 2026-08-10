# Systema Learning Portal

Інтерактивний навчальний портал з архітектури програмних систем.

Поточний статус, наступні кроки та критерії завершення: [TASKS.md](TASKS.md).

## Stack

- Next.js App Router + TypeScript
- Supabase PostgreSQL, Auth, Storage-ready architecture
- Google та GitHub OAuth
- Supabase Row Level Security
- Legacy simulator runtime для першого 19-урокового курсу

## Local development

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Без `.env.local` каталог і legacy-курс працюють у setup mode, а auth-кнопки залишаються вимкненими.

## Supabase setup

1. Створи Supabase project.
2. Скопіюй Project URL та publishable key у `.env.local`.
3. Виконай migration із `supabase/migrations` через Supabase CLI або SQL Editor.
4. Увімкни Google і GitHub у **Authentication → Providers**.
5. Додай callback URL `https://<project-ref>.supabase.co/auth/v1/callback` у Google/GitHub OAuth apps.
6. Додай production і local URLs до Supabase redirect allow list.

Ніколи не додавай `service_role`, OAuth client secrets або `.env.local` у Git.

## Routes

- `/` — portal landing
- `/courses` — каталог курсів
- `/courses/high-load-architecture` — сторінка курсу
- `/legacy/index.html#lesson-1` — чинний інтерактивний курс
- `/auth/sign-in` — Google/GitHub login
- `/dashboard` — синхронізований прогрес

## Data ownership

Усі персональні таблиці захищені RLS і дозволяють користувачу працювати лише зі своїми rows. Course content залишається version-controlled у коді; PostgreSQL зберігає catalog metadata та learning state.
