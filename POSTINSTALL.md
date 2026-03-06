### Setup Complete

The TestNexus Crashlytics Alerts extension has been installed successfully.

### What happens next

When a Crashlytics alert fires in your project, this extension will:

1. Check if the alert type is enabled in your configuration
2. Build a normalized payload
3. Send it to the TestNexus backend using your connection token
4. You'll receive a push notification in the TestNexus app

### Configuration

You configured:
- **Connection Token**: Your TestNexus connection token (stored securely)
- **App Identifier**: ${param:APP_IDENTIFIER}
- **Alert Types**: ${param:ALERT_TYPES}
- **Recipient Emails**: ${param:RECIPIENT_EMAILS}

### Monitoring

Check the Cloud Functions logs in the Firebase console to verify alerts are being forwarded successfully.

### Troubleshooting

If alerts are not appearing in TestNexus:
1. Verify your connection token is active (check Connected Apps in TestNexus)
2. Check Cloud Functions logs for errors
3. Ensure Crashlytics is properly set up in your project
