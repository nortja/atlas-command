# Atlas Command: next development build

## Two independent tracks

The owner authorized continuing functionality and UI work while Microsoft certification and employer IT review are pending.

- Certification baseline: existing package version 1.0.0.0, built from commit 480595180a5889b692604dda2fed09e4f89fc056. Keep its existing MSIX and publisher identity unchanged.
- This branch started at main commit 345552aa0761bc1bcbfeca68d8401a5fe2b32970. The main branch has not been changed by this development work.
- New work is isolated in develop/next-workspaces. No merge, Store upload, cancellation, publication, native installation, billing change or hosted workflow dispatch was performed by this development step.
- Employer IT controls the managed PC. Development does not authorize installation or bypassing SentinelOne. Keep the original launcher quarantined. The last owner screenshot showed manual publication hold; no live Partner Center access was used here.

## Implemented in developer-only source

The separate app/src/workspace-layout.js module provides Explore, Research and Expedition panel presets, layout fitting, separate desktop/ultrawide snapshot scopes, Save/Restore my layout controls, a reversible globe-focus control and explicit save-error feedback. It preserves a snapshot before the first preset and avoids editing site records. The dialog uses ordinary buttons with 44-pixel minimum heights; this is a design choice, not an accessibility certification.

app/workspace-preview.html is a separate preview entrypoint with an explicit development label. Existing app/index.html, native/AtlasHost.cs, the current build recipe and package manifest were left unchanged. The preview module is deliberately not in the native serving or MSIX payload allow-lists yet. Do not try to install the old package expecting these controls. Native integration requires a new version and the relevant tests.

The module currently uses the existing AtlasTest integration object for state, saving and resizing. Replace this with a deliberately versioned public workspace API during native integration. Do not turn the module system into arbitrary executable plugins.

## Tests actually executed

Node 22.16.0 on Linux:

    node --test tests/core.test.cjs tests/source-checks.test.cjs tests/store-identity.test.cjs tests/workspace-layout.test.cjs

Result: 68 tests passed, zero failed: 43 existing checks plus 25 new layout/source checks. The new checks cover preset bounds and non-overlap across five viewport sizes, expanded/collapsed panel allocation, malformed saved layouts, fitting without mutating caller input, and preview isolation. They are not browser-persistence tests or native Windows tests.

Browser smoke tests were attempted in this environment, but installed Chromium blocked navigation by administrator policy. Neither local HTTP nor file navigation reached the preview. No browser policy was changed. Therefore UI rendering, click flows and persistence through actual browser interaction remain unverified for this new module. No new screenshots, native Windows executable or installer were produced in this step.

Comparison with the downloaded source baseline confirmed no pre-existing local source file was changed. GitHub comparison confirmed only the three new source/test files before this report was added.

## Next work, in order

1. Finish workspace integration: replace the integration seam, visually test at laptop and ultrawide widths, inspect saved layouts and failure behavior, test mouse/touch and keyboard controls, and only then add the module to native asset lists. Add a versioned update and rollback test rather than changing the submitted package.
2. Local library quality: complete-media backup and recovery, import review, image/source provenance, missing-media warnings, and consistent site creation. Preserve original Google Earth files and distinguish imported data from starter records.
3. LiDAR-first research: an all-era/undated section with survey regions, source dates, dating confidence and survey/ground-verification status. No automatic claim that a site is unvisited or a lost civilization. Use documented data providers and licenses before adding remote downloads.
4. Magnetic and celestial research: model provider interfaces, valid date ranges, uncertainty, coordinate/axis conventions and explicit measured/modelled/illustrative labels. Keep mystery rating separate from any independently validated exploration-potential model.
5. Expedition, minerals and fossils: structured interests, budgets, travel-time filters, access/collecting rights and advisory freshness. Treat discovery potential, permitted activity and practical readiness separately. No hidden booking/payment integration or unapproved paid service.

## Release checks that still matter

Test Windows 11 packaged install/launch, offline behavior, storage and migration, updates/uninstall and appropriate security review. Review data protection and in-app privacy disclosure. A Store certification result does not replace employer authorization. Complete changed-feature checks before any later private update is submitted. The Store listing must describe the shipped feature set, not this development roadmap.
