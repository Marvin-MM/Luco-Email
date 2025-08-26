
package com.luco.sdk;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import okhttp3.*;
import okhttp3.logging.HttpLoggingInterceptor;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Official Java client for the Luco email sending platform.
 */
public class LucoClient {
    
    private static final String DEFAULT_BASE_URL = "https://api.luco.email";
    private static final String SDK_VERSION = "1.0.0";
    
    private final OkHttpClient httpClient;
    private final String baseUrl;
    private final String apiKey;
    private final Gson gson;
    
    /**
     * Create a new Luco client with default settings.
     *
     * @param apiKey Your Luco API key
     */
    public LucoClient(String apiKey) {
        this(apiKey, DEFAULT_BASE_URL, 30, 3, 1000);
    }
    
    /**
     * Create a new Luco client with custom settings.
     *
     * @param apiKey Your Luco API key
     * @param baseUrl Custom API base URL
     * @param timeoutSeconds Request timeout in seconds
     * @param retries Number of retry attempts
     * @param retryDelayMs Base delay between retries in milliseconds
     */
    public LucoClient(String apiKey, String baseUrl, int timeoutSeconds, int retries, int retryDelayMs) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalArgumentException("API key is required");
        }
        
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.gson = new Gson();
        
        OkHttpClient.Builder clientBuilder = new OkHttpClient.Builder()
                .connectTimeout(timeoutSeconds, TimeUnit.SECONDS)
                .readTimeout(timeoutSeconds, TimeUnit.SECONDS)
                .writeTimeout(timeoutSeconds, TimeUnit.SECONDS)
                .addInterceptor(new RetryInterceptor(retries, retryDelayMs))
                .addInterceptor(chain -> {
                    Request original = chain.request();
                    Request request = original.newBuilder()
                            .header("Authorization", "Bearer " + apiKey)
                            .header("Content-Type", "application/json")
                            .header("User-Agent", "Luco-Java-SDK/" + SDK_VERSION)
                            .build();
                    return chain.proceed(request);
                });
        
        // Add logging in debug mode
        if (Boolean.parseBoolean(System.getProperty("luco.debug", "false"))) {
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(HttpLoggingInterceptor.Level.BODY);
            clientBuilder.addInterceptor(logging);
        }
        
        this.httpClient = clientBuilder.build();
    }
    
    /**
     * Get API information and current rate limits.
     *
     * @return API information
     * @throws LucoException if the request fails
     */
    public LucoResponse<ApiInfo> getInfo() throws LucoException {
        return makeRequest("GET", "/info", null, ApiInfo.class);
    }
    
    /**
     * Send a single email.
     *
     * @param emailRequest Email data
     * @return Response containing message ID
     * @throws LucoException if the request fails
     */
    public LucoResponse<EmailResult> sendEmail(SendEmailRequest emailRequest) throws LucoException {
        if (emailRequest.getTo() == null || emailRequest.getTo().trim().isEmpty()) {
            throw new LucoValidationException("Recipient email is required");
        }
        if (emailRequest.getSubject() == null || emailRequest.getSubject().trim().isEmpty()) {
            throw new LucoValidationException("Subject is required");
        }
        if (emailRequest.getContent() == null && emailRequest.getTemplate() == null) {
            throw new LucoValidationException("Either content or template must be provided");
        }
        
        return makeRequest("POST", "/email/send", emailRequest, EmailResult.class);
    }
    
    /**
     * Send emails to multiple recipients.
     *
     * @param bulkRequest Bulk email data
     * @return Response containing batch ID
     * @throws LucoException if the request fails
     */
    public LucoResponse<BulkEmailResult> sendBulkEmails(SendBulkEmailRequest bulkRequest) throws LucoException {
        if (bulkRequest.getRecipients() == null || bulkRequest.getRecipients().isEmpty()) {
            throw new LucoValidationException("Recipients list cannot be empty");
        }
        if (bulkRequest.getSubject() == null || bulkRequest.getSubject().trim().isEmpty()) {
            throw new LucoValidationException("Subject is required");
        }
        if (bulkRequest.getContent() == null && bulkRequest.getTemplate() == null) {
            throw new LucoValidationException("Either content or template must be provided");
        }
        
        return makeRequest("POST", "/email/send-bulk", bulkRequest, BulkEmailResult.class);
    }
    
    /**
     * Get available email templates.
     *
     * @param page Page number (1-based)
     * @param limit Number of items per page
     * @param search Search query (optional)
     * @return Templates data with pagination
     * @throws LucoException if the request fails
     */
    public LucoResponse<TemplatesResult> getTemplates(int page, int limit, String search) throws LucoException {
        String endpoint = String.format("/templates?page=%d&limit=%d", page, limit);
        if (search != null && !search.trim().isEmpty()) {
            endpoint += "&search=" + search.trim();
        }
        
        return makeRequest("GET", endpoint, null, TemplatesResult.class);
    }
    
    /**
     * Get verified sender identities.
     *
     * @param page Page number (1-based)
     * @param limit Number of items per page
     * @return Identities data with pagination
     * @throws LucoException if the request fails
     */
    public LucoResponse<IdentitiesResult> getIdentities(int page, int limit) throws LucoException {
        String endpoint = String.format("/identities?page=%d&limit=%d", page, limit);
        return makeRequest("GET", endpoint, null, IdentitiesResult.class);
    }
    
    /**
     * Get email analytics data.
     *
     * @param startDate Start date in ISO format (optional)
     * @param endDate End date in ISO format (optional)
     * @return Analytics data
     * @throws LucoException if the request fails
     */
    public LucoResponse<AnalyticsResult> getAnalytics(String startDate, String endDate) throws LucoException {
        StringBuilder endpoint = new StringBuilder("/analytics");
        
        if (startDate != null || endDate != null) {
            endpoint.append("?");
            if (startDate != null) {
                endpoint.append("startDate=").append(startDate);
            }
            if (endDate != null) {
                if (startDate != null) endpoint.append("&");
                endpoint.append("endDate=").append(endDate);
            }
        }
        
        return makeRequest("GET", endpoint.toString(), null, AnalyticsResult.class);
    }
    
    /**
     * Make HTTP request to the Luco API.
     */
    private <T> LucoResponse<T> makeRequest(String method, String endpoint, Object requestBody, Class<T> responseClass) throws LucoException {
        String url = baseUrl + "/api/v1" + endpoint;
        
        Request.Builder requestBuilder = new Request.Builder().url(url);
        
        if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method)) {
            String json = requestBody != null ? gson.toJson(requestBody) : "{}";
            RequestBody body = RequestBody.create(json, MediaType.get("application/json"));
            requestBuilder.method(method, body);
        } else {
            requestBuilder.method(method, null);
        }
        
        try {
            Response response = httpClient.newCall(requestBuilder.build()).execute();
            String responseBody = response.body() != null ? response.body().string() : "{}";
            
            if (!response.isSuccessful()) {
                JsonObject errorObj = JsonParser.parseString(responseBody).getAsJsonObject();
                String message = errorObj.has("message") ? errorObj.get("message").getAsString() : "HTTP " + response.code();
                
                JsonObject error = errorObj.has("error") ? errorObj.getAsJsonObject("error") : new JsonObject();
                String errorType = error.has("type") ? error.get("type").getAsString() : null;
                String errorCode = error.has("code") ? error.get("code").getAsString() : null;
                
                throw new LucoAPIException(message, response.code(), errorType, errorCode);
            }
            
            JsonObject responseObj = JsonParser.parseString(responseBody).getAsJsonObject();
            T data = responseObj.has("data") ? gson.fromJson(responseObj.get("data"), responseClass) : null;
            String message = responseObj.has("message") ? responseObj.get("message").getAsString() : null;
            boolean success = responseObj.has("success") ? responseObj.get("success").getAsBoolean() : true;
            
            return new LucoResponse<>(success, message, data);
            
        } catch (IOException e) {
            throw new LucoException("Request failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Close the HTTP client and release resources.
     */
    public void close() {
        httpClient.dispatcher().executorService().shutdown();
        httpClient.connectionPool().evictAll();
    }
    
    /**
     * Retry interceptor for handling transient failures.
     */
    private static class RetryInterceptor implements Interceptor {
        private final int maxRetries;
        private final int retryDelayMs;
        
        public RetryInterceptor(int maxRetries, int retryDelayMs) {
            this.maxRetries = maxRetries;
            this.retryDelayMs = retryDelayMs;
        }
        
        @Override
        public Response intercept(Chain chain) throws IOException {
            Request request = chain.request();
            Response response = null;
            IOException lastException = null;
            
            for (int attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    response = chain.proceed(request);
                    
                    // Don't retry on client errors (4xx) except 429
                    if (response.code() >= 400 && response.code() < 500 && response.code() != 429) {
                        return response;
                    }
                    
                    // Success or server error - return or retry
                    if (response.isSuccessful() || attempt == maxRetries) {
                        return response;
                    }
                    
                    response.close();
                    
                } catch (IOException e) {
                    lastException = e;
                    if (attempt == maxRetries) {
                        throw e;
                    }
                }
                
                // Wait before retrying (exponential backoff)
                try {
                    Thread.sleep(retryDelayMs * (long) Math.pow(2, attempt));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    if (lastException != null) throw lastException;
                    throw new IOException("Request interrupted", e);
                }
            }
            
            if (lastException != null) throw lastException;
            return response;
        }
    }
}
