
import requests
import time
import json
from typing import Dict, List, Optional, Union
from .exceptions import LucoError, LucoAPIError, LucoValidationError


class LucoClient:
    """
    Official Python client for the Luco email sending platform.
    
    Args:
        api_key (str): Your Luco API key
        base_url (str, optional): Custom API base URL
        timeout (int, optional): Request timeout in seconds (default: 30)
        retries (int, optional): Number of retry attempts (default: 3)
        retry_delay (float, optional): Base delay between retries in seconds (default: 1.0)
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.luco.email",
        timeout: int = 30,
        retries: int = 3,
        retry_delay: float = 1.0
    ):
        if not api_key:
            raise LucoValidationError("API key is required")
        
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.retries = retries
        self.retry_delay = retry_delay
        
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'Luco-Python-SDK/1.0.0'
        })

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """
        Make HTTP request with retry logic.
        
        Args:
            method (str): HTTP method
            endpoint (str): API endpoint
            data (dict, optional): Request body data
            params (dict, optional): Query parameters
            
        Returns:
            dict: Response data
            
        Raises:
            LucoAPIError: If the API returns an error
            LucoError: For other errors
        """
        url = f"{self.base_url}/api/v1{endpoint}"
        
        last_error = None
        
        for attempt in range(self.retries + 1):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    timeout=self.timeout
                )
                
                try:
                    response_data = response.json()
                except json.JSONDecodeError:
                    response_data = {"message": "Invalid JSON response"}
                
                if not response.ok:
                    error = LucoAPIError(
                        message=response_data.get('message', f'HTTP {response.status_code}'),
                        status_code=response.status_code,
                        error_type=response_data.get('error', {}).get('type'),
                        error_code=response_data.get('error', {}).get('code'),
                        details=response_data.get('error', {}).get('details')
                    )
                    raise error
                
                return response_data
                
            except requests.exceptions.RequestException as e:
                last_error = LucoError(f"Request failed: {str(e)}")
                
                # Don't retry on 4xx errors except 429
                if hasattr(e, 'response') and e.response is not None:
                    if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                        raise last_error
                
                # Don't retry on last attempt
                if attempt == self.retries:
                    break
                
                # Exponential backoff
                time.sleep(self.retry_delay * (2 ** attempt))
            
            except LucoAPIError as e:
                # Don't retry on client errors except 429
                if 400 <= e.status_code < 500 and e.status_code != 429:
                    raise e
                
                last_error = e
                
                if attempt == self.retries:
                    break
                
                time.sleep(self.retry_delay * (2 ** attempt))
        
        raise last_error

    def get_info(self) -> Dict:
        """
        Get API information and current rate limits.
        
        Returns:
            dict: API information including rate limits
        """
        return self._request('GET', '/info')

    def send_email(
        self,
        to: str,
        subject: str,
        content: Optional[Dict[str, str]] = None,
        template: Optional[Dict] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Send a single email.
        
        Args:
            to (str): Recipient email address
            subject (str): Email subject
            content (dict, optional): Email content with 'html' and/or 'text' keys
            template (dict, optional): Template configuration with 'id' and 'variables'
            reply_to (str, optional): Reply-to email address
            attachments (list, optional): List of attachment objects
            
        Returns:
            dict: Response containing message ID and status
            
        Raises:
            LucoValidationError: If required parameters are missing
            LucoAPIError: If the API returns an error
        """
        if not to or not subject:
            raise LucoValidationError("Recipient email and subject are required")
        
        if not content and not template:
            raise LucoValidationError("Either content or template must be provided")
        
        payload = {
            'to': to,
            'subject': subject
        }
        
        if content:
            payload['content'] = content
        if template:
            payload['template'] = template
        if reply_to:
            payload['replyTo'] = reply_to
        if attachments:
            payload['attachments'] = attachments
        
        return self._request('POST', '/email/send', data=payload)

    def send_bulk_emails(
        self,
        recipients: List[Dict],
        subject: str,
        content: Optional[Dict[str, str]] = None,
        template: Optional[Dict] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Send emails to multiple recipients.
        
        Args:
            recipients (list): List of recipient objects with 'email' and optional 'variables'
            subject (str): Email subject
            content (dict, optional): Email content with 'html' and/or 'text' keys
            template (dict, optional): Template configuration with 'id' and 'variables'
            reply_to (str, optional): Reply-to email address
            attachments (list, optional): List of attachment objects
            
        Returns:
            dict: Response containing batch ID and status
            
        Raises:
            LucoValidationError: If required parameters are missing or invalid
            LucoAPIError: If the API returns an error
        """
        if not recipients or not isinstance(recipients, list) or len(recipients) == 0:
            raise LucoValidationError("Recipients must be a non-empty list")
        
        if not subject:
            raise LucoValidationError("Subject is required")
        
        if not content and not template:
            raise LucoValidationError("Either content or template must be provided")
        
        # Validate recipients
        for i, recipient in enumerate(recipients):
            if not isinstance(recipient, dict) or 'email' not in recipient:
                raise LucoValidationError(f"Recipient {i} must have an 'email' field")
        
        payload = {
            'recipients': recipients,
            'subject': subject
        }
        
        if content:
            payload['content'] = content
        if template:
            payload['template'] = template
        if reply_to:
            payload['replyTo'] = reply_to
        if attachments:
            payload['attachments'] = attachments
        
        return self._request('POST', '/email/send-bulk', data=payload)

    def get_templates(
        self,
        page: int = 1,
        limit: int = 10,
        search: Optional[str] = None
    ) -> Dict:
        """
        Get available email templates.
        
        Args:
            page (int, optional): Page number (default: 1)
            limit (int, optional): Number of items per page (default: 10)
            search (str, optional): Search query
            
        Returns:
            dict: Templates data with pagination info
        """
        params = {'page': page, 'limit': limit}
        if search:
            params['search'] = search
        
        return self._request('GET', '/templates', params=params)

    def get_identities(
        self,
        page: int = 1,
        limit: int = 10
    ) -> Dict:
        """
        Get verified sender identities.
        
        Args:
            page (int, optional): Page number (default: 1)
            limit (int, optional): Number of items per page (default: 10)
            
        Returns:
            dict: Identities data with pagination info
        """
        params = {'page': page, 'limit': limit}
        return self._request('GET', '/identities', params=params)

    def get_analytics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict:
        """
        Get email analytics data.
        
        Args:
            start_date (str, optional): Start date in ISO format
            end_date (str, optional): End date in ISO format
            
        Returns:
            dict: Analytics data
        """
        params = {}
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date
        
        return self._request('GET', '/analytics', params=params)

    def close(self):
        """Close the HTTP session."""
        self.session.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
