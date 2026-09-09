# Expedition typography refinement

Owner: Jaison Norton. Date: 2026-09-09.

The owner replied "yes" after the recommendation to retain classic book-style headings in B and use modern text for controls and numerical readings. This iteration follows that recommendation; it is not approval to publish or change a saved theme.

Implemented on develop/ui-directions:
- Preserve B's existing Georgia heading stack for the main scene title, selected place, dialog titles and timeline title.
- Use the system Segoe UI stack for controls and primary counters/weather values.
- Use lining/tabular numerals for readings and a system monospace stack for coordinates.
- Keep the warm palette, globe, five mystery colors, A/C choices, existing default and saved layout/privacy preferences unchanged.
- Download no font files and introduce no new network access.

## Actual verification

Workflow 34393652833 (job 102607888724) completed successfully for commit 0bb2d5c7aeb711a32c8246b05351b83de80677ef.
203 code checks passed. 46 native UI/runtime checkpoints passed: 13 workspace/LiDAR, 7 unit preferences, 13 cameras/refresh, 13 appearance checks. This includes new computed font-family/tabular-numeral checks and populated model weather across laptop, desktop, ultrawide and compact viewports.

Environment: real unpackaged .NET helper and installed Edge on GitHub-hosted Windows Server 2022. Not Windows 11 packaged-install acceptance or physical camera/touch testing.

Artifact 10120738660: atlas-ui-directions-preview. Downloaded ZIP SHA-256 6f0bbcc3d03e6a79d98617b889d4e4b47ad12bd697d9f58b9ebd8ae520163891 and CRC verified. Actual B desktop and laptop captures were visually inspected. Values in these snapshots were retrieved during the test, not current forecasts for later use. Screenshots reflect UI source, not a newly approved Store package. App code and permissions were not altered to manufacture the previews.

Scope: UI source, tests and this report only. No installer, release, Store upload, hardware permission, billing change or installation on any personal/employer device.
