# Baby Kick Tracker for Foram

## Goal
A mobile-first web app for Foram (28 weeks pregnant) to track fetal kicks using the count-to-10 method and view historical data on a calendar.

## Hosted on
GitHub Pages — static site, no backend required.

## Project Structure
| File | Purpose |
|------|---------|
| `index.html` | App shell: two-tab layout (Counter + Calendar), day-detail bottom sheet |
| `style.css` | Mobile-first styles, pink/lavender palette, large touch targets |
| `app.js` | All logic: localStorage storage, counter state machine, calendar rendering |
| `AGENT.md` | This file — project context |
| `.gitignore` | Excludes OS files |

## Data
Stored in `localStorage` key `baby_kicks` as a JSON array of session objects:
```json
{ "id", "date", "startTime", "endTime", "durationSeconds", "kickCount", "completed" }
```

## Key Decisions
- **localStorage** chosen over Firebase because Foram uses one device (her phone)
- **Count-to-10 mode**: tap until 10 kicks reached; timer auto-stops and saves
- **Incomplete sessions** (cancelled before 10 kicks) are saved with `completed: false`; shown with yellow indicator
- Calendar cells: green = completed session exists, yellow = incomplete only, white = no data
- SVG arc progress ring (r=70, circumference ≈ 439.82) shows kick progress

## How to run locally
Open `index.html` directly in a browser — no server needed.
