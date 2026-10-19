# Customer-facing editorial pass — 19 October 2026

Branch: editorial-polish-20261019. Based on published 14f8a4e. No deployment performed for this follow-up.

## Changes

- Removed the repeated project worksheet sections. The original case-study narratives, status labels, dated Staamp usage and material fictional/sample-data disclosures remain.
- Natural content-production and available-product descriptions replace inspection-style “Evidence” and implementation fields. The content case uses the same confirmed volumes.
- Removed public “we could not verify” and “availability unverified” commentary. Wren, Kestrel, Licit and Score API retain factual purpose descriptions under Other products. No Experimental or Available by arrangement status has been invented. Oscar was asked for those four labels; confirmation is pending.
- Score API now presents an example response and integration enquiry, without an unconfirmed historical price table or live-access promise.
- Removed the 30x/20–30x claim from the tools list, converter title/meta/FAQ and three related blog promotions. Converter statistics now compare actual PDF and UTF-8 Markdown byte sizes; removed the invalid bytes-to-token calculation and cost-savings calculation.
- Tools CTA now says Discuss your workflow. Technical File Index CTA offers document organisation and completeness checks, with specialist assessment separately agreed. AEO breadcrumb now says Services.
- Homepage content link and clinical workflow page use natural descriptions. Clinical examples remain possible applications; Immunaris retains one clear owned reference-build disclosure with sample records. Clinical FAQ schema matches the revised visible questions/answers.
- Shared delivery-model wording, consent implementation, product URLs and demo controls retained. Removed unused worksheet CSS.

## Checks

- Direct current production HTML matched the source baseline for portfolio, tools and AEO before editing.
- Existing fact check and git diff whitespace check pass.
- 47 HTML documents, 37 inline scripts, 46 JSON/importmap blocks and 656 internal references pass static checks; sitemap destinations resolve.
- 44 browser checks pass at desktop/mobile widths, covering layout, mobile navigation, enquiry prompts, reference labels, .doc export, JavaScript errors and accept/decline/withdraw analytics behaviour.
- Fictional one-page PDF conversion passed: original PDF 619 bytes, generated Markdown 46 UTF-8 bytes, displayed size ratio 13.5x. This is a file-size comparison, not a claim about tokens or billing.
- Portfolio desktop/mobile and converter mobile screenshots inspected; no observed layout issue. No customer emails or lead forms submitted.
- GPT-6 Astra editorial proof identified residual homepage/clinical language and the misleading converter metrics; those findings were addressed.

## Pending

Oscar needs to confirm a simple customer-facing status for Wren, Kestrel, Licit and Score API. The prepared copy omits availability labels rather than guessing. Apply confirmed labels before final publication. This follow-up has not been pushed or deployed.

Review artifacts are in docs/editorial-qa/ and excluded from deployment by the existing docs/ ignore rule.
