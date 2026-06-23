# HyperFrames Composition Project

## Commands

Use the project scripts as the command surface:

```bash
npm run check
npm run render -- --output renders/tenbase-promo.mp4
```

## Notes

- `index.html` is a standalone HyperFrames composition.
- The timeline must stay paused and registered on `window.__timelines`.
- Keep source assets under `assets/` and final renders under `renders/`.
- Re-run `npm run check` after editing the composition.
