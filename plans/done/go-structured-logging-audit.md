# Go Structured Logging Audit Plan

## Overview
This plan outlines a systematic audit of structured logging best practices in the Go backend (123 .go files under cmd/ and internal/). The audit evaluates adherence to 7 key rules for structured logging using log/slog.

## Rules to Audit

1. **Structured Logging via `log/slog`**: Should use `log/slog` for structured logging. Flag uses of:
   - `fmt.Println`, `log.Printf`, `fmt.Printf` to stderr for errors (unstructured)
   - `println` (unstructured)

2. **Error Logging with Structured Attributes**: Error sites SHOULD log via `slog.Error(...)` with structured attributes (slog.String, slog.Int, slog.Any) — not string concatenation.

3. **Low-Cardinality Message Templates**: Log message templates MUST be low-cardinality / stable (constant strings). Flag messages that embed interpolated high-cardinality data (request bodies, full stack traces, variable user content) in the stable message string.

4. **No PII in Error Messages**: No PII in error messages or attributes: flag logging of passwords, tokens, auth headers, emails in plaintext where it could leak to logs.

5. **Correct Log Levels**: Use log levels correctly (slog.LevelError for errors, Warn for recoverable, Info for lifecycle). Flag mis-leveled logs.

6. **HTTP Request Logging**: HTTP request logging SHOULD be done via structured middleware capturing method, path, status, duration. Check if such middleware exists; if not, flag.

7. **System Boundary Errors**: Technical errors must NOT be exposed to users verbatim — check JSON error responses translate to user-friendly messages while technical detail stays in logs.

## Audit Methodology

### 1. File Analysis
- Analyze all 123 .go files in the backend
- Focus on: cmd/, internal/domain/services/, internal/api/handlers/, internal/repository/postgres/
- Check imports for slog usage
- Search for logging patterns

### 2. Specific Pattern Detection
For each file, search for:

#### Unstructured Logging (Rule 1)
```go
// Pattern 1: fmt.Printf/println/fmt.Println for errors
fmt.Printf("Error: %v", err)
fmt.Println("Processing request")
println("Debug message")

// Pattern 2: log.Printf (unstructured)
log.Printf("User %s not found", username)
```

#### Missing Structured Attributes (Rule 2)
```go
// Pattern 1: Error logging without structured attributes
slog.Error("user not found", "error", err)
// Bad: err.Error() embedded directly
slog.Error("user not found", "username", username, "error", err)
// Good: structured attributes
```

#### High-Cardinality Data in Message Templates (Rule 3)
```go
// Pattern 1: User content in message string
slog.Error("Login failed for user '+username+' with password '+password+'", ...)
// Bad: high-cardinality in stable message
slog.Error("Processing user input with ID '+input+' and payload '+body+'", ...)
// Good: only stable templates
slog.Error("Failed to process user input", "userID", id, "error", err)
```

#### PII Exposure (Rule 4)
```go
// Pattern 1: Passwords, tokens, auth headers in logs
slog.Error("Authentication failed for password '+password+'", ...)
slog.Error("Token '+token+' is invalid", ...)
```

#### Incorrect Log Levels (Rule 5)
```go
// Pattern 1: Using Info level for error conditions
// Should be Error level, not Info
slog.Info("User authentication failed")
slog.Warn("Database connection failed")  // Should be Error
slog.Error("User successfully registered")  // Should be Info
```

#### HTTP Request Logging (Rule 6)
```go
// Pattern 1: Middleware capturing method, path, status, duration
// Check for gin middleware with structured logging
// Pattern 2: c.JSON with error details exposing technical info
// Pattern 3: Missing structured request logging
```

#### System Boundary Error Exposure (Rule 7)
```go
// Pattern 1: Technical error details in user responses
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// Should be: c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
```

### 3. Audit Strategy

#### Phase 1: Import Analysis (All .go files)
- Check for `log/slog` imports
- Check for absence of slog when needed
- Identify missing slog dependency

#### Phase 2: Pattern-Based Analysis (Targeted search)
- Use grep to find logging patterns across all files
- High-priority: Rules 1, 4, 7 violations (security, user exposure)
- Medium-priority: Rules 2, 3, 6 violations (structure, exposure)
- Low-priority: Rule 5 violations (log levels)

#### Phase 3: Manual Code Review (Violations found)
- For each violation, examine context
- Determine severity and appropriate fix
- Suggest migration to slog where appropriate

## Output Format

For each finding, report:
```markdown
### Finding Summary
- **File**: path/to/file.go
- **Line**: line_number
- **Offending snippet**: code snippet
- **Why wrong**: Rule violated (describe)
- **Concrete fix**: specific change to fix

### Good Pattern Examples
- **File**: path/to/correct-logging.go
- **Line**: line_number
- **Good pattern**: code example showing correct slog usage
```

## Priority Ranking

### High Severity (Immediate)
1. PII exposure in logs (Rule 4)
2. Technical errors exposed to users (Rule 7)
3. Use of fmt.Printf/println for errors (Rule 1)

### Medium Severity (Should Fix)
1. Missing structured error logging (Rule 2)
2. High-cardinality data in message templates (Rule 3)
3. Missing HTTP request middleware (Rule 6)

### Low Severity (Nice to have)
1. Incorrect log levels (Rule 5)

## Timeline
- Start with import analysis (Phase 1)
- Run pattern-based searches (Phase 2)
- Manual review of violations (Phase 3)
- Generate comprehensive report with examples
- Provide migration strategy for slog adoption

## Tools Required
- grep with regex patterns
- Go file analysis scripts
- Priority queue for issue tracking

## Expected Deliverables
1. Comprehensive audit report
2. List of all violations with severity
3. Migration recommendations
4. Examples of good logging patterns
5. Performance impact assessment

## Next Steps
1. Begin import analysis across all 123 .go files
2. Run pattern-based searches for each rule
3. Review and categorize findings
4. Create detailed issue tracker
5. Provide remediation guidance