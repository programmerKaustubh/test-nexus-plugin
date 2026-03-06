Use this extension to automatically forward Firebase Crashlytics alerts to TestNexus.

When a crash, ANR, regression, or other Crashlytics event is detected in your app, this extension sends the alert details to your TestNexus account so you can receive push notifications and track issues on your mobile device.

### Prerequisites

- A TestNexus account with an active connection token
- Firebase Crashlytics enabled on your project

### How it works

1. Generate a connection token in the TestNexus app (Connected Apps section)
2. Install this extension and provide your token
3. Crashlytics events are automatically forwarded to TestNexus
4. Receive push notifications on your device

### Billing

This extension uses Cloud Functions which may incur charges on the Blaze plan.
