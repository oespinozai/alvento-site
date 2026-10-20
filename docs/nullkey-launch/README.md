# NullKey — Alvento launch package

Prepared 20 October 2026. **Private preparation; not approved for publication.**

This package contains a complete Alvento product profile, two real internal-test screenshots, and exact launch edits for the homepage, portfolio, sitemap and llms.txt. Existing public website files are unchanged. Both docs/ and scripts/ are excluded by .vercelignore.

## Preview

Run `python3 scripts/prepare-nullkey-launch.py --preview /tmp/nullkey-launch-preview-NEW` to create an isolated copy of the website with the launch changes applied. Serve that copy locally using clean-URL routing. Do not upload the preview to a public host while NullKey is private.

## Content decisions

- NullKey is an Alvento-owned product in private Android testing, not client work or an available public download.
- Product profile explains photos/files/notes, on-device encryption, recovery versus backup, optional removal of originals, and limits of current testing.
- No price, store badge, customer count, testimonial, independent audit or certification is claimed.
- No APK, credentials, recovery keys, private notes or customer files are included. Screens show only an empty vault and a blank unlock form.
- Homepage and portfolio route to the product profile. Its primary CTA points to nullkey.alvento.uk; launch requires confirming that intended visitors can access that destination.
- App privacy is described separately from Alvento page analytics; the normal Alvento consent controls remain in use.

## Source evidence

App README and docs/CRYPTO.md inspected in /root/cellar-android on 20 October 2026. Screens are from the internal UX test build on that date. Working app source was not modified. These are functional-development statements, not a security assessment.

## When Oscar says go

1. Recheck the current app build, private-testing status, screenshots and copy. Change the visible status only if the actual release position changes.
2. Confirm intended access to nullkey.alvento.uk, HTTPS, final marketing copy and enquiry links. Do not change its private audience without explicit launch authorization.
3. Generate a fresh preview, review the changes.json replacements against current Alvento source, then copy the generated launch files and four edited root files into a launch branch.
4. Run repository checks and desktop/mobile browser checks. Confirm no app binaries or private data are included.
5. Commit and push to the canonical repository, then deploy a fresh clone of that exact commit. This preparation script does not publish or change access.

No public announcement or public launch is authorized by this preparation task.
