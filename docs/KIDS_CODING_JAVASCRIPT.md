# Code Adventure — JavaScript vertical slice

## Learning sequence

`Village` починається з видимого game effect, а не з `console.log`:

1. `hero.move()` — перший method call рухає героя на полі.
2. `hero.move(3)` — числовий argument керує кількістю кроків.
3. `hero.jump()` — новий method перестрибує перешкоду.
4. `const steps` + `hero.move(steps)` — variable зберігає значення.
5. bounded `for` loop — повторює видиму дію чотири рази.

Кожен level отримує `starterCode` із versioned course configuration. Starter повністю data-driven: UI не містить перевірок конкретних course або level IDs. Кнопка повернення стартового коду відновлює authored template, а dynamic route key гарантує clean editor state при переході між levels.

## Safe execution

User source не передається в `eval`, `Function`, Worker або main application context. Restricted parser компілює allow-listed JavaScript subset у versioned Program AST, після чого deterministic game engine виконує лише доступні команди challenge.

Sandbox забороняє DOM, cookies, storage, network, browser globals, dynamic property access, unbounded loops і unsupported syntax. Є bounds для source length, tokens, parser steps, nesting, loop iterations, engine operations і wall-clock time.

## Feedback and accessibility

- Textarea має persistent label та connected help.
- Compile error встановлює `aria-invalid` і `aria-errormessage`.
- Public feedback показує safe line/column, але не `SyntaxError`, stack trace або internal AST.
- Окремі тексти пояснюють missing integer, unknown variable, loop counter mismatch і unsupported syntax.
- Result та execution status оголошуються live regions без примусового переміщення focus.
- Starter-code reset, Run, Pause, Stop і field reset доступні клавіатурою.

## Progress flow

Після safe execution server повторно компілює та виконує submitted Program artifact перед записом. PostgreSQL зберігає attempt, best solution, stars і completed state; World Map відкриває наступний level. Guest preview використовує versioned local adapter.

## Automated contract

`npm run check:kids-javascript` перевіряє п’ять expected-success programs, п’ять meaningful learning errors, starter-code compilation, browser-global rejection, safe syntax location, 15 stars і persistent world completion.
