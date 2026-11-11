# Golf True 3D

Parent project repository: `golf-true-3d-product`.

## Local preview

```sh
node scripts/serve.mjs
```

Open http://127.0.0.1:8009. No dependencies are required. An optional numeric argument overrides the port.

## Page structure

The page uses the styles, typography, responsive layout, and collapsible left navigation from `pose-information-extraction`. All page copy lives in `materials/content.json`. The working title is Golf True 3D; the six sections are Abstract, Introduction, Method, Results, Discussion, and Conclusion. Their bodies are intentionally empty. Snapshots, videos, and the hero animation are deferred.

## Materials

`materials/content.json` contains the page metadata and section text. The existing copied assets remain in `materials/data/`: `3d_results/`, `metrics/`, `videos/`, and supporting JSON files. They are preserved for future work and are not loaded or published by this scaffold. No media preparation or encoding runs at startup.

## Build and GitHub Pages

```sh
node scripts/build-site.mjs
node scripts/serve.mjs --dist
```

The build copies the page and content into ignored `dist/`. `.github/workflows/pages.yml` builds and deploys that directory on pushes to `main` or `master`, or manual dispatch. In the GitHub repository settings, select **GitHub Actions** as the Pages source. The workflow requires no video encoder or npm installation.

The repository retains its existing Git metadata and remote. No commit or push is performed by local setup.
