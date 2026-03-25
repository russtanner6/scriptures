#!/usr/bin/env python3
"""
Merge sentiment scores into chapter-sentiments.json.
Usage: python3 scripts/merge-sentiments.py < scored-data.json
Or:    python3 scripts/merge-sentiments.py path/to/scores.json

Matches by book name + chapter. Handles D&C name variants.
"""
import json, sys, os

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'chapter-sentiments.json')

def normalize_book(name):
    """Normalize book names for matching."""
    n = name.strip()
    if n in ("D&C", "Doctrine and Covenants", "Doctrine & Covenants"):
        return "Doctrine and Covenants"
    if n == "Wisdom of Solomon":
        return "Wisdom"
    return n

def merge(data, new_scores):
    """Merge new scores into data, matching by normalized book name + chapter."""
    # Build lookup index
    idx = {}
    for i, c in enumerate(data):
        key = f"{normalize_book(c['bookName'])}:{c['chapter']}"
        idx[key] = i

    replaced = 0
    not_found = 0
    for new in new_scores:
        book = normalize_book(new.get('book', ''))
        ch = new.get('chapter')
        if isinstance(ch, str):
            continue  # Skip OD1/OD2 etc
        key = f"{book}:{ch}"
        if key in idx:
            i = idx[key]
            data[i]['exaltation'] = int(new['exaltation'])
            data[i]['peace'] = int(new['peace'])
            data[i]['admonition'] = int(new['admonition'])
            data[i]['contrition'] = int(new['contrition'])
            data[i]['dominant'] = new['dominant']
            # Strip [cite: ...] from rationale
            rat = new.get('rationale', '')
            rat = rat.split('[cite:')[0].strip()
            data[i]['rationale'] = rat
            replaced += 1
        else:
            not_found += 1
            print(f"  WARNING: No match for {book} ch {ch}")

    return replaced, not_found

if __name__ == '__main__':
    data = json.load(open(DATA_FILE))

    if len(sys.argv) > 1:
        new_scores = json.load(open(sys.argv[1]))
    else:
        new_scores = json.load(sys.stdin)

    replaced, not_found = merge(data, new_scores)
    json.dump(data, open(DATA_FILE, 'w'), indent=2)

    pending = sum(1 for c in data if 'PENDING' in c.get('rationale', '') or 'error' in c.get('rationale', '').lower())
    print(f"Merged {replaced} chapters ({not_found} not found). {pending} still pending.")
