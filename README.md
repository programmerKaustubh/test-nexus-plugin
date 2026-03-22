# TestNexus App Health Watcher — Firebase Extension

**Crash alerts, config change tracking, and performance monitoring — all from one install. Get push notifications on your phone in seconds.**

---

## Download

Download the latest extension package:

**[testnexus-app-health-watcher-v2.0.0.zip](https://github.com/programmerKaustubh/test-nexus-plugin/releases/latest/download/testnexus-app-health-watcher-v2.0.0.zip)**

---

## Quick Start (5 Minutes)

### Prerequisites

1. [Test Nexus app](https://play.google.com/store/apps/details?id=us.twocan.testnexus) installed on your Android device
2. A Firebase project on the **Blaze plan**
3. [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)

### Installation

1. **Generate a token** in the Test Nexus app → Connected Apps → tap **+**

2. **Download and unzip** the extension package from the link above

3. **Install dependencies and the extension:**
```bash
cd testnexus-app-health-watcher/functions && npm install && cd ..
firebase ext:install . --project=YOUR_PROJECT_ID
```

4. **Configure** when prompted — paste your token, set your app name, keep defaults for everything else

5. **Deploy:**
```bash
firebase deploy --only extensions --project=YOUR_PROJECT_ID
```

6. **Enable Eventarc Publishing API** (required for crash/config alerts):
   - Open: `https://console.cloud.google.com/apis/library/eventarcpublishing.googleapis.com?project=YOUR_PROJECT_ID`
   - Click **Enable**

### Optional: IAM Roles

| Role | What It Enables |
|------|----------------|
| **Remote Config Admin** | Config alerts with parameter diffs (old → new values) |
| **Monitoring Viewer** | Performance threshold breach alerts |

Grant these to the `ext-testnexus-crashlytics-*` service account in IAM.

---

## What You Get

| Service | Alert Types |
|---------|------------|
| **Crashlytics** | Fatal crash, Non-fatal, ANR, Regression, Velocity, Stability digest |
| **Remote Config** | Config published, Watchlist change, Config rollback |
| **Performance** | Threshold breach, Network anomaly, Regression, Custom trace, Daily digest |

**14 alert types** from a single extension install.

---

## Updating

1. Download the latest version from [Releases](https://github.com/programmerKaustubh/test-nexus-plugin/releases)
2. Unzip and install dependencies:
```bash
cd testnexus-app-health-watcher/functions && npm install && cd ..
```
3. Update and redeploy:
```bash
firebase ext:update testnexus-crashlytics-alerts . --project=YOUR_PROJECT_ID
firebase deploy --only extensions --project=YOUR_PROJECT_ID
```

---

## Adding Team Members

Use comma-separated tokens — no need to install multiple instances:
```bash
firebase ext:configure testnexus-crashlytics-alerts --project=YOUR_PROJECT_ID
```
When prompted, paste ALL tokens: `tnx_token1,tnx_token2,tnx_token3`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No crash notifications | Enable Eventarc Publishing API (see Step 6 above) |
| No performance alerts | Grant Monitoring Viewer role to extension service account |
| Config alerts missing values | Grant Remote Config Admin role to extension service account |
| "Build failed" during deploy | Run `cd functions && npm install` then redeploy |

For more help: **support@twocan.us**

---

## About

Built by [Twocan](https://twocan.us) · [Privacy Policy](https://twocan.us/privacy-policy) · [Google Play](https://play.google.com/store/apps/details?id=us.twocan.testnexus)

Copyright © 2026 Twocan Software LLC. All Rights Reserved.
