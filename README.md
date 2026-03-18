# Test Nexus App Health Watcher — Firebase Extension

**Crash alerts, config change tracking, and performance monitoring — all from one install. Get push notifications on your phone in seconds.**

Your app just crashed in production. A teammate pushed a Remote Config change that broke the checkout flow. Your API latency quietly doubled overnight. Without Test Nexus, you might not find out for hours. With this extension, you get a push notification on your phone within seconds for all three — from a single Firebase Extension install.

---

## The Problem

Firebase has great tools for detecting issues — Crashlytics, Remote Config, Performance Monitoring — but the default notification options are limited:

- **Email alerts** get buried in your inbox
- **Dashboard checks** require you to remember to look
- **No mobile alerts** — you're stuck waiting until you're at your desk
- **Three separate tools** means three places to check

If you're on a small team, a production crash, a bad config push, or a performance regression can go unnoticed for hours.

## The Solution

This extension bridges Firebase Crashlytics, Remote Config, and Performance Monitoring to the **Test Nexus** Android app. One install covers all three services. When something goes wrong, you get a push notification on your phone — no polling, no email delays.

**How it works:**

```
App Crashes          → Crashlytics Detects  → Extension Fires → Push Notification
Config Published     → Eventarc Event       → Extension Fires → Push Notification
Latency Spikes       → Scheduled Check      → Extension Fires → Push Notification
```

The entire flow takes seconds. Alert data is routed directly — nothing is stored on our servers.

---

## What You Get

- **Instant push notifications** for 14 alert types across 3 Firebase services
- **One install** — no need to manage separate extensions for each service
- **Team support** — send alerts to multiple team members from one extension install
- **Per-connection filtering** — choose which alert types each person receives
- **Privacy-first** — alert data is never stored; tokens are SHA-256 hashed server-side. **Administrator email addresses are masked in Cloud Logs** (e.g., `a***@example.com`) to comply with GDPR/CCPA.
- **Reliable delivery** — fault-isolated per-token delivery with automatic retry (3 attempts, exponential backoff)
- **Rate limiting** — 60 alerts/minute per connection to prevent notification floods

### Crashlytics Alerts (6 types)

| Alert Type | What Happened | When It Fires |
|------------|---------------|---------------|
| **Fatal Crash** | App was killed by an unhandled exception | First occurrence of a new crash signature |
| **Non-Fatal** | A handled exception was logged | First occurrence of a new non-fatal issue |
| **ANR** | App Not Responding (frozen UI) | App unresponsive for 5+ seconds |
| **Regression** | A previously-fixed crash returned | A closed Crashlytics issue reappears in a new app version |
| **Velocity** | A crash is trending | Crash rate is accelerating rapidly across your user base |
| **Stability Digest** | Daily summary | Periodic overview of your app's top trending issues |

### Remote Config Alerts (3 types)

| Alert Type | What Happened | When It Fires |
|------------|---------------|---------------|
| **Config Published** | Someone published a new config version | Every config publish (or only watchlist keys, depending on settings) |
| **Watchlist Change** | A high-priority config key changed | A key you specified in `WATCHLIST_KEYS` was modified |
| **Config Rollback** | Config was rolled back to a previous version | Version number decreased (someone reverted a change) |

### Performance Alerts (5 types)

| Alert Type | What Happened | When It Fires |
|------------|---------------|---------------|
| **Threshold Breach** | A metric exceeded your configured threshold | API latency, screen render time, or success rate crosses the line |
| **Network Anomaly** | Network success rate dropped | Success rate falls below `SUCCESS_RATE_THRESHOLD_PCT` |
| **Regression** | A metric significantly worsened vs. its baseline | Sustained degradation detected |
| **Custom Trace** | A custom trace exceeded its threshold | A trace listed in `CUSTOM_TRACE_THRESHOLDS` crossed its limit |
| **Daily Digest** | Summary of performance health | Periodic overview of your app's performance metrics |

---

## Prerequisites

Before you start, make sure you have:

1. **Test Nexus app** on your Android device — [Download from Google Play](https://play.google.com/store/apps/details?id=us.twocan.testnexus)
2. **A Test Nexus account** — sign up in the app (free)
3. **A Firebase project** on the **Blaze plan** — required for all Firebase Extensions (actual cost is minimal — see [Billing](#billing))
4. **Firebase services set up** — at least one of: Crashlytics enabled, Remote Config in use, or Performance Monitoring integrated
5. **Git** installed — needed to clone this repository
6. **Firebase CLI** installed — run `npm install -g firebase-tools` if you haven't already
7. **Logged in** to Firebase CLI — run `firebase login`

---

## Installation (5 Minutes)

### Step 1: Generate a Connection Token in Test Nexus

1. Open the **Test Nexus** app on your phone
2. Go to **Connected Apps** (from the main menu)
3. Tap the **+** button to create a new connection
4. Enter your **App Identifier** (e.g., "My App Production")
5. Optionally add other team members' emails to also receive alerts
6. Tap **Generate Token**
7. **Copy the token** — it starts with `tnx_` and you'll only see it once

> The token screen in the app includes a complete setup guide with copy-able commands. You can follow along from there too.

### Step 2: Install the Extension

Open a terminal and clone the extension repository:

```bash
git clone https://github.com/programmerKaustubh/test-nexus-plugin.git
```

Install the function dependencies, then install the extension:

```bash
cd test-nexus-plugin/functions && npm install && cd ../..
firebase ext:install ./test-nexus-plugin --project=YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with your actual Firebase project ID (find it in [Firebase Console](https://console.firebase.google.com) → Project Settings).

When prompted for an **instance name**, use lowercase letters, numbers, and hyphens only (e.g., `testnexus-crashlytics-alerts`). Spaces and uppercase letters are not allowed.

> **Note:** Firebase `ext:install` requires a local path or a published extension ID — it does not accept GitHub URLs directly. You must clone or download the repository first.
>
> **Important:** The cloned repository includes a `firebase.json` file. If you already have a `firebase.json` in your working directory, run the install command from a separate directory to avoid conflicts.

### Step 3: Configure the Extension

The CLI will prompt you for 13 parameters. Here's what each one means:

| Parameter | Default | What to Enter |
|-----------|---------|---------------|
| **Connection Token(s)** | (required) | Paste the `tnx_...` token you copied in Step 1. For multiple team members, comma-separate their tokens. |
| **App Identifier** | (required) | A friendly name like `My App Production` or `AwesomeApp Staging`. 1-100 characters. |
| **Cloud Functions Location** | us-central1 | Region closest to your Firebase project. Options: `us-central1`, `us-east1`, `us-west1`, `europe-west1`, `asia-northeast1`. |
| **Watchlist Keys** | (empty) | Comma-separated Remote Config keys for high-priority alerts. Leave empty to skip. |
| **Notify on All Config Changes** | Yes | Alert on every config publish, or only watchlist key changes. |
| **Include Config Values** | No | Include old/new parameter values in config alerts. **Only enable if your config values contain no secrets.** |
| **Performance Lookback Window** | 5 min | How far back to query performance data each check cycle. 5 for real-time, 15 for stable. |
| **API Latency Threshold** | 3000 ms | Alert when network request p95 latency exceeds this value. |
| **Screen Render Threshold** | 700 ms | Alert when screen render time exceeds this value. |
| **Network Success Rate** | 95% | Alert when network success rate drops below this percentage. |
| **Custom Trace Thresholds** | {} | JSON object mapping trace names to ms thresholds. Example: `{"checkout_flow": 5000}` |
| **Dedup Window** | 15 min | Minimum time between repeated performance alerts for the same metric. |
| **Backend URL** | (preset) | **Press Enter to keep the default.** Do not change this unless directed by support. |

> **Warning: Do not run `ext:install` multiple times.** Each run creates a new extension instance. If you need to change your configuration after installing, use `firebase ext:configure` instead (see [Managing Tokens](#viewing-current-tokens)). If you accidentally ran `ext:install` more than once, see [Cleaning Up Duplicate Instances](#cleaning-up-duplicate-instances).

### Step 4: Deploy

After configuration, deploy the extension to activate it:

```bash
firebase deploy --only extensions --project=YOUR_PROJECT_ID
```

### Option B: Quick Install (Non-Interactive)

If you have your token ready and want to install without being prompted for parameters, use this comprehensive command:

```bash
firebase ext:install testnexus/app-health-watcher \
  --params=CONNECTION_TOKEN=YOUR_TOKEN,APP_IDENTIFIER="My Production App",LOCATION=us-central1,PERF_CHECK_INTERVAL=5,LATENCY_THRESHOLD_MS=3000,SCREEN_RENDER_THRESHOLD_MS=700,SUCCESS_RATE_THRESHOLD_PCT=95,NOTIFY_ALL_CONFIG_CHANGES=true,INCLUDE_VALUES=false,WATCHLIST_KEYS="",CUSTOM_TRACE_THRESHOLDS="{}",DEDUP_WINDOW_MINUTES=15,TESTNEXUS_API_URL="https://us-central1-test-nexus-debug-52895.cloudfunctions.net" \
  --project=YOUR_PROJECT_ID
```

---

### Step 5: Post-Install Setup (Important)

After deploying, there are up to 3 additional steps depending on which alert types you need. **Step A is required for most alerts to work at all.**

---

#### Step A: Enable the Eventarc Publishing API (Required)

**Without this, Firebase services cannot publish events to your extension. Crashlytics and Config alerts will never arrive.**

1. Open this link (replace `YOUR_PROJECT_ID` with your project ID):
   ```
   https://console.cloud.google.com/apis/library/eventarcpublishing.googleapis.com?project=YOUR_PROJECT_ID
   ```
2. Click **Enable**
3. Wait 1-2 minutes for propagation

This is a one-time setup. After enabling, trigger a test crash or publish a config change to verify alerts arrive.

> **How to tell if this is missing:** You'll see 0 invocations on your Crashlytics/Config triggers in Cloud Functions, even though crashes or config changes are happening.

---

#### Step B: Grant Remote Config Admin Role (Optional — for Config Parameter Diffs)

Without this role, Remote Config alerts still work but only show the version number and who made the change. With this role, alerts include the actual parameter diff — which keys changed and their old/new values.

1. Go to **IAM & Admin → Service Accounts** in Google Cloud Console:
   ```
   https://console.cloud.google.com/iam-admin/serviceaccounts?project=YOUR_PROJECT_ID
   ```
2. Find the service account starting with `ext-testnexus-crashlytics-` and copy its email address
3. Go to **IAM & Admin → IAM**:
   ```
   https://console.cloud.google.com/iam-admin/iam?project=YOUR_PROJECT_ID
   ```
4. Click **Grant Access**
5. Paste the service account email in the "New principals" field
6. Select role: **Firebase Remote Config Admin**
7. Click **Save**

> **Skip this** if you don't care about seeing which specific parameters changed, or if you don't use Remote Config.

---

#### Step C: Grant Monitoring Viewer Role (Optional — for Performance Alerts)

Without this role, the performance check function runs every 5 minutes but all API calls fail silently — no performance alerts will ever fire.

1. Follow the same steps as Step B, but in step 6 select role: **Monitoring Viewer**

> You can add both roles (Remote Config Admin and Monitoring Viewer) to the same service account at once.

> **Skip this** if you don't use Firebase Performance Monitoring.

---

### What Works Without Extra IAM Roles

| Feature | Without Extra Setup | With IAM Role |
|---------|-------------------|---------------|
| Crash/ANR/Regression alerts | Works (after enabling Eventarc Publishing API) | N/A |
| Config change alerts (version, who, when) | Works (after enabling Eventarc Publishing API) | N/A |
| Config parameter diffs (old/new values) | Version number only | Full diff with values (needs Remote Config Admin) |
| Performance threshold alerts | Does not work | Works (needs Monitoring Viewer) |

---

## Crashlytics Alerts

Crashlytics alerts fire automatically via Eventarc triggers when Crashlytics detects a stability issue. There is nothing to configure beyond the initial install and enabling the Eventarc Publishing API.

**Data forwarded per crash alert:**
- Issue title (crash signature, e.g., "NullPointerException in MainActivity.kt")
- Issue subtitle (file and line number)
- App version affected
- Bundle ID (package name)
- Crash count (affected users/sessions)
- Alert type (fatal, non-fatal, ANR, regression, velocity, or stability digest)

No PII, no full stack traces, no user data.

---

## Remote Config Alerts

Config alerts fire when someone publishes, modifies, or rolls back a Remote Config template.

### How Config Alerts Work

When a Remote Config template is updated, the extension:
1. Detects the update event via Eventarc
2. Fetches the current and previous template versions (if the service account has permission)
3. Computes a diff of changed parameters
4. Sends a notification with the change details

### Watchlist Keys

Use the `WATCHLIST_KEYS` parameter to flag high-priority config keys. Changes to these keys are tagged as watchlist alerts in your notifications, making them stand out.

**Syntax:** Comma-separated key names, no spaces around commas.

```
feature_kill_switch,maintenance_mode,api_base_url,force_update_version
```

### Notify All vs. Watchlist Only

| Setting | Behavior |
|---------|----------|
| **Notify All = Yes** (default) | You get a notification for every config publish. Watchlist keys are highlighted. |
| **Notify All = No** | You only get notifications when a watchlist key changes. Other config changes are silent. |

### Including Parameter Values

By default, config alerts only show key names (e.g., "feature_flag changed"). If you enable `INCLUDE_VALUES`, alerts show old and new values:

```
feature_flag: false → true
api_timeout: 5000 → 10000
```

**Security warning:** Only enable this if your Remote Config values do not contain API keys, secrets, or sensitive data. Values are transmitted over HTTPS but will appear in push notifications on your device.

---

## Performance Alerts

Performance alerts are different from Crashlytics and Config — they use a **scheduled function** that runs every 5 minutes, queries the Firebase Performance REST API, and checks metrics against your configured thresholds.

### Thresholds

| Metric | Parameter | Default | What It Checks |
|--------|-----------|---------|----------------|
| API latency | `LATENCY_THRESHOLD_MS` | 3000 ms | p95 latency of network requests |
| Screen render | `SCREEN_RENDER_THRESHOLD_MS` | 700 ms | Screen rendering time |
| Network success rate | `SUCCESS_RATE_THRESHOLD_PCT` | 95% | Percentage of successful network requests |

### Custom Trace Thresholds

For custom performance traces in your app, define thresholds as a JSON object:

```json
{"checkout_flow": 5000, "image_upload": 10000, "search_query": 2000}
```

Each key is a trace name (must match exactly what you instrument in your app), and the value is the duration threshold in milliseconds.

### Dedup Window

To prevent alert fatigue, the extension suppresses repeat alerts for the same metric within the dedup window (default: 15 minutes). If API latency stays above 3000ms, you get one alert, then silence for 15 minutes, then another alert if it's still breaching.

### Lookback Window

The lookback window controls how much data each check cycle analyzes:

| Setting | Best For |
|---------|----------|
| **5 minutes** (default) | Real-time alerting. You'll know about spikes quickly, but may get alerts from brief transients. |
| **10 minutes** | Balanced. Smooths out brief spikes while still catching sustained issues. |
| **15 minutes** | Stable. Only alerts on sustained degradation, reduces noise. |

---

## Multiple Team Members / Multiple Tokens

**One extension instance per Firebase project.** You don't need to install the extension multiple times. Instead, use comma-separated tokens:

```
tnx_token_for_alice,tnx_token_for_bob,tnx_token_for_charlie
```

Each token delivers independently — if one fails (e.g., revoked), the others still work. Each team member can configure their own alert type preferences in the Test Nexus app.

### Viewing Current Tokens

Before adding a new token, you need to know which tokens are already configured. Run the helper script from your project root:

```bash
node show-tokens.js
```

This shows all configured extension instances and their token details. If tokens are stored in Secret Manager (default), the script shows the `gcloud` command to retrieve them:

```bash
gcloud secrets versions access latest --secret=ext-testnexus-crashlytics-alerts-CONNECTION_TOKEN
```

You can also view tokens in the Google Cloud Console under **Secret Manager**.

### Adding a New Team Member

1. **See current tokens** — run `node show-tokens.js` or the `gcloud` command above
2. **Copy the existing tokens** — you'll need these to avoid losing them
3. **Reconfigure** — run:

```bash
firebase ext:configure testnexus-crashlytics-alerts --project=YOUR_PROJECT_ID
```

4. When prompted for Connection Token(s), paste ALL tokens — old ones plus the new one:

```
tnx_existing_token_1,tnx_existing_token_2,tnx_NEW_TEAM_MEMBER_TOKEN
```

5. Press Enter for all other prompts to keep existing settings
6. **Deploy:**

```bash
firebase deploy --only extensions --project=YOUR_PROJECT_ID
```

### Removing a Team Member

Follow the same steps, but leave out the token you want to remove from the comma-separated list.

---

## Managing Connections

Open the Test Nexus app → **Connected Apps** to:

- View all active connections and their status
- **Edit recipients** — add or remove team members per connection
- **Configure alert types** — choose which alert types trigger notifications (crash, config, performance)
- **Revoke a token** — alerts stop immediately; the extension skips that token
- **View audit trail** — see who created the connection and when

> **Note:** Team members you add as recipients must have the Test Nexus app installed and be signed in with the same email address. If a recipient isn't receiving notifications, ask them to verify they're signed in to Test Nexus with the email you used when adding them.

---

## Updating to a New Version

Pull the latest changes (or re-clone the repository):

```bash
cd test-nexus-plugin
git pull
```

Then update the extension from the local directory:

```bash
firebase ext:update testnexus-crashlytics-alerts ./test-nexus-plugin --project=YOUR_PROJECT_ID
```

And redeploy:

```bash
firebase deploy --only extensions --project=YOUR_PROJECT_ID
```

> After updating, verify that your IAM roles (Remote Config Admin, Monitoring Viewer) are still in place. Extension updates should not affect IAM, but it's worth confirming.

## Uninstalling

```bash
firebase ext:uninstall testnexus-crashlytics-alerts --project=YOUR_PROJECT_ID
```

This removes the extension's Cloud Functions and Eventarc triggers. Secrets in Secret Manager may remain — see [Cleaning Up](#cleaning-up) for full removal.

---

## Troubleshooting

### Common Issues

| Problem | Likely Cause | How to Fix |
|---------|-------------|------------|
| No crash notifications after install | Eventarc Publishing API not enabled | Enable at `console.cloud.google.com/apis/library/eventarcpublishing.googleapis.com` — this is the #1 missed step |
| Extension deployed but 0 invocations on crash/config triggers | Eventarc Publishing API not enabled | Enable the API, then trigger a NEW crash or config change |
| Crashlytics crashes not appearing in Firebase dashboard | App missing INTERNET permission or debug build has Crashlytics collection disabled | Add `<uses-permission android:name="android.permission.INTERNET"/>` and set `firebase_crashlytics_collection_enabled=true` in manifest |
| Config notifications arrive but no parameter values shown | Extension service account lacks Remote Config Admin role | Grant the role in IAM (see [Step B](#step-b-grant-remote-config-admin-role-optional--for-config-parameter-diffs)) |
| Performance function runs but "Failed to fetch metrics" in logs | Extension service account lacks Monitoring Viewer role | Grant the role in IAM (see [Step C](#step-c-grant-monitoring-viewer-role-optional--for-performance-alerts)) |
| "failed to update IAM roles" during deploy | `cloudconfig.admin` role not auto-grantable by extensions | Grant Remote Config Admin manually after install — this is expected |
| No notifications, extension is deployed | Crashlytics hasn't detected a new issue yet | Trigger a test crash and wait 1-2 minutes for Crashlytics to process |
| Only some team members get alerts | Their token isn't in the extension config | Add their token to the comma-separated list and redeploy |
| Notifications arrive late | FCM delivery delay or device battery settings | Check device connectivity; exempt Test Nexus from battery optimization |
| Config alert shows "v4 to v0" wrong versions | versionNumber stored as string not number | Fixed in v2.0.0 — update to the latest version |
| "firebase-settings.crashlytics.com" hostname not resolved | Device has no internet | Check device WiFi/data connection |
| Old and new extension instances conflict | Orphaned secrets in Secret Manager | Delete old secrets, uninstall old instances, fresh install |
| "No params file found" during deploy | `firebase.json` references an old or mismatched instance name | Clean `firebase.json` to only have the current instance (see [Cleaning Up Duplicate Instances](#cleaning-up-duplicate-instances)) |
| Duplicate extension instances | Ran `ext:install` multiple times | Keep one entry in `firebase.json`, uninstall extras |
| "Eventarc Service Agent" permission error during deploy | Blaze plan was just enabled or project is new | Wait 2-3 minutes for permissions to propagate, then redeploy |
| "Build failed" / RESOURCE_ERROR during deploy | Function dependencies not installed | Run `cd functions && npm install && cd ..` then redeploy |
| Alerts not arriving but no errors in logs | Backend URL was truncated or mistyped during setup | Reconfigure and **press Enter to accept the default Backend URL** — do not type it manually |

### Error Codes in Cloud Functions Logs

Check your extension logs at [Firebase Console → Functions → Logs](https://console.firebase.google.com/project/_/functions/logs):

| Error | What It Means | What to Do |
|-------|---------------|------------|
| **"Token not found" (401)** | The token was mistyped or doesn't exist in Test Nexus | Copy the token again from the Test Nexus app and reconfigure |
| **"Token is not active" (401)** | The connection was revoked in Test Nexus | Create a new connection in Test Nexus → Connected Apps, then reconfigure with the new token |
| **"Invalid token format" (401)** | Token is malformed — missing characters or extra spaces | Token must be `tnx_` followed by exactly 32 hex characters (e.g., `tnx_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`). Check for typos or trailing spaces. |
| **"Rate limit exceeded" (429)** | More than 60 alerts/minute for this connection | Normal during mass-crash events. Alerts resume automatically after 60 seconds. No action needed. |
| **"Method not allowed" (405)** | Extension is misconfigured or pointing to the wrong endpoint | Reconfigure and redeploy the extension |
| **"Failed to fetch metrics"** | Performance API call failed — missing Monitoring Viewer role | Grant Monitoring Viewer role to the extension service account |
| **"Failed to fetch Remote Config template"** | Config diff failed — missing Remote Config Admin role | Grant Remote Config Admin role to the extension service account |
| **Server error (500)** | Temporary backend issue | The extension retries automatically (3 attempts with exponential backoff). If persistent, check [twocan.us](https://twocan.us) for status updates. |

### Still Not Receiving Notifications?

Run through this checklist:

1. **Is the Eventarc Publishing API enabled?** This is the #1 cause of silent failures. Check at: `console.cloud.google.com/apis/library/eventarcpublishing.googleapis.com`
2. **Is the token still active?** Open Test Nexus → Connected Apps → check the connection status shows "Active"
3. **Is the relevant Firebase service set up?**
   - Crashlytics: Verify crash data appears in [Firebase Console → Crashlytics](https://console.firebase.google.com/project/_/crashlytics)
   - Remote Config: Verify you have at least one published template
   - Performance: Verify you see data in [Firebase Console → Performance](https://console.firebase.google.com/project/_/performance)
4. **Is the extension deployed?** Run `firebase ext:list --project=YOUR_PROJECT_ID` to confirm it's listed
5. **Do Eventarc triggers exist?** Check Google Cloud Console → Eventarc → Triggers. You should see triggers for Crashlytics (6 triggers) and Remote Config (1 trigger). If there are none, the extension was deployed without `ext:install` — uninstall and reinstall properly.
6. **Does the service account have the right roles?** Check IAM for the `ext-testnexus-crashlytics-` service account — it needs Remote Config Admin for config diffs and Monitoring Viewer for performance alerts.
7. **Any errors in logs?** Check [Cloud Functions logs](https://console.firebase.google.com/project/_/functions/logs) for the error codes listed above
8. **Are notifications enabled on your device?** Android Settings → Apps → Test Nexus → Notifications
9. **Battery optimization?** Exempt Test Nexus from battery optimization (Android Settings → Apps → Test Nexus → Battery → Unrestricted)

---

## Cleaning Up

### Cleaning Up Duplicate Instances

If you accidentally ran `firebase ext:install` multiple times, you'll have duplicate entries in `firebase.json` and extra `.env` files in the `extensions/` folder. This can cause "No params file found" errors during deploy. To fix:

1. Open `firebase.json` and look at the `"extensions"` section. You'll see multiple entries:
   ```json
   {
     "extensions": {
       "testnexus-crashlytics-alerts": ".",
       "testnexus-crashlytics-alerts-abcd": "."
     }
   }
   ```

2. Decide which instance to keep (check the matching `.env` files in `extensions/` to see which has the correct token and settings).

3. Remove the extra entries from `firebase.json` so only one remains:
   ```json
   {
     "extensions": {
       "testnexus-crashlytics-alerts": "."
     }
   }
   ```

4. Delete the extra `.env` files from the `extensions/` folder that no longer match.

5. Uninstall the orphaned instances from Firebase:
   ```bash
   firebase ext:uninstall <instance-name-to-remove> --project=YOUR_PROJECT_ID
   ```

6. Redeploy:
   ```bash
   firebase deploy --only extensions --project=YOUR_PROJECT_ID
   ```

### Cleaning Up Secrets

When you uninstall the extension, secrets may remain in Secret Manager. To fully clean up:

1. Go to [Google Cloud Console → Secret Manager](https://console.cloud.google.com/security/secret-manager)
2. Look for secrets starting with `ext-testnexus-crashlytics-`
3. Delete any that belong to uninstalled instances

### Cleaning Up Service Accounts

The extension creates a service account during install. After uninstalling:

1. Go to [IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Look for accounts starting with `ext-testnexus-crashlytics-`
3. Delete any that belong to uninstalled instances
4. Also remove any IAM role bindings you added manually (Remote Config Admin, Monitoring Viewer)

---

## Billing

This extension runs on **your** Firebase project under your Blaze plan. Estimated costs:

| Resource | Usage | Cost |
|----------|-------|------|
| Cloud Functions invocations | ~10,000/month (crash triggers + config triggers + performance checks) | Free tier (2M/month included) |
| Performance API calls | Included in Firebase Performance tier | Free |
| Secret Manager | 1 secret (connection token) | ~$0.03/month |
| Outbound networking | HTTP requests to Test Nexus backend | Negligible |
| **Total** | | **~$0.05/month** |

The performance check runs every 5 minutes (8,640 invocations/month) and the crash/config triggers fire only when events occur. Most projects will stay well within the free tier.

You can monitor usage in your [Firebase Console → Usage & Billing](https://console.firebase.google.com/project/_/usage).

Test Nexus does not charge for receiving and forwarding alerts. FCM push notifications are free.

---

## Privacy & Security

- **No alert data stored** — alerts are forwarded via FCM push notifications, never persisted on our servers
- **Tokens are hashed** — SHA-256 hashing; plain tokens are never stored server-side
- **HTTPS only** — all communication uses TLS encryption
- **Config values off by default** — `INCLUDE_VALUES` defaults to "No", so Remote Config values are not transmitted unless you explicitly opt in
- **No PII in logs** — the extension does not log sensitive data
- **Open source** — inspect every line of code in this repository

### Data Flow

```
Crashlytics Event  ─┐
Config Event       ─┤─→ This Extension ─→ Test Nexus Backend ─→ FCM ─→ Your Phone
Performance Check  ─┘
```

### What Data is Forwarded?

**Crashlytics alerts:** Issue title (crash signature), file/line number, app version, bundle ID, crash count, alert type. No PII, no full stack traces, no user data.

**Config alerts:** Version number, who published, timestamp, changed key names. Parameter values only if `INCLUDE_VALUES` is enabled.

**Performance alerts:** Metric name, current value, threshold value, alert type. No user-level performance data.

This metadata is used solely to construct push notifications. It passes through to FCM and is delivered to your device — it is not stored on our servers.

---

## About

Built by [TwoCan](https://twocan.us). Test Nexus is a developer tools app that helps Android developers test, debug, and monitor their apps more efficiently.

- **Website:** [twocan.us](https://twocan.us)
- **Privacy Policy:** [twocan.us/privacy-policy](https://twocan.us/privacy-policy)
- **Test Nexus on Google Play:** [Download](https://play.google.com/store/apps/details?id=us.twocan.testnexus)
- **Issues & Feedback:** [GitHub Issues](https://github.com/programmerKaustubh/test-nexus-plugin/issues)

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
