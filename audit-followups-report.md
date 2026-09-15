# Audit follow-ups report — 2026-09-15

Branch: `audit-followups-2026-09-15` (from `master`).

---

## RUN 1 — SOP to Checklist: one-off items mis-tagged as recurring

File: `tools/sop-to-checklist/index.html`

**Correction to the work order's premise:** the exact line "Complete safety
briefing by EOD." is real and does exist verbatim in the file (line 711 at the
time of inspection), but it is step 6 of the **"Day 1" section inside the
"onboarding" example**, not the "Daily ops" example as the work order states
(confirmed by grep: the "daily-ops" example string does not contain "EOD" or
"safety briefing" anywhere). The underlying bug the work order describes
(heuristic EOD/end-of-day match rendered identically to an explicit
daily/every-day match, in the `.meta.freq` badge, with no indication it was
inferred) is fully real and reproducible exactly as described — only the
example label was wrong. Proceeded with the fix rather than blocking, since
the bug itself, the regex location, the fix approach, and the evidence format
described in the work order were all accurate.

Reproduced by extracting the tool's inline parser/render functions and running
them under Node against `EXAMPLES.onboarding` (stubbed `document` for the
`esc()` helper only — no other DOM behavior was touched).

**Before** — rendered preview HTML for item 6 of onboarding → "Day 1":
```html
<li>Complete safety briefing by EOD.<span class="meta freq">daily</span></li>
```
This is indistinguishable from a genuinely recurring daily item (e.g. compare
"Start of shift (6am)" in the daily-ops example, which also renders
`<span class="meta freq">daily</span>` from an explicit context).

**Fix:** split the `daily` frequency regex into an explicit branch
(`daily|each day|every day|per day`) and a separate heuristic branch
(`end of day|eod|start of shift|start of day`) tagged `inferred: true`.
`detectFrequency()` now returns `{ tag, inferred }` instead of a bare string;
the `inferred` flag threads through `startSection`/`buildStep` into
`section.frequencyInferred` / `item.frequencyInferred`, which both the HTML
preview and the Markdown/download export use to render a visibly different
badge with an explanatory tooltip. Tag-string equality comparisons (used
elsewhere for de-duplicating badges and for the `freqCount` stat) were left
untouched — the plain `frequency` field is still a string, so no other code
path was affected.

**After** — rendered preview HTML for the same item:
```html
<li>Complete safety briefing by EOD.<span class="meta freq freq-inferred" title="Inferred from wording (e.g. 'EOD'), not a stated recurring schedule">daily (inferred)</span></li>
```

Regression check — explicit matches are unaffected (from the daily-ops
example, section "Weekly (every Friday)"):
```html
<h3>Weekly (every Friday) <span class="meta freq">weekly</span></h3>
```
vs. the heuristic "Start of shift (6am)" section header, now marked:
```html
<h3>Start of shift (6am) <span class="meta freq freq-inferred" title="Inferred from wording (e.g. 'EOD'), not a stated recurring schedule">daily (inferred)</span></h3>
```
Markdown export shows the same distinction:
```
## Start of shift (6am) _[daily, inferred]_
## Weekly (every Friday) _[weekly]_
```

`node --check` passed on the extracted script after the change.

**RUN1-DONE**

---

## RUN 2 — PSBAR Statement Generator: empty non-compliance section

File: `tools/psbar-statement-generator/index.html`

Reproduced by extracting `generateStatement()` and running it under Node with
a stubbed `document` (field values keyed by id) for `compliance='partially'`
and a blank `#inaccessible` textarea.

**Before** — generated markdown (excerpt):
```
## Non-accessible content

The content listed below is non-accessible for the following reasons:


### Non-compliance with the accessibility regulations
```
The intro sentence claims a documented, specific list of non-accessible
content, followed by zero bullet items.

**Fix:** added a validation guard immediately after reading `#inaccessible`:
when `compliance !== 'fully'` and no non-empty lines were entered, the
function now calls `alert(...)` with an explanatory message and returns
before building or displaying any statement — reusing the `alert()` pattern
already used elsewhere in this same file (`copyResult()`), so no new UI
markup/CSS was introduced.

**After** — same inputs (`compliance='partially'`, blank `#inaccessible`):
```
alert shown: You've marked this site as not fully compliant, so list at least
one item of non-accessible content in the "Inaccessible Content" field before
generating the statement. A non-compliance statement with no items listed is
misleading.
```
No markdown is generated (`markdown-box` stays empty), `results-section` is
never shown.

Regression checks:
- `compliance='fully'` + blank `#inaccessible` → generates normally, no alert
  (the whole "Non-accessible content" block is skipped for `fully` regardless,
  which is pre-existing, untouched behavior).
- `compliance='partially'` + two populated lines → generates normally, no
  alert, bullets render as before:
  ```
  ## Non-accessible content

  The content listed below is non-accessible for the following reasons:

  * PDF forms are not screen-reader accessible.
  * Some videos lack captions.
  ```

**RUN2-DONE**

---

## RUN 3 — MDR Technical File Index: SSCP wrongly forced mandatory

File: `tools/mdr-technical-file-index/index.html`

**BLOCKED — work order premise is factually wrong.**

The work order's fix instruction is: "gate the SSCP mandatory warning on the
device class/annex context the user already selected elsewhere in the tool."
I read the entire file looking for that context input. There is no such
control:

```
$ grep -n "<input\|<textarea\|<select" tools/mdr-technical-file-index/index.html
233:                <input type="checkbox" data-id="2a" checked>
237:                <input type="checkbox" data-id="2b" checked>
241:                <input type="checkbox" data-id="2c" checked>
245:                <input type="checkbox" data-id="2d" checked>
249:                <input type="checkbox" data-id="2e" checked>
253:                <input type="checkbox" data-id="2f" checked>
258:                <input type="checkbox" data-id="3a" checked>
262:                <input type="checkbox" data-id="3b" checked>
266:                <input type="checkbox" data-id="3c">
```

Every `<input>` in the file is one of the 9 section-inclusion checkboxes
(2a–2f, 3a–3c). A broader grep for any classification concept
(`Class I`, `Class II`, `IIa`, `IIb`, `classification`, `device type`,
`deviceType`, `radio`, `<select>`) returns zero matches anywhere in the file.
The `items` array driving the warning logic is a static constant with no
per-session/user classification data:
```js
{ id: "3c", title: "SSCP (for Class III / implantable)", annex: "III" }
```
and the warning fires purely on `!isSelected` (the 3c checkbox unchecked),
never on any class/annex context — because no such context exists to check.

Evidence (simulated the exact render logic for the SSCP row in both
requested scenarios):
```
--- Scenario A: "non-Class-III, non-implantable device", SSCP checkbox left unchecked (its default state) ---
<div class="toc-item missing">
    <span class="status-tag">Missing</span>
    <strong>Section 9: SSCP (for Class III / implantable)</strong>
    <span class="warning">This section is mandatory for Annex III. Add this before submission.</span>
</div>

--- Scenario B: "Class III / implantable device", SSCP checkbox left unchecked ---
<div class="toc-item missing">
    <span class="status-tag">Missing</span>
    <strong>Section 9: SSCP (for Class III / implantable)</strong>
    <span class="warning">This section is mandatory for Annex III. Add this before submission.</span>
</div>
```
Identical output — the tool cannot represent scenario A and B differently
because it has no input for device class/implantable status anywhere. Gating
on "context the user already selected elsewhere" would require *adding* a new
classification input (new UI, new state, new copy) — that is new
functionality, not a fix to existing miswired logic, and is out of scope for
this RUN (no new UI/refactor authorized, "3 files only, no refactors").

No changes were made to this file.

**RUN3-BLOCKED: the work order assumes a device class/annex/implantable
selection control exists "elsewhere in the tool" to gate the SSCP warning on.
No such control exists anywhere in the file — the only inputs are the 9
section checkboxes, and the SSCP warning already keys off the only signal
that exists (the 3c checkbox itself). Implementing the described fix would
require adding a new classification input, which is new functionality beyond
a bug fix and outside this RUN's scope.**

---

## RUN 4 — MDR Technical File Index: "DOCX" export is actually renamed HTML

File: `tools/mdr-technical-file-index/index.html`

Reproduced by extracting `downloadDocx()` and running it under Node (stubbed
`document`/`URL`/`Blob`), capturing the resulting Blob's bytes to disk and
running `file` on them.

**Before:**
```
$ node run4-before.js mdr-script.js
download filename: technical-file-index.doc
blob.type (MIME): application/msword

$ file technical-file-index-before.doc
technical-file-index-before.doc: HTML document, ASCII text, with very long lines (512), with no line terminators
```
Confirmed: the "DOCX" export is an HTML document served with a `.doc`
filename and `application/msword` MIME type — not a real OOXML `.docx`. This
was marketed as "DOCX" in the meta description, og:description, FAQ schema
answer, tab label, and download button.

**Fix chosen: route (b)** — stop calling it DOCX, describe it accurately as
a Word-ready `.doc` file. Chose (b) over (a) (real minimal OOXML `.docx` via
a hand-rolled in-browser ZIP writer) because it is the smaller, lower-risk
change that is fully correct: it doesn't require implementing and verifying a
from-scratch ZIP/CRC32 encoder with no bundled library, and it fixes the
actual defect named in the work order (marketing claims a format the code
doesn't produce) without changing the working download mechanism at all.
Noting this explicitly per the work order's instruction not to pick silently.

Copy changed (meta description, og:description, FAQ answer x2 — the schema.org
block and its visible on-page duplicate, tab label, in-tab description,
button label):
- meta description: "...exports Markdown + DOCX." → "...exports Markdown + a
  Word-ready .doc file."
- og:description: "...Markdown + DOCX export." → "...Markdown + Word-ready
  .doc export."
- FAQ answer (both the ld+json schema and the visible `<details>` duplicate):
  "Markdown and DOCX. ... the DOCX output integrates with..." → "Markdown and
  a Word-ready .doc file. ... the .doc file opens directly in Microsoft Word
  and integrates with..."
- Tab label: "DOCX" → "Word (.doc)"
- In-tab paragraph: "Download a formatted .docx index..." → "Download a
  Word-ready .doc index..."
- Button: "Download .docx File" → "Download .doc File"

Internal-only identifiers left unchanged (not user-facing claims, changing
them adds no correctness value and only adds risk): the `downloadDocx()`
function name, the `tab-docx` element id, and the `switchTab('docx')` call —
none of these are visible to a user, and the actual downloaded filename was
already `technical-file-index.doc` (matches the new copy).

**After — grep confirms no remaining user-facing "DOCX" claims:**
```
$ grep -n "DOCX" tools/mdr-technical-file-index/index.html
(no output)

$ grep -ni "docx" tools/mdr-technical-file-index/index.html
279:            <button class="tab-btn" onclick="switchTab('docx')">Word (.doc)</button>
290:        <div id="tab-docx" class="tab-content">
292:            <button class="btn-action" onclick="downloadDocx()">Download .doc File</button>
399:    function downloadDocx() {
400:        // Since we can't easily bundle docx.js, we'll use a data URI for a basic .doc file (HTML format)
```
All remaining occurrences are internal JS identifiers / a dev comment that
already accurately describes the mechanism — zero user-visible "DOCX" claims
remain. Both `<script type="application/ld+json">` blocks still parse as
valid JSON after the edit (verified with `json.loads` in Python).

The download mechanism itself is unchanged (diffed the extracted
`downloadDocx()` script before/after the edit — identical), so the file it
produces is still the same HTML-as-.doc; the fix makes the tool's claims
match its actual behavior.

**RUN4-DONE**
