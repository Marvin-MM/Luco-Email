
<?php

namespace Luco\SDK;

use Exception;
use InvalidArgumentException;

/**
 * Official PHP client for the Luco email sending platform.
 */
class LucoClient
{
    private const DEFAULT_BASE_URL = 'https://api.luco.email';
    private const SDK_VERSION = '1.0.0';
    
    private string $apiKey;
    private string $baseUrl;
    private int $timeout;
    private int $retries;
    private int $retryDelay;
    
    /**
     * Create a new Luco client.
     *
     * @param string $apiKey Your Luco API key
     * @param array $options Optional configuration
     */
    public function __construct(string $apiKey, array $options = [])
    {
        if (empty($apiKey)) {
            throw new InvalidArgumentException('API key is required');
        }
        
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($options['baseUrl'] ?? self::DEFAULT_BASE_URL, '/');
        $this->timeout = $options['timeout'] ?? 30;
        $this->retries = $options['retries'] ?? 3;
        $this->retryDelay = $options['retryDelay'] ?? 1000000; // microseconds
    }
    
    /**
     * Get API information and current rate limits.
     *
     * @return array API information
     * @throws LucoException
     */
    public function getInfo(): array
    {
        return $this->makeRequest('GET', '/info');
    }
    
    /**
     * Send a single email.
     *
     * @param array $emailData Email data
     * @return array Response containing message ID
     * @throws LucoException
     */
    public function sendEmail(array $emailData): array
    {
        $this->validateEmailData($emailData);
        return $this->makeRequest('POST', '/email/send', $emailData);
    }
    
    /**
     * Send emails to multiple recipients.
     *
     * @param array $bulkData Bulk email data
     * @return array Response containing batch ID
     * @throws LucoException
     */
    public function sendBulkEmails(array $bulkData): array
    {
        $this->validateBulkEmailData($bulkData);
        return $this->makeRequest('POST', '/email/send-bulk', $bulkData);
    }
    
    /**
     * Get available email templates.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of items per page
     * @param string|null $search Search query
     * @return array Templates data with pagination
     * @throws LucoException
     */
    public function getTemplates(int $page = 1, int $limit = 10, ?string $search = null): array
    {
        $params = ['page' => $page, 'limit' => $limit];
        if ($search !== null) {
            $params['search'] = $search;
        }
        
        $query = http_build_query($params);
        return $this->makeRequest('GET', "/templates?{$query}");
    }
    
    /**
     * Get verified sender identities.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of items per page
     * @return array Identities data with pagination
     * @throws LucoException
     */
    public function getIdentities(int $page = 1, int $limit = 10): array
    {
        $query = http_build_query(['page' => $page, 'limit' => $limit]);
        return $this->makeRequest('GET', "/identities?{$query}");
    }
    
    /**
     * Get email analytics data.
     *
     * @param string|null $startDate Start date in ISO format
     * @param string|null $endDate End date in ISO format
     * @return array Analytics data
     * @throws LucoException
     */
    public function getAnalytics(?string $startDate = null, ?string $endDate = null): array
    {
        $params = [];
        if ($startDate !== null) {
            $params['startDate'] = $startDate;
        }
        if ($endDate !== null) {
            $params['endDate'] = $endDate;
        }
        
        $query = !empty($params) ? '?' . http_build_query($params) : '';
        return $this->makeRequest('GET', "/analytics{$query}");
    }
    
    /**
     * Make HTTP request to the Luco API.
     *
     * @param string $method HTTP method
     * @param string $endpoint API endpoint
     * @param array|null $data Request data
     * @return array Response data
     * @throws LucoException
     */
    private function makeRequest(string $method, string $endpoint, ?array $data = null): array
    {
        $url = $this->baseUrl . '/api/v1' . $endpoint;
        
        $lastError = null;
        
        for ($attempt = 0; $attempt <= $this->retries; $attempt++) {
            try {
                $ch = curl_init();
                
                curl_setopt_array($ch, [
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => $this->timeout,
                    CURLOPT_CUSTOMREQUEST => $method,
                    CURLOPT_HTTPHEADER => [
                        'Authorization: Bearer ' . $this->apiKey,
                        'Content-Type: application/json',
                        'User-Agent: Luco-PHP-SDK/' . self::SDK_VERSION,
                    ],
                ]);
                
                if ($data !== null && in_array($method, ['POST', 'PUT', 'PATCH'])) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $error = curl_error($ch);
                curl_close($ch);
                
                if ($response === false) {
                    throw new LucoException("Request failed: {$error}");
                }
                
                $responseData = json_decode($response, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new LucoException('Invalid JSON response');
                }
                
                if ($httpCode >= 400) {
                    $message = $responseData['message'] ?? "HTTP {$httpCode}";
                    $errorType = $responseData['error']['type'] ?? null;
                    $errorCode = $responseData['error']['code'] ?? null;
                    $details = $responseData['error']['details'] ?? null;
                    
                    $exception = new LucoAPIException($message, $httpCode, $errorType, $errorCode, $details);
                    
                    // Don't retry on client errors (4xx) except 429
                    if ($httpCode >= 400 && $httpCode < 500 && $httpCode !== 429) {
                        throw $exception;
                    }
                    
                    $lastError = $exception;
                } else {
                    return $responseData;
                }
                
            } catch (LucoAPIException $e) {
                $lastError = $e;
                
                // Don't retry on client errors except 429
                if ($e->getStatusCode() >= 400 && $e->getStatusCode() < 500 && $e->getStatusCode() !== 429) {
                    throw $e;
                }
            } catch (Exception $e) {
                $lastError = new LucoException("Request failed: " . $e->getMessage(), 0, $e);
            }
            
            // Don't sleep on last attempt
            if ($attempt < $this->retries) {
                usleep($this->retryDelay * pow(2, $attempt));
            }
        }
        
        throw $lastError;
    }
    
    /**
     * Validate email data.
     *
     * @param array $emailData
     * @throws LucoValidationException
     */
    private function validateEmailData(array $emailData): void
    {
        if (empty($emailData['to'])) {
            throw new LucoValidationException('Recipient email is required');
        }
        
        if (empty($emailData['subject'])) {
            throw new LucoValidationException('Subject is required');
        }
        
        if (empty($emailData['content']) && empty($emailData['template'])) {
            throw new LucoValidationException('Either content or template must be provided');
        }
        
        if (!filter_var($emailData['to'], FILTER_VALIDATE_EMAIL)) {
            throw new LucoValidationException('Invalid recipient email address');
        }
    }
    
    /**
     * Validate bulk email data.
     *
     * @param array $bulkData
     * @throws LucoValidationException
     */
    private function validateBulkEmailData(array $bulkData): void
    {
        if (empty($bulkData['recipients']) || !is_array($bulkData['recipients'])) {
            throw new LucoValidationException('Recipients must be a non-empty array');
        }
        
        if (empty($bulkData['subject'])) {
            throw new LucoValidationException('Subject is required');
        }
        
        if (empty($bulkData['content']) && empty($bulkData['template'])) {
            throw new LucoValidationException('Either content or template must be provided');
        }
        
        foreach ($bulkData['recipients'] as $index => $recipient) {
            if (!is_array($recipient) || empty($recipient['email'])) {
                throw new LucoValidationException("Recipient {$index} must have an 'email' field");
            }
            
            if (!filter_var($recipient['email'], FILTER_VALIDATE_EMAIL)) {
                throw new LucoValidationException("Invalid email address at recipient {$index}");
            }
        }
    }
}
