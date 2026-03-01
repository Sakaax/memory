# Privacy Policy — memory browser extension

**Last updated: 2026-03-01**

## Summary

The memory extension does not collect, store, transmit, or share any personal data.

## Data collection

This extension collects **no data whatsoever**.

- No analytics
- No telemetry
- No crash reporting
- No usage tracking
- No personal information

## Network requests

The extension makes HTTP requests **exclusively to `http://localhost:7711`** — a local server running on your own machine. No requests are made to any external server or third-party service.

## Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Detect the current AI chat page to inject context |
| `tabs` | Open the memory UI tab when requested |
| `storage` | Not currently used (reserved for future settings) |
| `host_permissions` (localhost:7711) | Fetch your local memory context |
| `host_permissions` (AI sites) | Inject a button and context into supported chat interfaces |

## Third parties

This extension shares no data with any third party.

## Contact

Issues and questions: https://github.com/Sakaax/memory/issues
