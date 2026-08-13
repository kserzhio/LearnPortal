# Growth Dashboard

Внутрішній агрегований звіт доступний на `/dashboard/growth` лише користувачам із роллю `ADMIN` або `INSTRUCTOR`. Сторінка рендериться на сервері, не індексується та не повертає ідентифікатори користувачів, email, тексти питань чи інший персональний контент.

## Період

- Початкова дата входить у період.
- Кінцева дата входить у період у формі, але передається в SQL як виключна межа наступного дня: `[start, end + 1 day)`.
- Стандартний період — останні 30 календарних дат.
- Максимальна довжина — 366 днів.
- Невалідний діапазон безпечно повертається до стандартного періоду.

## Формули

| Метрика | Джерело | Формула |
| --- | --- | --- |
| Активні учні | `lesson_progress`, `kids_level_attempts`, `knowledge_check_attempts` | Кількість унікальних `user_id`, які мали хоча б один запис активності в періоді. |
| Adult activity records | `lesson_progress` | Кількість progress-записів, у яких `updated_at` потрапляє в період. Це не перегляди сторінок. |
| Завершені заняття | `lesson_progress` | Кількість записів із `completed_at` у періоді. |
| Завершені курси | `lesson_progress` + catalog | Користувач завершив усі заняття опублікованого курсу; датою завершення вважається найпізніший `completed_at`. |
| Kids attempts | `kids_level_attempts` | Кількість усіх збережених запусків у періоді. |
| Kids completions | `kids_level_attempts` | Кількість успішних запусків у періоді. |
| Helpful feedback | `lesson_feedback` | `helpful / усі feedback-відповіді × 100%` за період. При відсутності відповідей показується `—`, а не `0%`. |
| Knowledge Check success | `knowledge_check_attempts` | `correct / усі attempts × 100%` за період. При відсутності attempts показується `—`. |
| Питання | `lesson_questions` | Кількість питань, ідей і повідомлень про проблему, створених у періоді. |
| Вирішені питання | `lesson_questions` | Частка створених у періоді записів, які зараз мають стан `resolved`. |
| Course enrollments | `course_enrollments` | Поточна загальна кількість enrollment-записів для курсу; це snapshot, а не приріст у періоді. |
| Upcoming-course votes | `course_roadmap_votes` | Поточний aggregate голосів за запланований курс; це snapshot, а не приріст у періоді. |

## Свідомо недоступні метрики

Custom events поставлені на паузу, тому dashboard не вигадує та не підміняє нулями:

- visitors і page views — доступні окремо у Vercel Web Analytics, але не в PostgreSQL;
- funnel `Homepage → Course → Start → Complete`;
- returning learners на основі історії сесій;
- hints і shares.

Для цих показників інтерфейс показує `Measurement gaps`. Їх можна додати лише після погодженого відновлення privacy-safe event persistence.

## Безпека та доступ

SQL-функція `growth_dashboard_snapshot` є `SECURITY DEFINER`, але перед агрегацією перевіряє `is_learning_moderator()` і доступна тільки authenticated users. Вона повертає лише counts, percentages і course-level aggregates.

Роль потрібно призначати свідомо в адміністративному контексті Supabase. Не слід додавати автоматичне підвищення першого користувача або змінювати роль із клієнта. Після призначення `ADMIN` чи `INSTRUCTOR` посилання «Аналітика» з’явиться в header.

## Перевірка

```text
npm run check:growth
npm run typecheck
npm run lint
npm run check:font-size
npm run check:icons
npm run build
```
