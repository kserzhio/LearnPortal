# Kids Coding: reusable Level / Challenge screen

T-505 додає один data-driven екран для Block Mode і Code Mode. Новий рівень не потребує окремої сторінки: route знаходить versioned course configuration за stable IDs і передає до клієнта лише метадані поточного світу та один `LevelDefinition`.

## URL contract

```text
/kids-coding/{courseId}/{worldId}/{levelId}
```

Route має `generateStaticParams`, dynamic metadata та повертає стандартний `notFound()` для невідомої комбінації IDs.

## Компоненти

- `GameBoard` і `Character` показують поточний deterministic engine state та текстовий опис позиції;
- `CommandPalette` додає команди без drag-and-drop, тому весь Block Mode доступний клавіатурою;
- `BlockEditor` редагує параметри, repeat count, видаляє блоки й показує необов’язковий JavaScript equivalent;
- `CodeEditor` є легкою замінною межею навколо native textarea;
- `RunControls` підтримує Run, Pause, Resume, Stop і Reset;
- `HintPanel` відкриває три підказки послідовно;
- `LevelResultPanel`, `Stars` і `ProgressBar` використовують shared T-511 contracts.

Game rendering оновлюється після кожної engine event. Public status перекладає internal event codes на зрозумілий текст. Core state не залежить від анімації.

## Рішення щодо code editor

На цьому етапі використано native `<textarea>` замість Monaco або CodeMirror:

- немає додаткового runtime dependency чи editor worker;
- швидше завантаження на tablet;
- native keyboard, zoom і screen-reader behavior;
- sandbox API не залежить від конкретного редактора.

Після вимірювання реальних сценаріїв можна підключити CodeMirror як lazy-loaded adapter. Monaco для коротких навчальних програм наразі має невиправданий bundle cost.

## Accessibility і responsive behavior

- усі дії мають native buttons/links/labels;
- board має text alternative та live position status;
- results і execution status оголошуються без примусового переносу focus;
- stars містять текст `виконано` / `ще не виконано`;
- focus indicator має контрастний lime outline;
- control targets мають щонайменше `2.75rem`;
- CSS використовує лише `rem`, `%`, `fr`, `clamp()` та content breakpoints;
- на `20rem` viewport page-level horizontal overflow відсутній;
- підтримані reduced motion та forced colors.

Browser QA перевіряє empty failure, hint reveal, successful Block Mode, successful/forbidden Code Mode, desktop і `20rem` reflow, console errors та error overlay. Наступні задачі T-506/T-507 підключать цей route до dashboard і World Map.
