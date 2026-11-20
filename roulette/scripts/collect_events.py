#!/usr/bin/env python3
"""Collect upcoming public events for the outing roulette.

Each source is independent. The script prefers public JSON and JSON-LD,
makes only a few requests, and rewrites roulette/data/events.json only when
the event list or source report actually changes.
"""

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'events.json'
UA = 'OutingRoulette/1.0 (public events index; +https://token-byte.github.io/roy-calendar/roulette/)'
TZ = ZoneInfo('Asia/Jerusalem')
HORIZON_DAYS = 10

CITIES = [
    ('תל אביב-יפו', 32.0853, 34.7818, ('תל אביב', 'תל אביב-יפו', 'tel aviv')),
    ('הרצליה', 32.1624, 34.8443, ('הרצליה', 'herzliya')),
    ('רעננה', 32.1847, 34.8706, ('רעננה', "ra'anana", 'raanana')),
    ('כפר סבא', 32.175, 34.9069, ('כפר סבא', 'kfar saba')),
    ('הוד השרון', 32.15, 34.89, ('הוד השרון', 'hod hasharon')),
    ('פתח תקווה', 32.084, 34.8878, ('פתח תקווה', 'petah tikva', 'petach tikva')),
    ('רמת גן', 32.0684, 34.8248, ('רמת גן', 'ramat gan')),
    ('גבעתיים', 32.072, 34.812, ('גבעתיים', 'givatayim')),
    ('רמת השרון', 32.1461, 34.8394, ('רמת השרון', 'ramat hasharon')),
    ('ראשון לציון', 31.973, 34.7925, ('ראשון לציון', 'rishon')),
    ('חולון', 32.0158, 34.7874, ('חולון', 'holon')),
    ('בת ים', 32.0132, 34.748, ('בת ים', 'bat yam')),
]


def now():
    return datetime.now(TZ)


def window():
    start = now() - timedelta(hours=3)
    end = now() + timedelta(days=HORIZON_DAYS)
    return start, end


def in_window(iso):
    start, end = window()
    try:
        moment = datetime.fromisoformat(iso)
    except ValueError:
        return False
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=TZ)
    return start <= moment.astimezone(TZ) <= end


def city_match(text):
    blob = (text or '').casefold()
    for name, lat, lon, aliases in CITIES:
        if any(alias.casefold() in blob for alias in (name,) + aliases):
            return name, lat, lon
    if 'אזור המרכז' in blob or 'גוש דן' in blob or 'ישראל' in blob or 'israel' in blob:
        return 'גוש דן', 32.0853, 34.7818
    return None


def get(url, timeout=18, limit=900000, truncate=False):
    request = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept': 'application/json, text/html;q=0.9, */*;q=0.8',
    })
    with urllib.request.urlopen(request, timeout=timeout) as response:
        status = response.status
        raw = response.read(limit + 1)
        if len(raw) > limit and not truncate:
            raise RuntimeError('response larger than %s bytes' % limit)
        return status, raw[:limit].decode('utf-8', 'replace')


def json_ld_events(html, source):
    found = []
    for block in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.I | re.S):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        nodes = data if isinstance(data, list) else [data]
        if isinstance(data, dict) and isinstance(data.get('@graph'), list):
            nodes = data['@graph']
        for node in nodes:
            if not isinstance(node, dict):
                continue
            kind = node.get('@type')
            kinds = kind if isinstance(kind, list) else [kind]
            if 'Event' not in kinds:
                continue
            start = node.get('startDate')
            if not start or not in_window(start):
                continue
            place = node.get('location') if isinstance(node.get('location'), dict) else {}
            address = place.get('address') if isinstance(place.get('address'), dict) else {}
            city_text = ' '.join(str(part or '') for part in (
                place.get('name'), address.get('addressLocality'), address.get('addressRegion'), node.get('name')
            ))
            located = city_match(city_text)
            if not located:
                continue
            city, lat, lon = located
            geo = place.get('geo') if isinstance(place.get('geo'), dict) else {}
            try:
                lat = float(geo.get('latitude', lat))
                lon = float(geo.get('longitude', lon))
            except (TypeError, ValueError):
                pass
            offers = node.get('offers') if isinstance(node.get('offers'), dict) else {}
            found.append({
                'title': str(node.get('name') or '').strip(),
                'start': start,
                'venue': str(place.get('name') or ''),
                'city': city,
                'lat': lat,
                'lon': lon,
                'url': node.get('url') or '',
                'source': source,
                'price': offers.get('price') or offers.get('lowPrice') or None,
            })
    return [item for item in found if item['title'] and item['url']]


def source_makore():
    events = []
    errors = []
    start = now().date().isoformat()
    end = (now() + timedelta(days=HORIZON_DAYS)).date().isoformat()
    for city, lat, lon, _aliases in CITIES:
        query = urllib.parse.urlencode({
            'city': city,
            'category': 'חיי לילה',
            'dateFrom': start,
            'dateTo': end,
            'limit': 20,
        })
        try:
            status, body = get('https://api.makore.co.il/v1/events?' + query)
            if status != 200:
                errors.append('%s HTTP %s' % (city, status))
                continue
            payload = json.loads(body)
        except Exception as exc:
            errors.append('%s: %s' % (city, exc.__class__.__name__))
            time.sleep(0.4)
            continue
        for item in payload.get('events') or []:
            start_at = item.get('startDate')
            if not start_at or not in_window(start_at):
                continue
            events.append({
                'title': item.get('title') or '',
                'start': start_at,
                'venue': item.get('location') or '',
                'city': item.get('city') or city,
                'lat': lat,
                'lon': lon,
                'url': item.get('detailUrl') or '',
                'source': 'makore',
                'price': item.get('cost') or None,
            })
        time.sleep(0.45)
    if events:
        return events, None
    return [], '; '.join(errors) or 'no nightlife events'


def source_tickchak():
    status, html = get('https://live.tickchak.co.il/parties/thisWeek')
    if status != 200:
        raise RuntimeError('HTTP %s' % status)
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
    if not match:
        raise RuntimeError('no public JSON')
    data = json.loads(match.group(1))
    bundle = data['props']['pageProps']['initialState']['data']['event']['all']
    events = []
    for item in bundle.values():
        if not isinstance(item, dict) or not item.get('title') or item.get('isPastEvent'):
            continue
        venue = item.get('venue') if isinstance(item.get('venue'), dict) else {}
        city_title = ((venue.get('city') or {}) if isinstance(venue.get('city'), dict) else {}).get('title') or ''
        area = ((venue.get('area') or {}) if isinstance(venue.get('area'), dict) else {}).get('title') or ''
        located = city_match(city_title + ' ' + area + ' ' + str(venue.get('title') or ''))
        if not located:
            continue
        city, lat, lon = located
        stamp = item.get('date')
        if not isinstance(stamp, (int, float)):
            continue
        moment = datetime.fromtimestamp(stamp, TZ)
        if not in_window(moment.isoformat()):
            continue
        url = item.get('pageUrl') or item.get('link') or ''
        if url and not url.startswith('http'):
            url = 'https://live.tickchak.co.il' + (url if url.startswith('/') else '/event/' + url)
        if not url and item.get('entityId'):
            url = 'https://live.tickchak.co.il/event/' + item['entityId']
        price = item.get('minPrice')
        events.append({
            'title': item['title'],
            'start': moment.isoformat(),
            'venue': venue.get('title') or '',
            'city': city_title or city,
            'lat': lat,
            'lon': lon,
            'url': url,
            'source': 'tickchak',
            'price': None if price in (None, '', 0, '0') else str(price),
        })
    return events


def source_go_out():
    status, html = get('https://go-out.co/')
    if status != 200:
        raise RuntimeError('HTTP %s' % status)
    if 'Attention Required' in html or 'Just a moment' in html:
        raise RuntimeError('blocked')
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
    if not match:
        raise RuntimeError('no public JSON')
    data = json.loads(match.group(1))
    home = data.get('props', {}).get('pageProps', {}).get('homePageData') or {}
    blobs = []
    for key in ('firstEvents',):
        if isinstance(home.get(key), list):
            blobs.extend(home[key])
    for key in ('nextWeek', 'spotLight'):
        block = home.get(key) or {}
        if isinstance(block, dict):
            blobs.extend(block.get('events') or block.get('Events') or [])
    events = []
    for item in blobs:
        if not isinstance(item, dict):
            continue
        title = item.get('Title') or item.get('title') or ''
        start = item.get('StartingDate') or item.get('FullDate')
        address = item.get('Adress') or item.get('EnglishAddress') or item.get('Address') or ''
        if not title or not start:
            continue
        if start.endswith('Z') is False and '+' not in start:
            start = start + '+02:00' if 'T' in start else start
        if not in_window(start):
            continue
        located = city_match(address + ' ' + title)
        if not located:
            continue
        city, lat, lon = located
        slug = item.get('Url') or item.get('_id') or ''
        events.append({
            'title': title,
            'start': start,
            'venue': address,
            'city': city,
            'lat': lat,
            'lon': lon,
            'url': 'https://go-out.co/event/' + str(slug),
            'source': 'go-out',
            'price': None,
        })
    return events


def source_eventbrite():
    status, html = get('https://www.eventbrite.com/d/israel--tel-aviv/parties/')
    if status != 200:
        raise RuntimeError('HTTP %s' % status)
    events = json_ld_events(html, 'eventbrite')
    if not events:
        raise RuntimeError('no JSON-LD events')
    return events


def source_tixwise():
    status, _html = get('https://www.tixwise.co.il/')
    if status != 200:
        raise RuntimeError('HTTP %s' % status)
    raise RuntimeError('no public JSON on the homepage')


def source_leaan():
    status, html = get('https://www.leaan.co.il/events', limit=700000, truncate=True)
    if status != 200:
        raise RuntimeError('HTTP %s' % status)
    events = json_ld_events(html, 'leaan')
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
    if match and not events:
        raise RuntimeError('public JSON had no event records in the first response')
    if not events:
        raise RuntimeError('no JSON-LD events')
    return events


SOURCES = (
    ('makore', source_makore),
    ('tickchak', source_tickchak),
    ('go-out', source_go_out),
    ('eventbrite', source_eventbrite),
    ('tixwise', source_tixwise),
    ('leaan', source_leaan),
)


def dedupe(events):
    kept = []
    seen = set()
    for event in sorted(events, key=lambda item: item.get('start') or ''):
        title = re.sub(r'\s+', ' ', (event.get('title') or '').strip())
        if len(title) < 2 or not event.get('url'):
            continue
        event['title'] = title
        key = (title.casefold(), (event.get('start') or '')[:16], (event.get('city') or '').casefold())
        if key in seen:
            continue
        seen.add(key)
        price = event.get('price')
        event['price'] = None if price in (None, '') else str(price)
        kept.append(event)
    return kept


def report_key(payload):
    slim = {
        'sources': payload.get('sources'),
        'events': payload.get('events'),
    }
    return json.dumps(slim, ensure_ascii=False, sort_keys=True)


def main():
    events = []
    sources = []
    for name, fn in SOURCES:
        try:
            found = fn()
            if isinstance(found, tuple):
                found, error = found
            else:
                error = None
            found = dedupe(found)
            events.extend(found)
            sources.append({'id': name, 'ok': error is None, 'count': len(found), 'error': error})
            print('%s %s' % (name, len(found) if error is None else 'FAIL ' + str(error)))
        except Exception as exc:
            sources.append({'id': name, 'ok': False, 'count': 0, 'error': '%s: %s' % (exc.__class__.__name__, exc)})
            print('%s FAIL %s' % (name, exc))
        time.sleep(0.6)
    events = dedupe(events)
    payload = {
        'updatedAt': now().isoformat(),
        'sources': sources,
        'events': events,
    }
    previous = None
    if OUT.exists():
        try:
            previous = json.loads(OUT.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            previous = None
    if previous and report_key(previous) == report_key(payload):
        print('unchanged %s events' % len(events))
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote %s events' % len(events))


if __name__ == '__main__':
    main()
