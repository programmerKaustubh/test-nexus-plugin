### You're all set

The next time Crashlytics detects a crash in your app, you'll get a push notification in TestNexus.

### Your configuration

- **App name**: ${param:APP_IDENTIFIER}
- **Region**: ${param:LOCATION}

### Deploy the extension

After installation, deploy to activate:

```bash
firebase deploy --only extensions
```

### Verify it works

1. Trigger a test crash in your app
2. Wait for Crashlytics to process the event (usually 1-2 minutes)
3. Check for a notification in the TestNexus app

### Multiple tokens

This extension supports multiple connection tokens. Each token can have different alert types and recipients, all configured in the TestNexus app. To add or update tokens:

```bash
firebase ext:configure testnexus-crashlytics-alerts --project=YOUR_PROJECT_ID
```

Enter tokens comma-separated (e.g., `tnx_abc...,tnx_xyz...`).

### Managing your connections

Open the TestNexus app → **Connected Apps** to:

- View active connections
- Edit recipients per connection
- Configure alert types per connection
- Revoke a token (alerts stop immediately)

### Not receiving notifications?

1. Verify your token is still active in TestNexus (not revoked)
2. Recipients are managed in the TestNexus app (Connected Apps → tap connection → Edit Recipients)
3. Check [Cloud Functions logs](https://console.firebase.google.com/project/_/functions/logs) for errors
4. Confirm Crashlytics is set up and receiving crash data in your project
5. Ensure the extension is deployed: `firebase deploy --only extensions`

### Updating the extension

Pull the latest changes and update:

```bash
cd test-nexus-plugin
git pull
firebase ext:update testnexus-crashlytics-alerts ./test-nexus-plugin --project=YOUR_PROJECT_ID
firebase deploy --only extensions --project=YOUR_PROJECT_ID
```

### Uninstalling

```bash
firebase ext:uninstall testnexus-crashlytics-alerts --project=YOUR_PROJECT_ID
```
