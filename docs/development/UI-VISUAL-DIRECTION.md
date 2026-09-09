# Atlas Command — visual direction for the consolidated release

Owner: Jaison Norton. Reference review: 2026-09-09.
Status: design brief for the forthcoming UI pass, NOT an implemented redesign, a finished Windows package, or a release approval.

## Owner references and intended interpretation

The owner supplied two dashboard screenshots and https://world-monitor.com/ as look-and-feel references only. Do not import their unrelated AI-management, freight, trading, news, or surveillance features merely because they appear in the references. Do not copy another product's name, logo, imagery, code or exact layout.

- Screenshot 2026-09-09 105248.png: deep navy surfaces, gently rounded cards, thin warm borders, large concise metrics, small trend graphics, teal/coral accents, organized tables and icon-led headings.
- Screenshot 2026-09-09 105323.png: dense but aligned modular panels, high-contrast gauges, restrained green/red status use, compact legends, useful charts and small range/filter controls.
- World Monitor: reference for map/globe-led situational awareness and visible feed state. Its page exposed Map, Wire and Globe controls and a LIVE/connecting status during review. The text preview is not a full inspection of every animated state.

Atlas should feel like a polished exploration instrument panel: a luminous central globe surrounded by useful, readable instruments. Preserve the previously requested NASA/documentary/adventure atmosphere without implying endorsement or copying those brands.

## Layout hierarchy

1. A narrow command bar: original Atlas mark and name, workspace mode, selected date/era, search, connection controls and settings. Do not crowd it with every module button.
2. The globe remains the dominant object. Weather is subtle globally and stronger around the selected region. A compact weather glance belongs close to the selected site's information.
3. Dockable/resizable modules surround rather than cover the globe: catalogue/layers to the left; selected-site evidence and weather to the right; optional research and expedition instruments lower down; historical timeline along the bottom.
4. A collapsible summary row can expose actual library count, current filter count, LiDAR records and source/cache state. Do not invent AI usage/spend, discovery probabilities, activity totals or feed-health statistics.
5. Camera viewing is a separate optional module. Public-camera imagery and the owner's private field camera must be clearly separated. A camera is not assumed to be located at the currently selected ancient site.
6. On ultrawide screens use the horizontal space for optional instruments. On laptops collapse secondary modules and prefer readable text over shrinking everything. Restore saved layouts without losing selected sites, notes or filters.

## Palette and typography

Proposed starting palette, to be visually tested rather than treated as a final audited accessibility result:

| Role | Starting value |
|---|---|
| Main canvas | #0B1016 |
| Card/panel surface | #141B24 |
| Raised surface | #1B2631 |
| Neutral borders | #34434D |
| Primary text | #ECF2F5 |
| Secondary text | #A9BCC7 |
| Interactive/technical accent | #8BD4E5 |
| Selected/healthy accent | #52D6B3 |
| Warm exploration accent | #BFA16B |
| Attention / stale data | #E9C572 |

Keep Atlas's established five-level mystery colors: 1 #52D6B3; 2 #6CAEFF; 3 #E9C572; 4 #F39765; 5 #F17699. Mystery level is not a danger, access-permission or safety score. Status badges need text and shapes, not color alone.

Use one readable UI family, consistent weights, and tabular figures for changing numbers. Reserve monospaced text for coordinates, times and compact data labels. Use restrained uppercase/letter-spacing for small section headings, not paragraphs. Favor roughly 13–15 px data/body text at normal desktop scale; small source metadata is secondary, not the only place important warnings appear. Test Windows scaling, contrast and focus visibility before acceptance.

## Charts, gauges and motion

- Adapt the visual language, not the sample business metrics. Good Atlas instruments include actual forecast temperature/wind trends, model cloud-cover percentage, sourced water-level history, lunar illumination, supported solar observations, site counts by mystery level and manually entered expedition budget use.
- A gauge must name its quantity and unit. Separate evidence quality, mystery, access status, readiness and discovery potential. A readiness checklist is not a probability of finding treasure.
- Every live/model/cached chart includes provider, valid time and retrieval time where applicable. Missing or disconnected data is shown as unavailable, never replaced with attractive invented readings.
- Use a slow selection halo for the highlighted place and restrained activity indicators for a request actually underway or data just received. Do not label a merely enabled provider as currently healthy/live.
- Distinguish measured lightning from model thunderstorm conditions. A decorative effect must not be presented as an observed strike or a new discovery.
- Idle Observatory: quiet globe rotation, soft atmosphere and minimal labels. Interaction restores the prior workspace; no surprise loud audio, modal openings or automatic recording.
- All decorative motion can be paused. Respect both the OS reduced-motion preference and Atlas's saved animation setting. Avoid rapid flashes and constant animation in every tile.

## Icon and logo system

Use an original Atlas compass/globe identity and one coherent family of line icons for archaeology, LiDAR, magnetic research, sky, weather, minerals, fossils, expeditions and cameras. Pair unfamiliar icons with labels. Provider names/credits establish provenance; do not put NASA, NPS, USGS or other organizations' marks in the Atlas brand as an implied partnership.

## Camera visual states

Show LIVE VIDEO only for verified active continuous playback; SNAPSHOT for periodically fetched images; PAUSED, OFFLINE, STALE, CONNECTING and UNAVAILABLE when applicable. A fetched-at time is not automatically the image capture time. Public video source links are labelled as opening the provider, not as embedded playback. The optional field-camera plan remains hardware/transport-dependent and must not display fabricated battery, GPS, signal or recording status.

## Acceptance checklist for the UI implementation

- Same typography, corner treatment, spacing and controls across current and new modules.
- Dominant central globe preserved in normal and idle views.
- Readable laptop, desktop and ultrawide compositions; test 1366x768, 1920x1080 and 3440x1440 plus Windows display scaling.
- Saved layouts, keyboard focus, pointer/touch behavior and reduced motion remain usable.
- Weather/camera privacy choices, timestamps and stale/offline states remain visible.
- Five mystery colors remain consistent between markers, filters, legends and dossier.
- Charts and gauges use real or clearly identified manually entered data; no fake telemetry.
- No copied branding or additional tracking/services introduced for visual polish.
- Capture actual application screenshots after implementation and tests. Reference images and concept art are not Store screenshots.

## Scope of this change

This commit saves the owner's design direction only. No executable, application stylesheet, camera permission, microphone permission, Store submission, publisher setting, or billing permission is changed. GitHub write access is already functioning on the development branch; no broader account permission is requested.
