#!/bin/sh
# Fails if any published file carries a company number other than Alvento's.
# 15808196 is an unrelated dissolved company that sat in every footer for 5 months.
set -e
bad=$(grep -rnoE 'Company No\.? ?[0-9]{8}|company number [0-9]{8}|"value": "[0-9]{8}"' \
  --include='*.html' --include='*.txt' --include='*.js' \
  --exclude-dir=node_modules --exclude-dir=.git . | grep -v 16394298 || true)
if [ -n "$bad" ]; then
  echo "Wrong company number (expected 16394298):"; echo "$bad"; exit 1
fi
echo "check-facts: ok"
