# Openleaf core demos

Three Remotion compositions: Papers (12 s), Python (11 s), and Slides (12 s).

The application shell and controls come from the Openleaf HTML and stylesheet snapshot in `app/`; `source-manifest.json` records its origin and hashes. The frame driver populates sample manuscript, Python output, and slide content and applies the application’s UI states. No screen recordings are used in these compositions. Cursor positions follow the real control bounds.

The snapshot is separate from the Openleaf application checkout. To refresh it, copy the current app HTML and CSS, check selector compatibility, and update the manifest. The `src/assets/python-output.png` chart plots `1 - exp(-epochs / 8)` for epochs 1 through 24.

## Render

```sh
npm ci
npm run check
npm run render
```

Outputs are the three `*-remotion.mp4` clips and matching posters in `openleaf/demo/`. Inspect still frames before publishing any refreshed render.
