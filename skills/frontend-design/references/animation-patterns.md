# Animation Patterns — канонические скелеты и запреты

Дочитывать при: любой scroll-анимации, pinning, parallax, stagger-reveal, выборе библиотеки анимаций.

## Выбор библиотеки
- **Motion (`motion/react`)** — дефолт для UI, bento, state-change. `framer-motion` = legacy-алиас, в новом коде `motion/react`.
- **GSAP + ScrollTrigger** — полностраничный scrolltelling, scroll hijacks. Только в изолированных leaf-компонентах с `useEffect` cleanup (`ctx.revert()`).
- **Three.js / WebGL** — canvas-фоны и 3D. Та же изоляция.
- **НИКОГДА не мешать GSAP/Three.js с Motion в одном дереве компонентов** — дерутся за одни кадры.

## Sticky-Stack (карточки пинаются и складываются)

```tsx
"use client";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

export function StickyStack({ cards }: { cards: React.ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !ref.current) return;
    const ctx = gsap.context(() => {
      const cardEls = gsap.utils.toArray<HTMLElement>(".stack-card");
      cardEls.forEach((card, i) => {
        if (i === cardEls.length - 1) return;
        ScrollTrigger.create({
          trigger: card,
          start: "top top",
          endTrigger: cardEls[cardEls.length - 1],
          end: "top top",
          pin: true,
          pinSpacing: false,
        });
        gsap.to(card, {
          scale: 0.92,
          opacity: 0.55,
          ease: "none",
          scrollTrigger: {
            trigger: cardEls[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <div ref={ref} className="relative">
      {cards.map((card, i) => (
        <div key={i} className="stack-card sticky top-0 min-h-[100dvh] flex items-center justify-center">
          {card}
        </div>
      ))}
    </div>
  );
}
```

Ключевое: `start: "top top"`, `pin: true`, пинятся все кроме последней, scale/opacity двигает триггер СЛЕДУЮЩЕЙ карточки.

## Horizontal-Pan (вертикальный скролл → горизонтальный ход)

```tsx
"use client";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

export function HorizontalPan({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !wrap.current || !track.current) return;
    const ctx = gsap.context(() => {
      const distance = track.current!.scrollWidth - window.innerWidth;
      gsap.to(track.current, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: wrap.current,
          start: "top top",
          end: () => `+=${distance}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, wrap);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <section ref={wrap} className="relative overflow-hidden">
      <div ref={track} className="flex h-[100dvh] items-center">
        {children}
      </div>
    </section>
  );
}
```

Ключевое: wrapper пинится, track едет по горизонтали; `end = "+=" + (scrollWidth − viewport)`.

## Scroll-Reveal Stagger (лёгкая альтернатива без GSAP)

Для простого «элементы появляются при входе во viewport» — Motion `whileInView`, без ScrollTrigger:

```tsx
"use client";
import { motion, useReducedMotion } from "motion/react";

export function RevealStagger({ items }: { items: string[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="grid gap-6">
      {items.map((item, i) => (
        <motion.li
          key={item}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          {item}
        </motion.li>
      ))}
    </ul>
  );
}
```

Для: списков фич, testimonial-гридов, лого-стен. GSAP беречь для настоящего pin/scrub.

## Запрещённые паттерны (hard ban)
- `window.addEventListener("scroll", ...)` — бан. Каждый scroll-кадр, jank, без батчинга. Вместо: `useScroll()` (Motion), `ScrollTrigger` (GSAP), IntersectionObserver, CSS `animation-timeline: view()`.
- Свои scroll-progress расчёты через `window.scrollY` в React state — ре-рендер каждый кадр.
- `requestAnimationFrame`-циклы, трогающие React state. Вместо: `useMotionValue` + `useTransform`.
- `layout`/`layoutId` (Motion) — только для реальных state-изменений (reorder списков, expanding modals, shared elements между роутами). Не оборачивать статику «для надёжности» — это лишние измерения.
- Stagger: `staggerChildren` (Motion) или CSS-каскад `animation-delay: calc(var(--index) * 100ms)`. Для `staggerChildren` родитель (variants) и дети ОБЯЗАНЫ быть в одном Client Component дереве.

## Performance-guardrails
- Анимируются ТОЛЬКО `transform` и `opacity`. Никогда `top/left/width/height`.
- `will-change: transform` — точечно, только на реально анимируемых.
- Grain/noise-фильтры — ИСКЛЮЧИТЕЛЬНО на `fixed inset-0 pointer-events-none` псевдоэлементах. НИКОГДА на скроллящихся контейнерах (GPU-репейнты убивают FPS на мобильных).
- Bundle: Motion не маленький, Three.js большой. Всё ниже fold — lazy-load.
- Z-index: не спамить `z-50`/`z-10`. Только системные слои (sticky nav, modal, overlay, grain). Шкала задокументирована в константах проекта.

## Reduced motion (обязательно)
- Всё с MOTION_INTENSITY > 3 чтит `prefers-reduced-motion` — non-negotiable.
- Motion: `useReducedMotion()` → degrade в static. CSS: гейт за `@media (prefers-reduced-motion: no-preference)`.
- Бесконечные циклы, parallax, scroll-hijack, magnetic-физика — collapse в static/instant под reduced motion.

## Core Web Vitals (проверка перед сдачей)
- LCP < 2.5s: hero-изображение `next/image priority` или preload.
- INP < 200ms: тяжёлое — с main thread.
- CLS < 0.1: резервировать место под изображения, шрифты, embeds.
- Lighthouse-прогон до объявления «готово».
