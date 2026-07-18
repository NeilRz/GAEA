<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project memory: the vault

`vault/` is an Obsidian vault and the canonical cross-session project memory. Protocol for every session:

1. **Start** by reading `vault/HOME.md`, then the most recent note in `vault/sessions/`.
2. **Record decisions** as they happen: one note per decision in `vault/decisions/` (template: `vault/templates/decision.md`).
3. **Before ending a work session**, create or update `vault/sessions/YYYY-MM-DD.md` (template: `vault/templates/session.md`): what changed, decisions made, open threads. Update the "Current state" section of `vault/HOME.md` if it moved.

Keep notes short and factual; link with `[[wikilinks]]`. Do not duplicate what git history or code already records — the vault is for decisions, constraints, positioning, and open threads.
