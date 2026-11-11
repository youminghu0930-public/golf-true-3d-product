# Golf True 3D

Parent project repository: `golf-true-3d-product`.

## Local preview

```sh
node scripts/serve.mjs
```

Open http://127.0.0.1:8009. No dependencies are required. An optional numeric argument overrides the port.

## Page structure

The page uses the styles, typography, responsive layout, and collapsible left navigation from `pose-information-extraction`. All page copy lives in `materials/content.json`. The working title is Golf True 3D; the six sections are Abstract, Introduction, Methods, Results, Discussion, and Conclusion. Methods contains three linked child-project cards. The other section bodies, parent snapshots, Results videos, and hero animation remain deferred.

## Materials

`materials/content.json` contains the page metadata and section text. The existing copied assets remain in `materials/data/`: `3d_results/`, `metrics/`, `videos/`, and supporting JSON files. They are preserved for future work and are not loaded or published by this scaffold. No media preparation or encoding runs at startup.

## Child project cards

`sections[].projects` in `materials/content.json` controls the titles, summaries, destination URLs, and child banner settings. Cards match the RGB-video overview: horizontal desktop rows, full-width square previews over text on mobile, an entire-card link, and “View project →”. Previews are passive, muted, automatic, and pause offscreen or in a background tab. Reduced-motion preference suppresses autoplay. They reproduce the child banners, including synchronization and metric overlays, with uniform softening and no gradients or controls. The square clips a centered, enlarged composition so the footage fills every edge; `banner.previewScale` optionally overrides the default 1.65× crop. The video, skeleton, trails, and metric overlays scale together.

`materials/projects/{repo}/` contains committed, independent copies of each selected banner's modules, 3D data, timestamps, synchronization mapping, metrics where applicable, and face-on video. Serving and building require no sibling repo, network fetch, encoder, or media-generation step.

To refresh copies after changing a child's banner, first prepare the child media in its own repo, then run:

```sh
node scripts/refresh-project-previews.mjs
```

The refresh command reads sibling checkouts and the parent’s banner settings; review and commit its output. Ordinary serving/building does not run this command.

Each child returns to `https://youminghu0930-public.github.io/golf-true-3d-product/#projects`. Opening a card saves this parent's scroll position in a namespaced session-storage key. Returning in the same tab restores it; without a saved position, `#projects` lands on the cards. The Methods navigation retains `#method`.

## Build and GitHub Pages

```sh
node scripts/build-site.mjs
node scripts/serve.mjs --dist
```

The build copies the page and content into ignored `dist/`. `.github/workflows/pages.yml` builds and deploys that directory on pushes to `main` or `master`, or manual dispatch. In the GitHub repository settings, select **GitHub Actions** as the Pages source. The workflow requires no video encoder or npm installation.

The repository retains its existing Git metadata and remote. No commit or push is performed by local setup.
