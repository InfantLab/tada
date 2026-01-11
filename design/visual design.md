# 🎨 TA-DA App — Visual Design & Colour System

**Version:** 1.0
**Status:** Approved baseline
**Applies to:** Mobile + Web
**Default theme:** Dark

---

## 1. Design Intent (read this first)

TA-DA is **not** a productivity app in disguise.

The visual language must communicate:

- ✨ **Completion as celebration**
- 🧘 **Reflection, not pressure**
- 🧭 **Meaningful orientation** (what happened, not what’s next)

The palette balances **energetic moments** (TA-DA) with **cosmic calm** (lotus / compass).
Gold is a _reward_, not a base colour.

---

## 2. Theme Strategy

- **Dark theme is default** (matches brand cosmology)
- **Light theme is complementary**, not an inversion
- Avoid pure black or pure white
- Avoid “success green” clichés

---

## 3. Colour Roles (semantic, not decorative)

> Devs should reference _roles_, not hex values directly.

| Role                 | Meaning                 |
| -------------------- | ----------------------- |
| `background.base`    | App background          |
| `background.surface` | Cards, panels           |
| `background.chrome`  | Nav bars, footers       |
| `text.primary`       | Main content            |
| `text.secondary`     | Supporting text         |
| `text.muted`         | Metadata                |
| `accent.primary`     | TA-DA moments, success  |
| `accent.secondary`   | Progress, emphasis      |
| `accent.spark`       | Micro-interactions      |
| `brand.lotus.*`      | Decorative / brand only |

---

## 4. Dark Theme Palette 🌙 (default)

### Backgrounds

- **Cosmic Violet** `#2B0F3A` — main background
- **Indigo Shadow** `#3A1A55` — cards / surfaces
- **Void Plum** `#1E0B2A` — nav, footer

### Text

- **Primary** `#F7F4FA`
- **Secondary** `#CBBFDA`
- **Muted** `#9A8BB3`

### Accents (use sparingly)

- **Solar Gold** `#FFC83D` — TA-DA / completion
- **Amber Burst** `#FF9F1C` — progress, emphasis
- **Electric Spark** `#FFF1A8` — glints, stars, micro UI

### Brand / Lotus (gradients preferred)

- **Lotus Teal** `#3FB7A5`
- **Lotus Jade** `#6EDC9A`
- **Lotus Sky** `#6BB7E8`
- **Lotus Lilac** `#B88CF2`

---

## 5. Light Theme Palette ☀️

Designed for daylight, accessibility, and calm — **never stark white**.

### Backgrounds

- **Warm Pearl** `#FBF6EE` — base
- **Lotus Mist** `#EFE6F7` — cards
- **Sunwash Cream** `#FFF3D6` — sections

### Text

- **Primary** `#2B1A3A`
- **Secondary** `#5C4A6F`
- **Muted** `#8B7C99`

### Accents

- **Golden Ink** `#E6A800` — TA-DA
- **Amber Line** `#FFB703`
- **Spark Highlight** `#FFD966`

### Brand / Lotus

- **Soft Teal** `#7ED8C8`
- **Mint Leaf** `#9BE3B8`
- **Sky Wash** `#9ED3F5`
- **Lilac Bloom** `#D6B9F5`

---

## 6. Usage Rules (important)

### DO

- Use **gold only for moments of completion**
- Use lotus colours as **gradients or illustrations**
- Let dark space breathe — restraint is part of the aesthetic

### DON’T

- ❌ Use gold as a background
- ❌ Use pure black `#000000`
- ❌ Use bright green for success
- ❌ Flatten lotus colours into solid UI blocks

---

## 7. Accessibility

- All text colours meet **WCAG AA** on their intended backgrounds
- Gold-on-dark should **never** be body text
- Light theme contrast must be checked for outdoor use

---

## 8. JSON Design Tokens (drop-in)

```json
{
  "theme": {
    "dark": {
      "background": {
        "base": "#2B0F3A",
        "surface": "#3A1A55",
        "chrome": "#1E0B2A"
      },
      "text": {
        "primary": "#F7F4FA",
        "secondary": "#CBBFDA",
        "muted": "#9A8BB3"
      },
      "accent": {
        "primary": "#FFC83D",
        "secondary": "#FF9F1C",
        "spark": "#FFF1A8"
      },
      "brand": {
        "lotus": {
          "teal": "#3FB7A5",
          "jade": "#6EDC9A",
          "sky": "#6BB7E8",
          "lilac": "#B88CF2"
        }
      }
    },
    "light": {
      "background": {
        "base": "#FBF6EE",
        "surface": "#EFE6F7",
        "chrome": "#FFF3D6"
      },
      "text": {
        "primary": "#2B1A3A",
        "secondary": "#5C4A6F",
        "muted": "#8B7C99"
      },
      "accent": {
        "primary": "#E6A800",
        "secondary": "#FFB703",
        "spark": "#FFD966"
      },
      "brand": {
        "lotus": {
          "teal": "#7ED8C8",
          "jade": "#9BE3B8",
          "sky": "#9ED3F5",
          "lilac": "#D6B9F5"
        }
      }
    }
  }
}
```

---

## 9. Final note to devs ❤️

If something feels **too loud**, it probably is.
If something feels **too dull**, it probably needs a spark — not more colour.

TA-DA should feel like a _moment_, not a metric.

---

If you want, next I can:

- convert this into **Figma variables**
- generate **Tailwind / CSS variables**
- or align this with **Material / iOS semantic tokens**

This is a _proper_ design system now.
