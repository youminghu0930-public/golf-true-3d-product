# Golf True 3D

Parent project repository: `golf-true-3d-product`.

## Local preview

```sh
node scripts/serve.mjs
```

Open http://127.0.0.1:8009. No dependencies are required. An optional numeric argument overrides the port.

## Page structure

The page uses the styles, typography, responsive layout, and collapsible left navigation from `pose-information-extraction`. All page copy lives in `materials/content.json`. The working title is Golf True 3D; the six sections are Abstract, Introduction, Methods, Results, Discussion, and Conclusion. Methods contains three linked child-project cards. Abstract contains an untitled autoplay snapshot viewer. The other section bodies, Results videos, and hero animation remain deferred.

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

## Abstract snapshot

`materials/data/snapshot.json` selects carousel swings and their frame ranges. The initial entry is swing `00`. The header contains Face-on, Down-the-line and Free-view POV options and a gesture info panel; no snapshot title or playback controls are displayed.

`snapshot-scene.js` uses the pose-information-extraction joint graph and open-cylinder/ball surfaces, with the current club visible. The camera-plane overlays retain the original reconstruction project's 2D topology and detections. The `joints` list selects motion trails, including `golf_club_head`; `[]` disables trails. Historical club shafts remain disabled independently of this selection.

`snapshot-viewer.js` advances the paired video decoders through the exact raw-frame indices in `sync.json`, updates the reconstructed pose independently of video loading and seeking. Each camera joins at the current timeline position when its decoder and timestamps are ready. Autoplay loops the selected range and pauses offscreen, when its carousel slide is inactive, or in a background tab.

Free view fits the golfer and both camera components, moves the observer six times farther away, and compensates with optical zoom. Calibrated POVs retain their independent zoom, pan and rotation rules from the source viewer; switching back restores free-view state. Clicking a selected POV recenters it while retaining zoom. Wheel/pinch zoom scales the existing pan offset about the window center.

The build includes committed paired previews, frame timestamps, original 2D detections, reconstruction and sync data. It does not require an encoder or sibling repo. The root snapshot scene is independently maintained; refreshing project-card previews does not overwrite it.

Free-view ↔ calibrated-camera flights interpolate visible scene span and orbit around the golfer, preserving the exact endpoints. Camera-to-camera flights retain the source behavior. Run `node --test tests/*.test.mjs` for endpoint, framing, and orbit regression checks.

Snapshot camera textures upload only after their decoder settles on a requested frame; their 2D overlays use that same committed frame. Slow video never delays the 3D animation. Free-view near clipping scales with observer distance to preserve depth precision. Body geometry casts ground shadows but does not receive its own shadow map; the shadow map uses 2048² resolution. These settings avoid intermediate mismatched frames, surface self-shadow artifacts, and distant-view depth flicker.
