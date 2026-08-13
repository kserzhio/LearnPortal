# Kids Coding World Map

## Призначення

World Map є навчальною навігацією між `World` і `Level`, а не декоративною схемою. Вона показує поточну ціль, завершені й доступні рівні, заблокований контент, загальний прогрес і зароблені зірки.

## Межі реалізації

- `world-map-model.ts` — pure progression model без React, DOM і Supabase.
- `world-map.tsx` — server-rendered semantic UI.
- `/kids-coding/[courseId]` — authenticated Server Component route з прямим читанням progress із PostgreSQL.
- Course registry залишається єдиним джерелом структури світів і рівнів.

## Правила progression

1. Перший незавершений рівень першого доступного світу має стан `current`.
2. Завершений рівень відкриває наступний рівень того самого світу.
3. Завершення всіх рівнів світу відкриває наступний світ.
4. Server-verified запис у `kids_unlocks` може додатково відкрити світ.
5. На карті може бути лише один `current`; рівень у додатково відкритому світі має стан `available`.
6. Зірки обмежуються діапазоном `0..3` на рівень і підсумовуються без зміни progress data.

Модель не містить назв конкретних світів, тому послідовність `Village → Forest → Desert → Ice World → Space` додається лише через data configuration.

## Accessibility і responsive contract

- Стан повідомляється символом і видимим текстом, а не тільки кольором.
- Поточне посилання має `aria-current="step"`.
- Заблокований рівень є текстовим елементом, а не неактивним або оманливим посиланням.
- Усі доступні рівні використовують native links і мають видимий focus.
- Загальний прогрес використовує `<progress>` з текстовим label.
- Мінімальний текст — `1rem`; layout reflow не створює горизонтальний overflow на `20rem`.
- Forced Colors отримує явні межі для основних інтерактивних і статусних елементів.

## Access policy

Карта курсу доступна авторизованому користувачу. Гість може відкрити лише перший preview-рівень кожного Kids Coding курсу; запит карти веде на sign-in із перевіреним same-origin `next`. Якщо Supabase не налаштований, protected Kids routes повертають до preview-рівня.

## Подальше розширення

T-508 і T-509 наповнюють карти повними vertical slices. Нові світи та рівні не потребують нової page logic: достатньо додати versioned course configuration і синхронізувати catalog із PostgreSQL.
