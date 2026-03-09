Use this extension to get real-time push notifications on your phone when your app crashes.

When Crashlytics detects a crash, ANR, regression, or other stability issue in your app, this extension sends the alert to your TestNexus account — so you know about problems the moment they happen.

### Before you begin

1. Install the [TestNexus app](https://play.google.com/store/apps/details?id=us.twocan.testnexus) on your phone
2. Open **Connected Apps** and create a new connection
3. Enter your app name and recipient email(s), then copy the generated token (`tnx_...`)
4. Have the token ready — you'll need it during installation

### What you'll configure

| Parameter | What it does |
|-----------|-------------|
| **Connection Token(s)** | One or more `tnx_` tokens from the TestNexus app (comma-separated for multiple) |
| **App Identifier** | A human-readable name for your app shown in notifications |
| **Location** | Which region to deploy Cloud Functions in |

Alert types and recipients are managed in the TestNexus app, not in the extension configuration.

### Important: One instance per project

You only need **one** instance of this extension per Firebase project. Use comma-separated tokens to send alerts to multiple team members or TestNexus connections.

**Do NOT install multiple instances** — it wastes Cloud Function resources and complicates management.

### Billing

This extension uses Cloud Functions which may incur charges on the Blaze plan. Each Crashlytics event triggers one function invocation.
