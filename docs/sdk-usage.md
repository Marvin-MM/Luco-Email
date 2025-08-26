
# Luco SDK Documentation

This document provides comprehensive documentation for using Luco SDKs across different programming languages.

## Table of Contents

1. [Getting Started](#getting-started)
2. [API Key Management](#api-key-management)
3. [JavaScript SDK](#javascript-sdk)
4. [Python SDK](#python-sdk)
5. [Java SDK](#java-sdk)
6. [PHP SDK](#php-sdk)
7. [Common Use Cases](#common-use-cases)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Best Practices](#best-practices)

## Getting Started

### Prerequisites

1. A Luco account with an active subscription
2. At least one verified sender identity (email address or domain)
3. An API key with appropriate permissions

### API Key Management

Before using any SDK, you need to create an API key through the Luco dashboard or API.

#### Creating an API Key via API

```bash
curl -X POST https://your-luco-instance.com/api/keys \
  -H "Authorization: Bearer your-user-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App Integration",
    "description": "API key for my application",
    "permissions": ["send_email", "view_analytics"],
    "rateLimit": 1000,
    "expiresIn": 365
  }'
```

#### Available Permissions

- `send_email`: Send single and bulk emails
- `manage_templates`: Create, update, and delete templates
- `manage_identities`: Manage sender identities
- `view_analytics`: Access analytics and reporting data
- `manage_campaigns`: Create and manage email campaigns
- `admin`: Full access to all features

## JavaScript SDK

### Installation

```bash
npm install @luco/sdk
```

### Basic Usage

```javascript
const { LucoClient } = require('@luco/sdk');

const luco = new LucoClient('your-api-key');

// Send a single email
const response = await luco.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  content: {
    html: '<h1>Welcome to our platform!</h1>',
    text: 'Welcome to our platform!'
  }
});

console.log('Email sent:', response.data.messageId);
```

### Advanced Configuration

```javascript
const luco = new LucoClient('your-api-key', {
  baseURL: 'https://your-luco-instance.com',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
});
```

### Bulk Email Sending

```javascript
await luco.sendBulkEmails({
  recipients: [
    { email: 'user1@example.com', variables: { name: 'John' } },
    { email: 'user2@example.com', variables: { name: 'Jane' } }
  ],
  subject: 'Hello {{name}}!',
  template: {
    id: 'welcome-template-id',
    variables: { company: 'Your Company' }
  }
});
```

## Python SDK

### Installation

```bash
pip install luco-sdk
```

### Basic Usage

```python
from luco_sdk import LucoClient

client = LucoClient('your-api-key')

# Send a single email
response = client.send_email(
    to='user@example.com',
    subject='Welcome!',
    content={
        'html': '<h1>Welcome to our platform!</h1>',
        'text': 'Welcome to our platform!'
    }
)

print(f"Email sent: {response['data']['messageId']}")
```

### Context Manager Usage

```python
with LucoClient('your-api-key') as client:
    response = client.send_email(
        to='user@example.com',
        subject='Hello!',
        content={'text': 'Hello from Python!'}
    )
    print(response)
# Session is automatically closed
```

### Async Usage with ThreadPoolExecutor

```python
import asyncio
import concurrent.futures
from luco_sdk import LucoClient

async def send_emails_async():
    client = LucoClient('your-api-key')
    
    with concurrent.futures.ThreadPoolExecutor() as executor:
        loop = asyncio.get_event_loop()
        
        futures = [
            loop.run_in_executor(
                executor,
                client.send_email,
                f'user{i}@example.com',
                f'Message {i}',
                {'text': f'Hello user {i}!'}
            )
            for i in range(10)
        ]
        
        results = await asyncio.gather(*futures)
        return results

results = asyncio.run(send_emails_async())
```

## Java SDK

### Maven Dependency

```xml
<dependency>
    <groupId>com.luco</groupId>
    <artifactId>luco-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Basic Usage

```java
import com.luco.sdk.LucoClient;
import com.luco.sdk.SendEmailRequest;
import com.luco.sdk.EmailContent;

public class EmailExample {
    public static void main(String[] args) {
        LucoClient client = new LucoClient("your-api-key");
        
        try {
            SendEmailRequest request = new SendEmailRequest()
                .setTo("user@example.com")
                .setSubject("Welcome!")
                .setContent(new EmailContent()
                    .setHtml("<h1>Welcome to our platform!</h1>")
                    .setText("Welcome to our platform!"));
            
            LucoResponse<EmailResult> response = client.sendEmail(request);
            System.out.println("Email sent: " + response.getData().getMessageId());
            
        } catch (LucoException e) {
            System.err.println("Error: " + e.getMessage());
        } finally {
            client.close();
        }
    }
}
```

### Bulk Email Example

```java
List<Recipient> recipients = Arrays.asList(
    new Recipient("user1@example.com").setVariables(Map.of("name", "John")),
    new Recipient("user2@example.com").setVariables(Map.of("name", "Jane"))
);

SendBulkEmailRequest bulkRequest = new SendBulkEmailRequest()
    .setRecipients(recipients)
    .setSubject("Hello {{name}}!")
    .setTemplate(new Template()
        .setId("welcome-template-id")
        .setVariables(Map.of("company", "Your Company")));

LucoResponse<BulkEmailResult> response = client.sendBulkEmails(bulkRequest);
```

## PHP SDK

### Installation

```bash
composer require luco/sdk
```

### Basic Usage

```php
<?php

require_once 'vendor/autoload.php';

use Luco\SDK\LucoClient;

$client = new LucoClient('your-api-key');

try {
    $response = $client->sendEmail([
        'to' => 'user@example.com',
        'subject' => 'Welcome!',
        'content' => [
            'html' => '<h1>Welcome to our platform!</h1>',
            'text' => 'Welcome to our platform!'
        ]
    ]);
    
    echo "Email sent: " . $response['data']['messageId'] . "\n";
    
} catch (Luco\SDK\LucoException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
```

### Bulk Email Example

```php
$response = $client->sendBulkEmails([
    'recipients' => [
        ['email' => 'user1@example.com', 'variables' => ['name' => 'John']],
        ['email' => 'user2@example.com', 'variables' => ['name' => 'Jane']]
    ],
    'subject' => 'Hello {{name}}!',
    'template' => [
        'id' => 'welcome-template-id',
        'variables' => ['company' => 'Your Company']
    ]
]);
```

## Common Use Cases

### 1. Transactional Emails

```javascript
// Welcome email
await luco.sendEmail({
  to: newUser.email,
  subject: 'Welcome to MyApp!',
  template: {
    id: 'welcome-template',
    variables: {
      firstName: newUser.firstName,
      activationLink: generateActivationLink(newUser.id)
    }
  }
});
```

### 2. Password Reset

```python
# Password reset email
client.send_email(
    to=user.email,
    subject='Reset Your Password',
    template={
        'id': 'password-reset-template',
        'variables': {
            'firstName': user.first_name,
            'resetLink': generate_reset_link(user.id)
        }
    }
)
```

### 3. Marketing Campaigns

```java
// Newsletter campaign
List<Recipient> subscribers = getActiveSubscribers();

SendBulkEmailRequest campaign = new SendBulkEmailRequest()
    .setRecipients(subscribers)
    .setSubject("Monthly Newsletter - {{month}} {{year}}")
    .setTemplate(new Template()
        .setId("newsletter-template")
        .setVariables(Map.of(
            "month", getCurrentMonth(),
            "year", getCurrentYear()
        )));

client.sendBulkEmails(campaign);
```

### 4. Order Confirmations

```php
// Order confirmation
$client->sendEmail([
    'to' => $order->customer_email,
    'subject' => 'Order Confirmation #' . $order->id,
    'template' => [
        'id' => 'order-confirmation-template',
        'variables' => [
            'customerName' => $order->customer_name,
            'orderId' => $order->id,
            'orderTotal' => $order->total,
            'items' => $order->items
        ]
    ],
    'attachments' => [
        [
            'filename' => 'invoice.pdf',
            'content' => base64_encode($order->generateInvoicePDF()),
            'contentType' => 'application/pdf'
        ]
    ]
]);
```

## Error Handling

### JavaScript

```javascript
try {
  const response = await luco.sendEmail(emailData);
} catch (error) {
  if (error.status === 429) {
    console.log('Rate limit exceeded. Retry after:', error.details.resetAt);
  } else if (error.type === 'ValidationError') {
    console.log('Validation failed:', error.details);
  } else {
    console.log('Unexpected error:', error.message);
  }
}
```

### Python

```python
from luco_sdk import LucoAPIError, LucoValidationError

try:
    response = client.send_email(email_data)
except LucoValidationError as e:
    print(f"Validation error: {e}")
except LucoAPIError as e:
    if e.status_code == 429:
        print(f"Rate limit exceeded: {e.details}")
    else:
        print(f"API error: {e}")
```

### Java

```java
try {
    client.sendEmail(request);
} catch (LucoValidationException e) {
    System.err.println("Validation error: " + e.getMessage());
} catch (LucoAPIException e) {
    if (e.getStatusCode() == 429) {
        System.err.println("Rate limit exceeded");
    } else {
        System.err.println("API error: " + e.getMessage());
    }
}
```

### PHP

```php
try {
    $client->sendEmail($emailData);
} catch (Luco\SDK\LucoValidationException $e) {
    echo "Validation error: " . $e->getMessage();
} catch (Luco\SDK\LucoAPIException $e) {
    if ($e->getStatusCode() === 429) {
        echo "Rate limit exceeded";
    } else {
        echo "API error: " . $e->getMessage();
    }
}
```

## Rate Limiting

All SDKs automatically handle rate limiting with exponential backoff. You can check your current rate limit status:

```javascript
const info = await luco.getInfo();
console.log('Remaining requests:', info.data.rateLimit.remaining);
console.log('Reset time:', info.data.rateLimit.resetAt);
```

## Best Practices

### 1. Environment Variables

Store your API key in environment variables:

```bash
# .env file
LUCO_API_KEY=your-api-key
```

```javascript
const luco = new LucoClient(process.env.LUCO_API_KEY);
```

### 2. Connection Pooling

For high-volume applications, reuse client instances:

```javascript
// Create once, reuse many times
const luco = new LucoClient(process.env.LUCO_API_KEY);

// Use for multiple requests
app.post('/send-welcome', async (req, res) => {
  await luco.sendEmail(emailData);
});
```

### 3. Batch Processing

Send emails in batches for better performance:

```python
# Process in batches of 100
batch_size = 100
for i in range(0, len(recipients), batch_size):
    batch = recipients[i:i + batch_size]
    client.send_bulk_emails(
        recipients=batch,
        subject=subject,
        template=template
    )
```

### 4. Error Recovery

Implement retry logic for critical emails:

```java
public void sendWithRetry(SendEmailRequest request, int maxRetries) {
    for (int attempt = 0; attempt < maxRetries; attempt++) {
        try {
            client.sendEmail(request);
            return; // Success
        } catch (LucoException e) {
            if (attempt == maxRetries - 1) {
                throw e; // Final attempt failed
            }
            // Wait before retry
            Thread.sleep(1000 * (attempt + 1));
        }
    }
}
```

### 5. Monitoring and Logging

Track email sending for debugging:

```php
$logger = new Logger('email');

try {
    $response = $client->sendEmail($emailData);
    $logger->info('Email sent successfully', [
        'messageId' => $response['data']['messageId'],
        'recipient' => $emailData['to']
    ]);
} catch (Exception $e) {
    $logger->error('Email sending failed', [
        'error' => $e->getMessage(),
        'recipient' => $emailData['to']
    ]);
}
```

## Support

- **Documentation**: [https://docs.luco.email](https://docs.luco.email)
- **API Reference**: [https://api.luco.email/docs](https://api.luco.email/docs)
- **GitHub Issues**: Report issues for specific SDKs in their respective repositories
- **Email Support**: support@luco.email

## License

All Luco SDKs are released under the MIT License.
