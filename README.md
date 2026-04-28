# Task Tracker Board (Jira-style)

A lightweight web app that mimics a Jira-style board with:

- **To Do / In Progress / Review / Done** columns
- **Drag-and-drop** task movement between columns
- **Task creation** modal with title, description, assignee, and priority
- **Delete task** action
- **LocalStorage persistence** so tasks stay after reload

## Run

Because this is a static app, open `index.html` directly in your browser.

You can also run a local web server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
