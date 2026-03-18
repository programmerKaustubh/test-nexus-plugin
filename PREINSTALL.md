Use this extension to monitor your Firebase app's health and receive instant push
notifications in the Test Nexus Android app.

### What this extension monitors

- **Crashlytics** — Fatal crashes, ANRs, regressions, velocity alerts, stability digests
- **Remote Config** — Config publishes, rollbacks, and watchlist key changes
- **Performance** — API latency, screen render time, network success rate, custom traces

All three alert types are handled by a single extension install.

### Before you begin

1. Install the [Test Nexus app](https://play.google.com/store/apps/details?id=us.twocan.testnexus) from Google Play
2. Navigate to **Connected Apps** and generate a connection token
3. Enable the alert categories you want (Crashlytics, Performance, Config)
4. Have the token ready — you'll need it during installation

### What you'll configure

| Parameter | What it does |
|-----------|-------------|
| **Connection Token(s)** | One or more `tnx_` tokens from the Test Nexus app (comma-separated for teams) |
| **App Identifier** | A human-readable name for your app shown in notifications |
| **Location** | Which region to deploy Cloud Functions in |
| **Watchlist Keys** | Remote Config keys to watch for high-priority alerts |
| **Thresholds** | Latency, render time, and success rate limits for Performance alerts |

Alert types and recipients are managed in the Test Nexus app, not in the extension.

### Important: One instance per project

You only need **one** instance of this extension per Firebase project. Use comma-separated
tokens to send alerts to multiple team members.

**Do NOT install multiple instances** — it creates conflicts and wastes resources.

### Post-install setup

After installation, you'll need to:
1. **Enable the Eventarc Publishing API** — required for Crashlytics and Config alerts
2. **Grant IAM roles** (optional) — needed for Performance metrics and Config parameter diffs

See the README for detailed post-install instructions with direct console links.

### Billing

This extension uses Cloud Functions on the Blaze (pay-as-you-go) plan.
Typical cost is under $0.10/month. See the README for a detailed cost breakdown.
