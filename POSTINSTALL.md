### Almost done — 3 quick steps to complete setup

The extension is installed. Complete these steps to activate all alert types.

---

### Step A: Enable Eventarc Publishing API (REQUIRED)

**Without this, Crashlytics and Config alerts will never arrive.**

1. Open [Eventarc Publishing API](https://console.cloud.google.com/apis/library/eventarcpublishing.googleapis.com?project=${param:PROJECT_ID})
2. Click **Enable**
3. Wait 30 seconds for it to propagate

### Step B: Grant Remote Config access (optional)

**Skip this if you don't need Remote Config parameter diffs (old → new values).**

1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=${param:PROJECT_ID})
2. Find the account starting with `ext-testnexus-crashlytics-`
3. Copy its email address
4. Go to [IAM](https://console.cloud.google.com/iam-admin/iam?project=${param:PROJECT_ID}) → **Grant Access**
5. Paste the email → Role: **Remote Config Admin** → Save

### Step C: Grant Performance access (optional)

**Skip this if you don't use Performance monitoring.**

1. Same [IAM](https://console.cloud.google.com/iam-admin/iam?project=${param:PROJECT_ID}) page
2. Same service account email
3. Add role: **Monitoring Viewer**
4. Click **Save**

---

### What works after each step

| After Step | What Works |
|-----------|-----------|
| Install only | Nothing (Eventarc not enabled) |
| **+ Step A** | Crash alerts, Config change alerts (version + who changed) |
| **+ Step B** | Config alerts with parameter diffs (old → new values) |
| **+ Step C** | Performance threshold breach alerts |

---

### Your configuration

- **App name**: ${param:APP_IDENTIFIER}
- **Region**: ${param:LOCATION}
- **Watchlist keys**: ${param:WATCHLIST_KEYS}
- **Performance check**: Every ${param:PERF_CHECK_INTERVAL} minutes

### Verify it works

**Crashlytics:** Trigger a crash in your app → reopen → wait 5-10 minutes → check for notification

**Config:** Change a Remote Config value in Firebase Console → Publish → notification within 10 seconds

**Performance:** Wait for the next scheduled check (every ${param:PERF_CHECK_INTERVAL} minutes) → if a metric exceeds your threshold, you'll get a notification

### Multiple tokens

To add team members, reconfigure with comma-separated tokens:

```bash
firebase ext:configure ${param:EXT_INSTANCE_ID} --project=${param:PROJECT_ID}
```

### Not receiving notifications?

1. **Eventarc Publishing API enabled?** — This is the #1 missed step
2. **Token still active?** — Check in Test Nexus app → Connected Apps
3. **Alert category enabled?** — Check the toggle in connection details
4. **Check function logs** — [Cloud Functions logs](https://console.firebase.google.com/project/${param:PROJECT_ID}/functions/logs)
5. **Crashlytics receiving data?** — Check [Crashlytics dashboard](https://console.firebase.google.com/project/${param:PROJECT_ID}/crashlytics)

### Full documentation

See the [README](https://github.com/programmerKaustubh/test-nexus-plugin) for complete setup guide, troubleshooting, and team configuration.
