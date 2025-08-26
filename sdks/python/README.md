
# Luco Python SDK

Official Python SDK for the Luco email sending platform. Send transactional and bulk emails with ease.

## Installation

```bash
pip install luco-sdk
```

## Quick Start

```python
from luco_sdk import LucoClient

# Initialize the client
client = LucoClient('your-api-key')

# Send a single email
response = client.send_email(
    to='recipient@example.com',
    subject='Welcome!',
    content={
        'html': '<h1>Welcome to our platform!</h1>',
        'text': 'Welcome to our platform!'
    }
)

print(f"Email sent with ID: {response['data']['messageId']}")
```

## API Reference

### Constructor

```python
client = LucoClient(
    api_key='your-api-key',
    base_url='https://your-luco-instance.com',  # Optional
    timeout=30,  # Optional, request timeout in seconds
    retries=3,   # Optional, number of retry attempts
    retry_delay=1.0  # Optional, base delay between retries
)
```

### Methods

#### `get_info()`
Get API information and current rate limits.

```python
info = client.get_info()
print(info['data'])
```

#### `send_email(to, subject, content=None, template=None, reply_to=None, attachments=None)`
Send a single email.

```python
response = client.send_email(
    to='user@example.com',
    subject='Your order confirmation',
    content={
        'html': '<p>Thank you for your order!</p>',
        'text': 'Thank you for your order!'
    },
    reply_to='support@yourdomain.com',
    attachments=[
        {
            'filename': 'invoice.pdf',
            'content': 'base64-encoded-content',
            'contentType': 'application/pdf'
        }
    ]
)
```

#### `send_bulk_emails(recipients, subject, content=None, template=None, reply_to=None, attachments=None)`
Send emails to multiple recipients.

```python
response = client.send_bulk_emails(
    recipients=[
        {'email': 'user1@example.com', 'variables': {'name': 'John'}},
        {'email': 'user2@example.com', 'variables': {'name': 'Jane'}}
    ],
    subject='Hello {{name}}!',
    template={
        'id': 'template-id',
        'variables': {'company': 'Your Company'}
    }
)
```

#### `get_templates(page=1, limit=10, search=None)`
Get available email templates.

```python
templates = client.get_templates(page=1, limit=10, search='welcome')
```

#### `get_identities(page=1, limit=10)`
Get verified sender identities.

```python
identities = client.get_identities(page=1, limit=10)
```

#### `get_analytics(start_date=None, end_date=None)`
Get email analytics data.

```python
analytics = client.get_analytics(
    start_date='2024-01-01',
    end_date='2024-01-31'
)
```

## Error Handling

The SDK provides custom exceptions for different error types:

```python
from luco_sdk import LucoClient, LucoAPIError, LucoValidationError

client = LucoClient('your-api-key')

try:
    response = client.send_email(
        to='invalid-email',
        subject='Test'
    )
except LucoValidationError as e:
    print(f"Validation error: {e}")
except LucoAPIError as e:
    print(f"API error: {e}")
    print(f"Status code: {e.status_code}")
    print(f"Error type: {e.error_type}")
    print(f"Details: {e.details}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Context Manager

Use the client as a context manager to automatically close the HTTP session:

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

## Async Support

For async operations, you can use the client in a thread pool:

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

# Usage
results = asyncio.run(send_emails_async())
```

## Rate Limiting

The SDK automatically handles rate limiting with exponential backoff. Check your current rate limit status:

```python
info = client.get_info()
rate_limit = info['data']['rateLimit']
print(f"Requests remaining: {rate_limit['remaining']}")
print(f"Reset time: {rate_limit['resetAt']}")
```

## Configuration

### Environment Variables

You can set your API key using environment variables:

```bash
export LUCO_API_KEY=your-api-key
```

```python
import os
from luco_sdk import LucoClient

# API key will be read from LUCO_API_KEY environment variable
client = LucoClient(os.getenv('LUCO_API_KEY'))
```

### Custom Configuration

```python
client = LucoClient(
    api_key='your-api-key',
    base_url='https://custom-luco-instance.com',
    timeout=60,  # 60 seconds timeout
    retries=5,   # 5 retry attempts
    retry_delay=2.0  # 2 seconds base delay
)
```

## Support

- Documentation: [https://docs.luco.email](https://docs.luco.email)
- GitHub Issues: [https://github.com/luco/sdk-python/issues](https://github.com/luco/sdk-python/issues)
- Email: support@luco.email

## License

MIT License - see LICENSE file for details.
