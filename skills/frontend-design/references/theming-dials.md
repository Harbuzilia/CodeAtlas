# Theming, Dark Mode, Dial-определения

Дочитывать при: dark/light-режимах, калибровке дисков VARIANCE/MOTION/DENSITY, сомнениях в значениях.

## Тема страницы — одна (Theme Lock)
- Страница имеет ОДНУ тему. Секции не инвертируются: нет светлой «тёплой бумажной» секции между тёмными (и наоборот). Пользователь не должен чувствовать, что попал на другой сайт при скролле.
- Исключение: бриф явно просит «Color Block Story»/«Theme Switch on Scroll» как осознанный приём (один полный переход с сильной транзицией, не случайное чередование) — допустимо 1 раз на страницу.
- Тонирования внутри одной темы ок (`bg-zinc-950` рядом с `bg-zinc-900`); переключение на `bg-amber-50` посреди `bg-zinc-950`-страницы — сломано.
- Дизайн-система с темизацией (Radix Themes, shadcn/ui `<Theme>`): тема ставится ОДИН раз в `layout.tsx`/корне. Секции не переопределяют.

## Dark Mode протокол
- Dual-mode по умолчанию для consumer-facing. Light-only/dark-only — только по явной инструкции (print-эмулирующий editorial — валидное исключение).
- **Стратегия токенов — одна на проект:**
  - Tailwind `dark:` вариант: каждая цветовая утилита в паре (`bg-white dark:bg-zinc-950`).
  - CSS-переменные (shadcn/ui, Radix): семантические токены (`--surface`, `--surface-elevated`, `--text-primary`, `--accent`), значения меняются под `[data-theme="dark"]` или `@media (prefers-color-scheme: dark)`.
- Контраст: WCAG AA минимум для body, AAA-цель для hero-копии — в обоих режимах.
- Hierarchy parity: иерархия, работающая в light, работает в dark. CTA выделяется в light → выделяется в dark.
- Brand fidelity: primary-цвет бренда остаётся узнаваемым, не десатурировать «в тёмный режим».
- Нет pure `#000000`/`#ffffff` — off-black / off-white.
- Default: `prefers-color-scheme`. Ручной тоггл, если один из режимов теряет выразительность бренда.
- **Тестировать в обоих режимах до сдачи.** Не шипить страницу, виденную только в одном.

## Dial-определения (технический справочник)

### DESIGN_VARIANCE (1–10)
- **1–3 (Predictable):** симметричный CSS Grid (12-col, равные fr), равные паддинги, центрирование.
- **4–7 (Offset):** `margin-top: -2rem` overlaps, разные aspect-ratio рядом (4:3 + 16:9), left-aligned заголовки над center-aligned данными.
- **8–10 (Asymmetric):** masonry, дробные grid-единицы (`grid-template-columns: 2fr 1fr 1fr`), массивные пустые зоны (`padding-left: 20vw`).
- **Mobile override:** для 4–10 асимметрия выше `md:` сворачивается в строгую одну колонку (`w-full px-4 py-8`) на `<768px`.

### MOTION_INTENSITY (1–10)
- **1–3 (Static):** без авто-анимаций. Только CSS `:hover`/`:active`.
- **4–7 (Fluid CSS):** `transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`, `animation-delay` каскады для load-in. Только transform/opacity.
- **8–10 (Advanced):** scroll-triggered reveals, parallax, scroll-driven (CSS `animation-timeline` или GSAP ScrollTrigger), Motion hooks. `window.addEventListener('scroll')` — hard ban (см. animation-patterns.md).

### VISUAL_DENSITY (1–10)
- **1–3 (Art Gallery):** много воздуха, огромные section gaps (`py-32`–`py-48`). Дорого, чисто.
- **4–7 (Daily App):** стандартные отступы (`py-16`–`py-24`).
- **8–10 (Cockpit):** плотные паддинги, без card-boxes, данные разделены 1px линиями. Обязателен `font-mono` для всех чисел.
