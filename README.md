# FreelanceFlow

FreelanceFlow is a responsive, vanilla HTML/CSS/JavaScript dashboard for freelancers to manage projects, tasks, clients, time tracking, invoices, and financial insights in one place.

## What is included

- Dashboard-style overview with summary metrics
- Project and task management cards
- Live time tracker with local logging
- Client CRM cards with contact history
- Invoice table with status filters
- Financial charts built in plain JavaScript canvas
- Subscription tier section for monetization strategy
- Responsive layout for desktop, tablet, and mobile
- Local persistence through `localStorage`

## How to run

Open `index.html` in a browser, or serve the folder locally:

```bash
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

## Notes for a full-stack version

This build is frontend-only, but the interface is structured so it can connect cleanly to a Node.js backend later. A real API could expose endpoints like:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/clients`
- `POST /api/invoices`
- `POST /api/time-entries`

That makes the project easy to extend into a student capstone with backend and database support.
