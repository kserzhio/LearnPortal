# Skill taxonomy

SYSTEMA використовує versioned taxonomy навичок окремо від назв курсів і занять. Taxonomy описує, **що людина вчиться робити**, а mappings — який опублікований або запланований content формує цю навичку. Модель не містить score, mastery percentage чи персонального progress.

## Schema v1

Кореневий документ має `schema: systema.skill-taxonomy`, `schemaVersion`, `contentVersion`, `skills` і `mappings`.

Кожен skill має:

- stable `id` і URL-ready `slug`;
- короткі `title` та `description` українською;
- stable `category` для майбутнього filter UI;
- `parentId` або `null` для кореневого node.

Порядок масиву не визначає hierarchy: єдиним джерелом зв’язку є `parentId`. Validator відхиляє missing parent, self/indirect cycle, duplicate ID і duplicate slug. Це готує рівноцінний nested-list view у T‑707.

## Content mappings

Mapping має власний stable ID, `skillId` і content reference:

```text
catalog: adult | kids
courseId: stable course ID
contentType: course | unit
contentId: null для course або lesson/level ID для unit
```

Adult unit відповідає lesson, Kids unit — playable level. Validator звіряє посилання з чинними data-driven catalogs і відхиляє orphan course/unit, orphan skill та duplicate content mapping.

Багато mappings можуть посилатися на одну unit, тому одне заняття формує кілька навичок. Один skill може мати mappings у різних курсах і навіть catalogs. Наприклад, `systems-thinking` використовується в High Load Architecture та Robot Quest, а `high-load-01` одночасно формує `capacity-planning` і `reliability-engineering`.

## High Load fixture

Поточне дерево містить десять змістовних nodes: системне мислення, робота з вимогами, оцінка потужності, архітектурний дизайн, взаємодія сервісів, стратегія даних, масштабування, надійність, спостережуваність і доступні системні вимоги.

Назви skills не копіюють механічно titles занять. Mappings охоплюють усі 19 High Load lessons через конкретні learning capabilities; structural course mapping використовується для shared `systems-thinking`.

## Skill progress states

T‑706 додає pure `buildSkillProgress()` над taxonomy, content catalog і фактичними завершеннями lessons/levels. Результат кожного skill містить:

- `state`: `not_started`, `in_progress` або `completed`;
- український `stateLabel`;
- коротке пояснення походження стану;
- evidence з `catalog`, `courseId`, `completedUnits` і `requiredUnits`.

Percentage або opaque mastery score не обчислюються. Evidence `1 із 2` означає лише кількість фактично завершених mapped units і не стверджує рівень знань.

Mappings одного skill усередині course утворюють evidence track. Усі units цього track потрібні для `completed`. Якщо skill повторно використовується у кількох курсах, course tracks є альтернативними: повністю завершений Robot Quest може підтвердити shared `systems-thinking` без вимоги завершити також High Load Architecture.

`mergeSkillUnitCompletions()` дедуплікує повтори за `catalog/course/unit` і є monotonic: `completed:true` не скасовується пізнішим `false`. Server adapter паралельно читає owner-scoped `lesson_progress` і `kids_level_progress`; помилка повертає `available:false`, а не фальшивий нульовий стан.

## Privacy and next step

Taxonomy і mappings — editorial content. Персональний progress читається лише на сервері для поточного owner і не передається в third-party analytics. `skill_map_viewed` зарезервований чинним analytics contract, але custom events залишаються paused. T‑707 використає ті самі readable states у доступній list-first Skill Map.

## Accessible Skill Map

T‑707 додає server-rendered `/skills`. Основне представлення — рекурсивний native `<ol>`: DOM order, відступ і CSS-конектори передають ту саму parent-child hierarchy. Окремого SVG/canvas дерева немає, тому повна інформація доступна без графіки та JavaScript.

Кожна картка містить назву, category, description, icon + readable state, пояснення та evidence. Compact summary повторно використовує T‑706 results і показує кількість skills у трьох станах без percentage.

Category filter зберігається в URL `?category=`. Відфільтрований branch залишає ancestor nodes як явно підписаний контекст, тому зв’язок не губиться. Filters — native links з `aria-current="page"` і працюють без client store.

Гість бачить повну taxonomy та явний zero state. Авторизований користувач отримує owner-only progress. Якщо Supabase недоступний, карта лишається читабельною, але statuses позначаються як unavailable, а не підміняються `not_started`.
