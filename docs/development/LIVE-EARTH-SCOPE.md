# Live Earth development scope and release separation

Owner: Jaison Norton. Date: 2026-09-09. Branch: develop/next-workspaces. Development version: 1.1.0.0, not submitted or approved.

## Certification observation
The owner supplied Screenshot 2026-09-09 083804.png. Partner Center displays Ready to publish, a passed Certification stage, and manual Publish now. This is owner-supplied screenshot evidence for the earlier 1.0.0.0 submission, not a live Partner Center API read. No publication is performed by this build. Store certification does not establish employer authorization or independently resolve the earlier SentinelOne detection. Existing Windows 11 packaged-install and update checks still need evidence before release.

## Implemented source in this change
- Opt-in Open-Meteo weather connection, selected-area quick glance, saved Fahrenheit/mph preference and metric toggle.
- Current model estimate, feels-like, wind and gust, cloud cover, interval precipitation, six-hour forecast, provider-calculated sunrise/sunset, and approximate mean-cycle Moon illumination.
- Fixed 288-point 15-degree global model grid with subtle cloud/precipitation rendering. Selected-area emphasis is a visual highlight, NOT a measured storm footprint. This is not satellite imagery or radar.
- Present-day approximate solar day/night shading calculated locally. Neither sky geometry nor actual weather is reconstructed at ancient timeline positions. Present-day globe overlays hide when viewing a historical year.
- Idle globe-focus and reversible rotation, opt-out, bounded local cache, refresh throttling, cached/stale/unavailable states. New-workspace network default is OFF until the user explicitly enables weather after disclosure.
- No measured lightning, official warnings, solar-activity feed, moonrise/moonset, thunder audio, external script loading, or paid API integration.

## Provider and privacy
Primary documentation checked 2026-09-09:
https://open-meteo.com/en/docs
https://open-meteo.com/en/terms
https://open-meteo.com/en/pricing
https://gml.noaa.gov/grad/solcalc/calcdetails.html

The free Open-Meteo endpoint is limited to personal/non-commercial use with attribution. Review provider licensing before any commercial/shared distribution; a free app price alone does not prove non-commercial API use. No payment method or subscription is created.

Requests disclose the user's connection IP and rounded requested coordinates to Open-Meteo. Notes, site names, attachments and identity are not sent. Requests omit credentials and referrers, refuse redirects, use a fixed HTTPS endpoint, have time/size limits and validate returned coordinate/time/unit fields. Data/model generation and interpolation are not local observations. The provider may log coordinates and network information under its own policy.

The renderer CSP intentionally adds only https://api.open-meteo.com to connect-src in the new development version, without allowing external scripts, wildcard origins or unsafe-eval. This is an explicit new application data connection, not disabling browser/OS/employer security controls.

Weather cache is local under workspace settings; up to 32 selected-area samples plus a fixed global grid. Workspace exports and local backups may include that cache. Earlier backups/exports are not deleted by Clear cached weather. The first-version published privacy text and Store listing are not automatically changed. Before shipping this version, update both the in-app/Store disclosures and reviewer notes for optional weather networking and the cache.

## Test status
See the actual workflow results and subsequent validation report. Source changes and test definitions are not evidence that tests have passed. No Windows 11 installation, signature or employer endpoint clearance is implied.
