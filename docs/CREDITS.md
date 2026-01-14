# Credits & Acknowledgements

This project wouldn't be possible without the contributions of many talented creators and open source projects.

## Sound Effects

### Celebration Sound (Ta-Da!)

**Source:** [plasterbrain on Freesound.org](https://freesound.org/people/plasterbrain/sounds/397355/)

**File:** `tada-f-versionD.mp3`

**License:** CC0 1.0 Universal (Public Domain)

**Transformation settings:**

```bash
ffmpeg -i input.mp3 -af "rubberband=pitch=1.1225,atempo=1.25,highpass=f=200,equalizer=f=3000:t=q:w=1:g=3,atrim=end=0.7,afade=t=in:st=0:d=0.03,afade=t=out:st=0.5:d=0.2" output.mp3
```

| Effect                         | Value           | Purpose                              |
| ------------------------------ | --------------- | ------------------------------------ |
| `rubberband=pitch=1.1225`      | ~2 semitones up | Gentle pitch increase (not chipmunk) |
| `atempo=1.25`                  | 25% faster      | Snappier feel                        |
| `highpass=f=200`               | Cut below 200Hz | Reduces boom                         |
| `equalizer=f=3000:t=q:w=1:g=3` | +3dB at 3kHz    | Adds sparkle                         |
| `atrim=end=0.7`                | 0.7 seconds     | Trim duration                        |
| `afade=t=in:st=0:d=0.03`       | 30ms fade in    | Softens attack                       |
| `afade=t=out:st=0.5:d=0.2`     | 200ms fade out  | Smooth ending                        |

**Alternative:** `tada-f-powerchord.mp3` - F-A power chord version for bigger celebrations 🎸

### Timer Bells

Various meditation bell sounds sourced from Freesound.org. See `/app/public/sounds/` for individual attributions.

---

## Open Source Dependencies

Tada is built on the shoulders of giants. Key technologies include:

- **[Nuxt 3](https://nuxt.com/)** - The Vue.js framework
- **[Vue 3](https://vuejs.org/)** - Progressive JavaScript framework
- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM
- **[SQLite](https://sqlite.org/)** - Database engine
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[Bun](https://bun.sh/)** - JavaScript runtime & toolkit

---

## Contributors

Thank you to everyone who has contributed to Tada!

_Contributors will be listed here as the project grows._

---

## Special Thanks

- The [Freesound.org](https://freesound.org/) community for high-quality, freely-licensed audio
- The open source community for the incredible tools that make projects like this possible

---

_Want to contribute? See our [Developer Guide](./DEVELOPER_GUIDE.md) to get started!_
