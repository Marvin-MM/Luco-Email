
# Luco JavaScript SDK

Official JavaScript SDK for the Luco email sending platform. Send transactional and bulk emails with ease.

## Installation

### Node.js
```bash
npm install @luco/sdk
```

### Browser (CDN)
```html
<script src="https://cdn.jsdelivr.net/npm/@luco/sdk@1.0.0/luco-sdk.js"></script>
```

## Quick Start

```javascript
const { LucoClient } = require('@luco/sdk');

// Initialize the client
const luco = new LucoClient('your-api-key', {
  baseURL: 'https://your-luco-instance.com' // Optional
});

// Send a single email
async function sendEmail() {
  try {
    const result = await luco.sendEmail({
      to: 'recipient@example.com',
      subject: 'Welcome!',
      content: {
        html: '<h1>Welcome to our platform!</h1>',
        text: 'Welcome to our platform!'
      }
    });
    
    console.log('Email sent:', result.data.messageId);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

sendEmail();
```

## API Reference

### Constructor

```javascript
const luco = new LucoClient(apiKey, options);
```

**Parameters:**
- `apiKey` (string): Your Luco API key
- `options` (object): Optional configuration
  - `baseURL` (string): Custom API base URL
  - `timeout` (number): Request timeout in milliseconds (default: 30000)
  - `retries` (number): Number of retry attempts (default: 3)
  - `retryDelay` (number): Base delay between retries in milliseconds (default: 1000)

### Methods

#### `getInfo()`
Get API information and current rate limits.

```javascript
const info = await luco.getInfo();
console.log(info.data);
```

#### `sendEmail(emailData)`
Send a single email.

```javascript
await luco.sendEmail({
  to: 'user@example.com',
  subject: 'Your order confirmation',
  content: {
    html: '<p>Thank you for your order!</p>',
    text: 'Thank you for your order!'
  },
  replyTo: 'support@yourdomain.com',
  attachments: [
    {
      filename: 'invoice.pdf',
      content: 'base64-encoded-content',
      contentType: 'application/pdf'
    }
  ]
});
```

#### `sendBulkEmails(bulkData)`
Send emails to multiple recipients.

```javascript
await luco.sendBulkEmails({
  recipients: [
    { email: 'user1@example.com', variables: { name: 'John' } },
    { email: 'user2@example.com', variables: { name: 'Jane' } }
  ],
  subject: 'Hello {{name}}!',
  template: {
    id: 'template-id',
    variables: { company: 'Your Company' }
  }
});
```

#### `getTemplates(options)`
Get available email templates.

```javascript
const templates = await luco.getTemplates({
  page: 1,
  limit: 10,
  search: 'welcome'
});
```

#### `getIdentities(options)`
Get verified sender identities.

```javascript
const identities = await luco.getIdentities({
  page: 1,
  limit: 10
});
```

#### `getAnalytics(options)`
Get email analytics data.

```javascript
const analytics = await luco.getAnalytics({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

## Error Handling

The SDK provides detailed error information:

```javascript
try {
  await luco.sendEmail(emailData);
} catch (error) {
  console.error('Error type:', error.type);
  console.error('Status code:', error.status);
  console.error('Message:', error.message);
  console.error('Details:', error.details);
}
```

## Rate Limiting

The SDK automatically handles rate limiting with exponential backoff. You can check your current rate limit status:

```javascript
const info = await luco.getInfo();
console.log('Requests remaining:', info.data.rateLimit.remaining);
console.log('Reset time:', info.data.rateLimit.resetAt);
```

## Browser Usage

```html
<script src="https://cdn.jsdelivr.net/npm/@luco/sdk@1.0.0/luco-sdk.js"></script>
<script>
  const luco = new LucoClient('your-api-key');
  
  luco.sendEmail({
    to: 'user@example.com',
    subject: 'Hello from browser!',
    content: {
      html: '<p>This email was sent from the browser!</p>'
    }
  }).then(result => {
    console.log('Email sent successfully!');
  }).catch(error => {
    console.error('Error sending email:', error);
  });
</script>
```

## Support

- Documentation: [https://docs.luco.email](https://docs.luco.email)
- GitHub Issues: [https://github.com/luco/sdk-javascript/issues](https://github.com/luco/sdk-javascript/issues)
- Email: support@luco.email

## License

MIT License - see LICENSE file for details.
