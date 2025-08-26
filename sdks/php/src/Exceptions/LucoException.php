
<?php

namespace Luco\SDK;

use Exception;

/**
 * Base exception for all Luco SDK errors.
 */
class LucoException extends Exception
{
    public function __construct(string $message = "", int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
