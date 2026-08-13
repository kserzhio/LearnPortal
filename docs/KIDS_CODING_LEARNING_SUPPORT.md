# Kids Coding: learning support contract

Цей шар перетворює результат engine/sandbox на передбачувану навчальну взаємодію. Він не залежить від React, браузера або бази даних, тому однаково працює у Level screen, dashboard, API та тестах.

## Поетапні підказки

`support/hints.ts` відкриває лише наступний доступний етап:

1. `concept` — нагадує ідею без готового алгоритму;
2. `stronger-clue` — звужує пошук;
3. `partial-solution` — показує частину підходу, але не повну відповідь.

Стан має versioned JSON-контракт `systema.kids-hint-state`. Parser відхиляє чужий challenge, невідому версію і пропущені етапи на кшталт `[1, 3]`. Автор контенту відповідає за те, щоб третя підказка залишалася частковим розв’язком.

## Friendly feedback

`support/feedback.ts` використовує stable internal `code` як ключ до перевірених україномовних повідомлень. Довільний `message` від engine, parser або sandbox ніколи не відображається користувачу. Невідомий code отримує нейтральне повідомлення та конкретний наступний крок.

UI має оголошувати feedback через live region відповідно до поля `announce`, але не покладатися лише на колір. Для діагностики можна логувати internal details тільки у захищений server-side observability channel без показу дитині.

## Зірки

Три критерії challenge мають стабільну семантику:

1. виконання основної мети;
2. ефективність або безпечне виконання;
3. використання задуманої навчальної концепції.

`getStarSummary` повертає label і явний `earned` для кожної зірки, щоб UI міг показати текстовий стан, а не лише колір чи іконку. Фактичне число зірок і надалі обчислює deterministic game engine.

## Нагороди

`calculateRewardGrants` є pure deterministic function. Вона видає versioned grant лише після валідного завершення та підтримує:

- stars;
- badges;
- characters і robot skins;
- pets та accessories;
- world unlocks.

Grant ID складається зі stable challenge/reward IDs, а `alreadyClaimedGrantIds` робить повторну видачу ідемпотентною. `rewardGrantToUnlock` перетворює косметичні нагороди на чинний progress unlock contract.

Контракт навмисно не містить price, currency, rarity, randomness, purchasable chances або loot boxes. Усі нагороди визначені контентом рівня й мають однаковий результат за однакового `LevelResult`.

## Перевірка

```bash
npm run check:kids-support
```

Тест перевіряє послідовне відкриття hints, JSON round-trip, відсутність technical error leakage, семантику трьох зірок, детермінованість та ідемпотентність reward grants і сумісність з усіма опублікованими Kids Coding challenges.
