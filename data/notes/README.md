# MCP Notes Data Directory

This directory stores note files created through the MCP (Model Context Protocol) server.

## File Format
Notes are stored as `.md` files with the following format:

```
ID: note_1234567890_abc123def
TITLE: My Note Title
CREATED: 2025-07-31T10:30:00.000Z
---
This is the actual note content.
It can be multiple lines.
```

## File Naming
Files are named using the pattern: `{noteId}_{sanitized_title}.md`

Example: `note_1234567890_abc123def_my_note_title.md`

## Notes
- Files are automatically created when notes are added via MCP tools
- Directory is created automatically if it doesn't exist
- Each note has a unique ID and timestamp
