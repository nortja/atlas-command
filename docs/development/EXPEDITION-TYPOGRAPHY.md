# Expedition typography refinement

Owner: Jaison Norton. Date: 2026-09-09.

The owner replied "yes" after the recommendation to retain classic book-style headings in B and use modern text for controls and numerical readings. This iteration follows that recommendation; it is not approval to publish or change a saved theme.

Implemented on develop/ui-directions:
- Preserve B's existing Georgia heading stack for the main scene title, selected place, dialog titles and timeline title.
- Use the system Segoe UI stack for controls and primary counters/weather values.
- Use lining/tabular numerals for readings and a system monospace stack for coordinates.
- Keep the warm palette, globe, five mystery colors, A/C choices, existing default and saved layout/privacy preferences unchanged.
- Download no font files and introduce no new network access.

The native UI checks now inspect computed font families and numerical styles, including populated weather across laptop, desktop, ultrawide and compact viewport sizes. Their run must finish before this iteration is described as passing. The prior 203-code-check / 45-native-check record is not evidence for these newly changed files.

Scope: UI source and tests only. No installer, release, Store upload, hardware permission, billing change or installation on any personal/employer device.
