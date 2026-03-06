# TestNexus Crashlytics Alerts — Firebase Extension

A Firebase Extension that automatically forwards Crashlytics alerts from your Firebase project to the [TestNexus](https://testnexus.app) mobile app for real-time push notifications.

## What it does

When installed on your Firebase project, this extension listens for Crashlytics events and sends them to your TestNexus account. You receive instant push notifications on your phone whenever your app experiences crashes, ANRs, regressions, or other stability issues.

### Supported alert types

- **Fatal crashes** — New fatal issue detected
- **Non-fatal errors** — New non-fatal issue detected
- **ANRs** — Application Not Responding events
- **Regressions** — Previously resolved issues that have resurfaced
- **Velocity alerts** — Issues trending upward in crash rate
- **Stability digest** — Periodic summary of trending issues

## Setup

### Prerequisites

- A [TestNexus](https://testnexus.app) account
- Firebase project on the Blaze (pay-as-you-go) plan
- Firebase Crashlytics enabled on your project

### Installation

1. Open the TestNexus app and generate a connection token in **Connected Apps**
2. Install this extension on your Firebase project:

```bash
firebase ext:install . --project=YOUR_PROJECT_ID
```

3. Provide your connection token, app name, recipient emails, and which alert types to forward
4. Crashlytics events will now appear as push notifications in TestNexus

## Configuration

| Parameter | Description |
|-----------|-------------|
| **Connection Token** | Your `tnx_` token from the TestNexus app (stored as a secret) |
| **App Identifier** | A human-readable name for your app (shown in notifications) |
| **Recipient Emails** | Comma-separated emails of TestNexus users who should receive alerts |
| **Alert Types** | Which Crashlytics event types to forward |
| **Location** | Cloud Functions deployment region |
| **Backend URL** | TestNexus backend endpoint (default is production — only change for testing) |

## Project structure

```
├── extension.yaml          # Extension manifest (triggers, params, IAM roles)
├── PREINSTALL.md           # Shown before installation
├── POSTINSTALL.md          # Shown after installation
└── functions/
    ├── index.js            # 6 Crashlytics event handlers
    ├── lib/
    │   ├── httpClient.js   # HTTPS POST with exponential backoff retry
    │   └── payloadBuilder.js  # Normalizes event data to TestNexus schema
    └── test/
        ├── httpClient.test.js
        └── payloadBuilder.test.js
```

## Development

```bash
# Install dependencies
cd functions && npm install

# Run tests
npm test

# Lint
npm run lint

# Validate extension manifest
firebase ext:info .
```

## License

Apache-2.0
