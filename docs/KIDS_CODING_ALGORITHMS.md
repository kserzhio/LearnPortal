# Robot Quest — Algorithms vertical slice

## Learning sequence

`Village` містить п’ять коротких рівнів із поступовим введенням алгоритмічного мислення:

1. `Перший крок` — одна команда руху.
2. `Кілька кроків` — параметр кількості кроків і послідовність.
3. `Поворот` — напрямок, поворот і рух.
4. `Обхід перешкоди` — планування безпечного маршруту.
5. `Повторення` — повторюваний pattern через `repeat`.

Кожен level має три progressive hints, meaningful invalid path, friendly feedback без internal runtime details і три критерії stars: досягнення мети, ефективність та використання задуманої concept.

## Persistence flow

Після кожного виконання `serializeAttempt()` створює versioned data-only artifact. `KidsLevelScreen` загортає його в `KidsAttemptRecord` з UUID та timestamp:

- гостьовий preview записується через `BrowserKidsProgressStore`;
- authenticated attempt надсилається через `ApiKidsProgressStore`;
- API повторно виконує program у deterministic engine;
- PostgreSQL trigger оновлює completed state, best solution, stars, attempt count і world unlock;
- World Map читає server progress і відкриває наступний level.

Помилка синхронізації не змушує повторно проходити level: доступна окрема дія повторного збереження останнього serialized attempt.

## Access enforcement

Guest має доступ лише до першого preview level. Для authenticated routes Server Component будує World Map із PostgreSQL progress і повертає користувача на карту, якщо requested level має стан `locked`. Client UI не є джерелом authorization decisions.

## Automated contract

`npm run check:kids-algorithms` перевіряє:

- п’ять expected-success programs;
- п’ять expected-failure programs;
- три stages hints для кожного level;
- child-friendly feedback;
- три stars за intended solution;
- persistent completion усіх levels і world через versioned browser adapter.
