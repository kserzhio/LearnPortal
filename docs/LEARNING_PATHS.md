# Learning Paths

Learning Path — versioned, data-driven послідовність курсів, що веде до конкретного результату. Модель не дублює назву, URL, статус чи тривалість окремого курсу: step містить тільки `{ catalog, courseId }`, а course metadata читається з чинного adult або Kids catalog.

## Контракт

- `schema: systema.learning-path` і `schemaVersion: 1` створюють migration boundary.
- `contentVersion` змінюється при змістовній редакції path.
- `audience` має значення `adult`, `kids` або `mixed`.
- `status` має значення `draft`, `published` або `archived`.
- `duration` — редакційна оцінка всього path у годинах і рекомендованих тижнях.
- `steps` зберігаються в DOM/learning order, мають безперервні `position` від `1` і stable ID.
- `required` впливає на майбутнє обчислення completion; `optional` ніколи не повинен блокувати завершення path.
- Один course може входити до кількох paths, але не повторюється всередині одного path.

## Validation boundary

Parser відхиляє невідому schema version, невідомі поля, невалідні IDs, порушений порядок, duplicate step/course references, невідповідність audience та course catalog, а також course ID, відсутній у чинному catalog.

Validation повертає structured issues `{ code, path, message }`. `defineLearningPath()` використовується для trusted authoring fixtures і кидає `LearningPathConfigurationError`; `parseLearningPath()` та `parseLearningPathJson()` безпечно працюють із зовнішніми даними.

## Поточні fixtures

- Published adult: `high-load-system-designer`.
- Draft adult: `architecture-platform-track`, де Frontend Architecture є optional step.
- Published kids: `kids-coding-foundations`.

High Load Architecture входить до двох adult paths, що перевіряє many-to-many membership без дублювання course metadata.

## Наступні інтеграції

T‑705 додасть reusable skill taxonomy та mapping до courses/lessons без fake mastery scores. Custom analytics events залишаються неактивними, доки T‑601 поставлена на паузу.

## Listing `/paths`

Сторінка рендериться на сервері та підтримує URL-фільтр `?audience=adult|kids`. Фільтр `mixed` поки не показується окремо: mixed path потраплятиме в обидві релевантні категорії. Draft і archived paths не віддаються в listing HTML.

Для авторизованого користувача сервер паралельно читає owner-only `lesson_progress` та `kids_level_progress`. Для гостя використовується явний zero state без localStorage і без симуляції авторизації.

Path progress рахується лише за units у `required` courses:

```text
progress = completed required lessons/levels ÷ all required lessons/levels
```

Optional course не зменшує progress і не блокує completion. Після завершення required courses він може стати наступною рекомендацією. Якщо Supabase read завершується помилкою, UI показує unavailable state, а не фальшивий `0%`.

## Detail `/paths/[slug]`

Detail route віддає лише `published` path; draft, archived і невідомі slugs завершуються `404`. Сторінка повторно використовує той самий server progress adapter, тому listing і roadmap не мають окремих джерел істини.

Pure `buildLearningPathStepViews()` призначає стани `completed`, `current` і `upcoming`. Перший незавершений required course стає current незалежно від незавершених optional courses перед ним. Коли всі required courses завершені, перший незавершений optional course може бути запропонований як необов’язкове продовження.

Roadmap є нативним ordered list. Поточний крок має `aria-current="step"`, а кожен стан передається текстом та іконкою, не лише кольором. Primary CTA веде до course, визначеного тим самим pure state model.

## Completion recommendation

`buildCourseCompletionGuidance()` отримує completed current course, published paths, фактичний course progress і policy перевірки published target. Він не використовує ML, popularity score або історію інших користувачів.

Recommendation існує лише коли current course справді завершений, path published, наступний required course незавершений і також published. Для завершеного path повертається membership-підтвердження без нового course CTA. Orphan courses, draft paths та unavailable progress не створюють рекомендацій.

Якщо один course належить кільком published paths, результат зберігає всі валідні варіанти й пояснює кожен через назви current і next steps. Completion UI веде на detail path, де server progress повторно визначає правильний крок.
