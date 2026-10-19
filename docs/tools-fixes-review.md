# Reported tool fixes — 19 October 2026

## Changes

- Classification adjustments now preserve the highest class already reached. Both the severity and long-term-duration paths can no longer replace Class III with IIb. Unchanged results no longer gain an inaccurate Risk uplift explanation. Active implantable and medicinal-substance basis references corrected to Rules 8 and 14.
- Result-screen CTA now offers the available free PSUR outline tool. Removed the unbuilt generator and under-30-minute drafting promise. Review enquiry no longer promises guaranteed expert access.
- Added main-content landmarks to the tools index, CPD tracker, PSUR outline, PSBAR statement generator and Score API. Navigation and footers remain outside main. Preserved PSBAR footer gutters.
- Tool-card headings changed from h3 to h2, with the same styles. CPD date now has a programmatic label; category and college selectors also have explicit names.
- Added regression tests for classifier invariants and the actual wizard/CTA, labels, main landmarks and selected accessibility rules.

## Verification

- scripts/test-classifier.cjs: 960 input combinations; all240 active-implant and240 medicinal-substance cases retain III;320 severity-monotonicity comparisons and960 long-term comparisons pass. These are software regression tests, not regulatory validation of the whole simplified screening tool.
- scripts/check-tools-fixes.cjs: actual low/high severity, long-duration and Class I/IIa result paths; outline link and Class I PSR copy; main/footer/nav structure;390px widths; CPD labelled-input activity save; no browser JavaScript errors.
- 44 broad desktop/mobile browser regression checks pass, including consent lifecycle and actual .doc download.
- Selected axe rules across19 routes:19 clear after changes. Prior five-page findings resolved. Not a full accessibility audit.
- 47 HTML documents,37 inline script syntax checks,46 JSON/importmap blocks and656 internal references pass. Existing fact check and diff whitespace check pass. No routes changed.
- GPT-6 Astra independent proof:870 classifications unchanged,90 corrected upward,0 downgraded and0 unexpected class changes across960 cases. Both original failures reproduced in the test cases and corrected. Footer finding addressed.

## Scope and sources

The patch repairs the reported software defects and copy/accessibility findings. It does not implement every classification rule or validate regulatory suitability. Existing indicative-tool and qualified-review wording remains. Immunaris end-to-end intake/certificate and Staamp approval/reward testing remain separate from these three requested fixes.

Rule references checked against MDCG2021-24 Rev.1 (April2026), hosted by the European Commission:
https://health.ec.europa.eu/document/download/cbb19821-a517-4e13-bf87-fdc6ddd1782e_en?filename=mdcg_2021-24_en.pdf

QA artifacts in docs/tools-fixes-qa/ are excluded from deployment. Production deployment must use the pushed commit from a fresh clone.
