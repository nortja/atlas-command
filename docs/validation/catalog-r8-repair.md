# Revision 8 recovery and QC

The only historical R8 blob (commit `234ad25`) ends mid-record at Huaca Prieta.
It contains 19 complete records and the fields of a twentieth, not 25 complete
records. No complete 25-record version exists in the fetched branch history.

The repair preserves every surviving UTF-8 byte (15,504 bytes after normalizing
checkout line endings), adds the missing review field and object terminator, then
completes the intended batch with five new, separately sourced records. These are
not claimed to be recovered lost content:

- [Pasargadae](https://whc.unesco.org/en/list/1106/)
- [Persepolis](https://whc.unesco.org/en/list/114/)
- [Hattusha](https://whc.unesco.org/en/list/377/)
- [Troy](https://whc.unesco.org/en/list/849/)
- [Mycenae](https://whc.unesco.org/en/list/941/)

Sources checked September 14, 2026. Coordinates are generalized public site
references. Numeric dates represent the described phases, not complete occupation
histories. Troy retains unresolved numeric bounds rather than inferring a precise
range from the UNESCO overview. The original records' pending bibliography/QC
notes remain intact. No records from earlier batches were changed or removed.

New QC executes every catalog script, checks batch completeness, global ID
uniqueness, normalized fields and preservation of the original R8 prefix. The
existing UI minimum of 150 remains unchanged. The collaboration browser test now
rejects every startup error, including the former R8 exception.

Both local collaboration commits were reviewed and retained: model defaults and
role checks, disabled providers, no persistence/network calls, safe DOM rendering,
separate proposal data, exact native asset allowlists and integration ordering.
No production crypto or transport was introduced by those commits.

Recovery also handles workspaces already stamped `catalogRevision=8` by the
broken build. A separate completion marker is set only when all 25 R8 IDs are
present. Missing IDs are added without replacing existing records. An isolated
browser upgrade test verifies both a curated-record user note and a private
addition survive this repair. Local checks: 393 Node tests, browser regression,
unsigned owner-preview compilation and archive SHA-256 verification passed.
