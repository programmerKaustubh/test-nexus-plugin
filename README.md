# TestNexus Crashlytics Alerts — Firebase Extension

**Get instant crash notifications on your phone. Fix issues before your users even notice.**

Your app just crashed in production. Without TestNexus, you might not find out for hours — buried in an email digest or a Crashlytics dashboard you forgot to check. With this extension, you get a push notification on your phone within seconds. Tap it, see the crash details, and start fixing.

---

## The Problem

Firebase Crashlytics is great at *detecting* crashes. But the default notification options are limited:

- **Email alerts** get buried in your inbox
- **Dashboard checks** require you to remember to look
- **No mobile alerts** — you're stuck waiting until you're at your desk

If you're on a small team, a production crash can go unnoticed for hours.

## The Solution

This extension bridges Firebase Crashlytics to the **TestNexus** Android app. When Crashlytics detects a stability issue, this extension forwards it instantly as a push notification to your phone — no polling, no email delays.

**How it works:**

```
Your App Crashes → Crashlytics Detects It → This Extension Fires → Push Notification on Your Phone
```

The entire flow takes seconds. Crash data is routed directly — nothing is stored on our servers.

---

## What You Get

- **Instant push notifications** for 6 Crashlytics event types (see table below)
- **Team support** — send alerts to multiple team members from one extension install
- **Per-connection filtering** — choose which alert types each person receives
- **Privacy-first** — crash data is never stored; tokens are SHA-256 hashed server-side
- **Reliable delivery** — fault-isolated per-token delivery with automatic retry (3 attempts, exponential backoff)
- **Rate limiting** — 60 alerts/minute per connection to prevent notification floods

### Supported Alert Types

| Alert Type | What Happened | When It Fires |
|------------|---------------|---------------|
| **Fatal Crash** | App was killed by an unhandled exception | First occurrence of a new crash signature |
| **Non-Fatal** | A handled exception was logged | First occurrence of a new non-fatal issue |
| **ANR** | App Not Responding (frozen UI) | App unresponsive for 5+ seconds |
| **Regression** | A previously-fixed crash returned | A closed Crashlytics issue reappears in a new app version |
| **Velocity** | A crash is trending | Crash rate is accelerating rapidly across your user base |
| **Stability Digest** | Daily summary | Periodic overview of your app's top trending issues |

---

## Prerequisites

Before you start, make sure you have:

1. **TestNexus app** on your Android device — [Download from Google Play](https://play.google.com/store/apps/details?id=us.twocan.testnexus)
2. **A TestNexus account** — sign up in the app (free)
3. **A Firebase project** with **Crashlytics enabled** and receiving crash data
4. **Firebase Blaze plan** — required for all Firebase Extensions (you'll only be charged for actual function invocations, which are minimal — see [Billing](#billing) below)
5. **Git** installed — needed to clone this repository
6. **Firebase CLI** installed — run `npm install -g firebase-tools` if you haven't already
7. **Logged in** to Firebase CLI — run `firebase login`

---

## Installation (5 Minutes)

### Step 1: Generate a Connection Token in TestNexus

1. Open the **TestNexus** app on your phone
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

The CLI will prompt you for 4 parameters. Here's what each one means and what to enter:

| Parameter | What It Means | What to Enter |
|-----------|---------------|---------------|
| **Connection Token(s)** | Links this extension to your TestNexus account. This is how we know who to notify when a crash happens. | Paste the `tnx_...` token you copied in Step 1. For multiple team members, comma-separate their tokens (e.g., `tnx_abc...,tnx_xyz...`). |
| **App Identifier** | A friendly name that appears in your crash notifications so you can tell which app crashed. | Something like `My App Production` or `AwesomeApp Staging`. 1-100 characters. |
| **Cloud Functions Location** | The data center region where the extension's Cloud Functions will run. Pick the one closest to your Firebase project for lowest latency. | `us-central1` (Iowa) is recommended. Other options: `us-east1` (South Carolina), `us-west1` (Oregon), `europe-west1` (Belgium), `asia-northeast1` (Tokyo). |
| **Backend URL** | The TestNexus server endpoint that receives forwarded alerts. | **Press Enter to keep the default.** Do not type or paste a URL here unless you're running a self-hosted TestNexus backend (you almost certainly aren't). Manually entering the URL risks truncation or typos that will silently break alert delivery. |

> **Warning: Do not run `ext:install` multiple times.** Each run creates a new extension instance with its own entry in `firebase.json` and a new `.env` file in the `extensions/` folder. If you need to change your configuration after installing, use `firebase ext:configure` instead (see [Multiple Team Members](#multiple-team-members--multiple-tokens)). If you accidentally ran `ext:install` more than once, see [Troubleshooting](#troubleshooting) for how to clean up duplicate instances.

### Step 4: Deploy

After configuration, deploy the extension to activate it:

```bash
firebase deploy --only extensions --project=YOUR_PROJECT_ID
```

### Step 5: Verify It Works

1. Trigger a test crash in your app (or wait for a real one)
2. Crashlytics processes the event (usually 1-2 minutes)
3. Check your phone — you should see a TestNexus notification

---

## Multiple Team Members / Multiple Tokens

**One extension instance per Firebase project.** You don't need to install the extension multiple times. Instead, use comma-separated tokens:

```
tnx_token_for_alice,tnx_token_for_bob,tnx_token_for_charlie
```

Each token delivers independently — if one fails (e.g., revoked), the others still work. Each team member can configure their own alert type preferences in the TestNexus app.

To add a new team member later, just reconfigure the extension and add their token to the list:

```bash
firebase ext:configure testnexus-crashlytics-alerts --project=YOUR_PROJECT_ID
```

When prompted for Connection Token(s), paste the updated comma-separated list and press Enter for all other prompts to keep existing settings. Then redeploy:

```bash
firebase deploy --only extensions --project=YOUR_PROJECT_ID
```

---

## Managing Connections

Open the TestNexus app → **Connected Apps** to:

- View all active connections and their status
- **Edit recipients** — add or remove team members per connection
- **Configure alert types** — choose which crash types trigger notifications
- **Revoke a token** — alerts stop immediately; the extension skips that token
- **View audit trail** — see who created the connection and when

> **Note:** Team members you add as recipients must have the TestNexus app installed and be signed in with the same email address. If a recipient isn't receiving notifications, ask them to verify they're signed in to TestNexus with the email you used when adding them.

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

## Uninstalling

```bash
firebase ext:uninstall testnexus-crashlytics-alerts --project=YOUR_PROJECT_ID
```

---

## Troubleshooting

### Common Issues

| Problem | Likely Cause | How to Fix |
|---------|-------------|------------|
| No notifications after install | Extension not deployed | Run `firebase deploy --only extensions --project=YOUR_PROJECT_ID` |
| No notifications, extension is deployed | Crashlytics hasn't detected a new issue yet | Trigger a test crash and wait 1-2 minutes for Crashlytics to process |
| Only some team members get alerts | Their token isn't in the extension config | Add their token to the comma-separated list and redeploy |
| Notifications arrive late | FCM delivery delay or device battery settings | Check device connectivity; exempt TestNexus from battery optimization |
| "Eventarc Service Agent" permission error during deploy | Blaze plan was just enabled or project is new | Wait 2-3 minutes for permissions to propagate, then run `firebase deploy --only extensions` again |
| "Build failed" / RESOURCE_ERROR during deploy | Function dependencies not installed | Run `cd functions && npm install && cd ..` then redeploy |
| "No params file found" error during deploy | Instance name mismatch between `firebase.json` and `extensions/` directory | Check that the instance name in `firebase.json` matches the `.env` filename in the `extensions/` folder. See "Cleaning up duplicate instances" below. |
| Duplicate instances after running `ext:install` multiple times | Each `ext:install` creates a new instance | See "Cleaning up duplicate instances" below |
| Alerts not arriving but no errors in logs | Backend URL was truncated or mistyped during setup | Reconfigure and verify the Backend URL is exactly `https://us-central1-test-nexus-prod.cloudfunctions.net/receiveCrashlyticsAlert` — or just press Enter to use the default |

### Error Codes in Cloud Functions Logs

Check your extension logs at [Firebase Console → Functions → Logs](https://console.firebase.google.com/project/_/functions/logs):

| Error | What It Means | What to Do |
|-------|---------------|------------|
| **"Token not found" (401)** | The token was mistyped or doesn't exist in TestNexus | Copy the token again from the TestNexus app and reconfigure the extension |
| **"Token is not active" (401)** | The connection was revoked in TestNexus | Create a new connection in TestNexus → Connected Apps, then reconfigure with the new token |
| **"Invalid token format" (401)** | Token is malformed — missing characters or extra spaces | Token must be `tnx_` followed by exactly 32 hex characters (e.g., `tnx_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`). Check for typos or trailing spaces. |
| **"Rate limit exceeded" (429)** | More than 60 alerts/minute for this connection | Normal during mass-crash events. Alerts resume automatically after 60 seconds. No action needed. |
| **"Method not allowed" (405)** | Extension is misconfigured or pointing to the wrong endpoint | Reconfigure and redeploy the extension |
| **Server error (500)** | Temporary backend issue | The extension retries automatically (3 attempts with exponential backoff). If persistent, check [twocan.us](https://twocan.us) for status updates. |

### Still Not Receiving Notifications?

Run through this checklist:

1. **Is the token still active?** Open TestNexus → Connected Apps → check the connection status shows "Active"
2. **Is Crashlytics set up?** Verify crash data appears in your [Firebase Console → Crashlytics](https://console.firebase.google.com/project/_/crashlytics)
3. **Is the extension deployed?** Run `firebase ext:list --project=YOUR_PROJECT_ID` to confirm it's listed
4. **Any errors in logs?** Check [Cloud Functions logs](https://console.firebase.google.com/project/_/functions/logs) for the error codes listed above
5. **Are notifications enabled on your device?** Make sure TestNexus has notification permissions (Android Settings → Apps → TestNexus → Notifications)
6. **Battery optimization?** Exempt TestNexus from battery optimization (Android Settings → Apps → TestNexus → Battery → Unrestricted)

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

---

## Billing

This extension runs on **your** Firebase project under your Blaze plan. You pay for:

- **Cloud Functions invocations** — one invocation per Crashlytics alert event (typically pennies per month for most apps)
- **Outbound networking** — the HTTP request to the TestNexus backend (negligible)

Firebase provides a generous free tier (2M function invocations/month), so most projects will incur little to no cost. You can monitor usage in your [Firebase Console → Usage & Billing](https://console.firebase.google.com/project/_/usage).

TestNexus does not charge for receiving and forwarding crash alerts. FCM push notifications are free.

---

## Privacy & Security

- **No crash data stored** — alerts are forwarded via FCM push notifications, never persisted on our servers
- **Tokens are hashed** — SHA-256 hashing; plain tokens are never stored server-side
- **HTTPS only** — all communication uses TLS encryption
- **Data flow:** `Crashlytics → This Extension → TestNexus Backend → FCM → Your Phone`
- **Open source** — inspect every line of code in this repository

### What data is forwarded?

Only essential alert metadata — no PII, no logs, no full stack traces:

- **Issue Title** — the crash signature (e.g., "NullPointerException in MainActivity.kt")
- **Issue Subtitle** — file and line number where the crash occurred
- **App Version** — the build version affected
- **Bundle ID** — the app's package name
- **Crash Count** — number of affected users/sessions
- **Alert Type** — which of the 6 alert types triggered (fatal, non-fatal, ANR, etc.)

This metadata is used solely to construct the push notification. It is not stored on our servers — it passes through to FCM and is delivered to your device.

---

## About

Built by [TwoCan](https://twocan.us). TestNexus is a developer tools app that helps Android developers test, debug, and monitor their apps more efficiently.

- **Website:** [twocan.us](https://twocan.us)
- **TestNexus on Google Play:** [Download](https://play.google.com/store/apps/details?id=us.twocan.testnexus)
- **Issues & Feedback:** [GitHub Issues](https://github.com/programmerKaustubh/test-nexus-plugin/issues)

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
