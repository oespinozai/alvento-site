# Commercial clarity review handoff — 19 October 2026

Implemented in an isolated branch, `commercial-clarity-20261019`. Original checkout and its untracked asset are untouched. No push or production deployment performed.

## What changed

- Concrete homepage offer and four need-based buyer routes; three commercial delivery models, agreed ownership/support and scoped human review/escalation.
- Portfolio groups: paid client work, available products, owned reference builds, other products/experiments. Anonymous content case uses only confirmed monthly volumes; Staamp links product to Lizette’s deployment. Reference builds have consistent scope/evidence/status summaries.
- Available Staamp and Portraix distinguished from unverified products. Portraix and historical ioomm.app are explicitly one product. Dated Staamp usage preserved without causal revenue/retention claims.
- Contextual enquiries request business/problem, required output, systems and volume/frequency without adding a form or internal commercial mechanics.
- AEO deliverables and repeatable sampled measurement replace unsupported statistics, typical timelines, guarantees and SEO exclusions; visible FAQ and schema agree.
- Independent specialist wording and document-assistance limits; PSUR concept separated from free outline; technical-index promises match its actual HTML .doc export.
- All analytics entry points migrated to one consent-controlled loader, with persistent preferences and withdrawal; privacy distinguishes page analytics, browser-local tools and remote demonstrations. No email subject/body is included in lead-event payloads.
- Shared navigation/focus/mobile handling; fixed sample-report enquiry anchor, metadata, llms.txt and sitemap modification dates. Existing URLs and redirects retained.

## Validation results

- Existing `sh scripts/check-facts.sh`: PASS. `git diff --check`: PASS.
- 47 HTML documents checked: valid doctype; 37 inline script syntax checks and 46 JSON/importmap blocks parse; 656 internal references and sitemap destinations resolve. No broken local fragments or duplicate IDs found.
- 42 browser checks: PASS. Eighteen representative routes at 1440px and 390px; no document overflow, exactly one H1, working mobile-menu open/Escape. No JavaScript page errors. Technical-index generation and .doc download pass. Six homepage email links include all four enquiry prompts. Reference status labels visible.
- Fresh browser/decline/accept/withdraw lifecycle: PASS with analytics requests intercepted rather than sent. Zero GA requests before acceptance and after decline; one loader request after accept; accessible GA cookies removed and page reloaded after withdrawal.
- Targeted keyboard focus and engagement anchor: PASS; the target begins below the fixed navigation.
- Selected automated accessibility rules (contrast, heading order, button/link names, ARIA attributes, main landmark) on homepage, portfolio, Staamp, AEO, privacy and technical index: no violations after fixes. This is not a full accessibility audit.
- Arrears mock-service smoke: PASS through local preview proxy, six captured reminders and signed simulated payment; no emails sent or real payments taken. PSUR outline: generated with fictional device details.
- Foyer persona controls and error recovery work. The live conversation service returned “Demo unavailable right now, try again shortly.” A successful inference/voice reply was not verified. This predates the content changes; no service infrastructure changed.
- Direct current production HTML and rendered pages inspected. No enquiry emails or audit/capture forms submitted. Public product URLs inspected, with limitations below.
- Static HTML site: package.json defines no build script. Existing fact check, syntax/JSON checks and browser QA are the applicable buildless checks; no framework build was claimed.
- Higher-intelligence proof by GPT-6 Astra: reported findings addressed; final read-only proof found no material remaining issues.

## Remaining factual questions / operational limitation

1. Wren, Kestrel and Licit public requests returned 403. Local Wren/Kestrel documentation supports their described feed purpose and implementations exist, but authenticated access, current coverage, commercial terms and support readiness were not validated. A blocked request alone does not establish a product failure.
2. Score API has implementation source and a documented public page, but the documented public API hostname did not resolve in this check. Current external access, data coverage and published tier/key terms remain unverified. It is retained, not described as an unbuilt concept.
3. Actual Google Analytics property retention setting needs owner confirmation. The policy does not invent a period. The consent and cookie behaviour described was tested.
4. Content languages, production stages, detailed review arrangements and permission to show client material remain unverified and are omitted. Review for new work is agreed in scope.
5. Foyer live inference/voice availability needs an operational follow-up before a successful live conversation can be demonstrated. Its fictional calls/transcripts and reference labels remain available.

## Review and deployment

Review source and the screenshots/JSON in `docs/commercial-qa/` (excluded from deployment by .vercelignore). The browser regression check is `scripts/check-commercial.cjs`; run with PLAYWRIGHT_MODULE, BASE_URL and QA_OUTPUT pointing to your installed Playwright, local clean-URL preview and an output directory. The local preview used platform-equivalent static clean URLs and a read-through proxy to the public mock Arrears service. No backend changes were required.

If approved later, push the reviewed commit to the canonical repository and deploy from a fresh clone of that commit, as required by repository instructions. Recheck public routes/analytics after deployment. No production publication is authorised by this task.

## Changed files

- `.vercelignore`
- `404.html`
- `aeo.html`
- `audit-booked.html`
- `blog/apple-claude-md-leak-governance.html`
- `blog/get-cited-by-ai-search.html`
- `blog/google-business-profile-tips.html`
- `blog/how-a-one-person-company-runs-on-an-agent-fleet.html`
- `blog/how-to-get-more-google-reviews.html`
- `blog/how-to-rank-on-google-maps.html`
- `blog/how-to-read-an-ai-model-leaderboard.html`
- `blog/how-we-built-arrears.html`
- `blog/index.html`
- `blog/invoice-chasing-cadence.html`
- `blog/local-seo-for-small-business-uk.html`
- `blog/map-the-process-before-you-automate.html`
- `blog/opus-4-7-and-the-compute-squeeze.html`
- `blog/patient-data-governance-pitt-lessons.html`
- `blog/pmcpa-theramex-ai-pharma-comms.html`
- `blog/staamp-deli-pilot.html`
- `blog/the-only-honest-way-to-build-b2b-software.html`
- `blog/what-llm-benchmarks-actually-measure.html`
- `blog/what-shipping-a-consumer-ai-product-taught-us.html`
- `blog/why-anthropic-put-a-pharma-ceo-on-its-safety-board.html`
- `blog/why-benchmark-scores-dont-predict-real-world-performance.html`
- `blog/why-is-my-business-not-showing-on-google.html`
- `blog/why-regulated-industries-are-last-to-adopt-ai.html`
- `case-studies/arrears/index.html`
- `case-studies/foyer/index.html`
- `case-studies/immunaris/index.html`
- `case-studies/index.html`
- `case-studies/staamp/index.html`
- `clinical-registries/index.html`
- `consent-banner.js`
- `index.html`
- `llms.txt`
- `privacy.html`
- `projects/psur-draft-generator/index.html`
- `sample-audit-report.html`
- `score-api.html`
- `sitemap.xml`
- `tools.html`
- `tools/cpd-tracker/index.html`
- `tools/mdr-class-check/index.html`
- `tools/mdr-psur-outline-generator/index.html`
- `tools/mdr-technical-file-index/index.html`
- `tools/pdf-to-markdown/index.html`
- `tools/psbar-statement-generator/index.html`
- `tools/sop-to-checklist/index.html`
- `tools/udi-decoder/index.html`
- `website-audit.html`
- `commercial.css`
- `scripts/check-commercial.cjs`
- `docs/commercial-implementation-checklist.md`
- `docs/commercial-review-handoff.md`
- `docs/commercial-qa/`
