# Email authentication production gate

Email/password UI використовує Supabase Auth і не зберігає паролі у базі порталу або `localStorage`.

Перед увімкненням email registration у production перевір:

1. `Authentication → Providers → Email`: email provider та **Confirm email** увімкнені.
2. `Authentication → URL Configuration`: додані `http://localhost:3000/auth/callback` і `https://learn-portal-gamma.vercel.app/auth/callback`.
3. `Authentication → Rate Limits`: signup confirmation і password recovery мають cooldown не менше 60 секунд.
4. Підключений custom SMTP. Built-in mailer Supabase призначений лише для тестування і має спільний ліміт 2 листи на годину.
5. Перед публічним запуском увімкнений CAPTCHA protection для signup, sign-in і recovery.
6. У email templates вимкнений сторонній link tracking; confirmation та recovery links ведуть лише на allow-listed callback.

Application responses для signup і recovery не підтверджують, чи існує конкретна email-адреса.

## Перевірено 2026-08-10

- Email provider, new user signups і Confirm email увімкнені.
- Localhost та production callback присутні в redirect allow-list.
- Minimum password length: 12.
- Secure password change: enabled.
- Supabase Auth rate limits: enabled; built-in email quota залишається 2 листи на годину.
- Ще не налаштовано: custom SMTP і CAPTCHA provider.
