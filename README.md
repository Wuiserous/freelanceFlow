# FreelanceFlow

FreelanceFlow is a responsive, vanilla HTML/CSS/JavaScript dashboard for freelancers to manage projects, tasks, clients, time tracking, invoices, and finances in one place.

## How to use

1. Open `index.html` in a browser.
2. Use the sidebar to jump between the main sections.
3. Add a client, project, task, or invoice using the buttons on the dashboard.
4. Use the timer panel to track time for a selected task.
5. Use the search box to keep the screen focused on matching items.
6. Filter invoices with the `All`, `Paid`, and `Pending` buttons.

## What is included

- Minimal dashboard with three key summary cards
- Project list with small task previews
- Live time tracker with local logging
- Simple client list
- Invoice table with status filters
- One lightweight finance chart built in plain JavaScript canvas
- Plan card for the monetization idea
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
