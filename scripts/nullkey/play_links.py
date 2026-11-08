"""Build and validate the Play campaign URL used on each generated page."""
from urllib.parse import urlencode

PACKAGE = 'uk.alvento.nullkeyapp'
BASE = 'https://play.google.com/store/apps/details'
PLAIN = BASE + '?id=' + PACKAGE


def campaign_for_route(route):
    parts = route.strip('/').split('/') if route.strip('/') else []
    if not parts:
        return 'home'
    if parts[0] == 'guides':
        return parts[1] if len(parts) > 1 else 'guides-hub'
    if parts[0] == 'features':
        return 'features'
    return parts[0]


def play_url(campaign, source='alvento-site'):
    referrer = urlencode({'utm_source': source, 'utm_medium': 'web', 'utm_campaign': campaign})
    return BASE + '?' + urlencode({'id': PACKAGE, 'referrer': referrer})


def qr_url():
    return play_url('guides', source='alvento-site-qr')
