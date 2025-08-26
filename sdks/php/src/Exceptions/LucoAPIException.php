
<?php

namespace Luco\SDK;

/**
 * Exception thrown when the API returns an error response.
 */
class LucoAPIException extends LucoException
{
    private int $statusCode;
    private ?string $errorType;
    private ?string $errorCode;
    private $details;
    
    public function __construct(
        string $message,
        int $statusCode,
        ?string $errorType = null,
        ?string $errorCode = null,
        $details = null
    ) {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->errorType = $errorType;
        $this->errorCode = $errorCode;
        $this->details = $details;
    }
    
    public function getStatusCode(): int
    {
        return $this->statusCode;
    }
    
    public function getErrorType(): ?string
    {
        return $this->errorType;
    }
    
    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }
    
    public function getDetails()
    {
        return $this->details;
    }
    
    public function __toString(): string
    {
        $parts = [$this->getMessage()];
        
        if ($this->statusCode) {
            $parts[] = "Status: {$this->statusCode}";
        }
        
        if ($this->errorType) {
            $parts[] = "Type: {$this->errorType}";
        }
        
        return implode(' | ', $parts);
    }
}
