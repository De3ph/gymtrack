$ErrorActionPreference = "Stop"

# Base URL
$baseUrl = "http://localhost:8080/api"

# 1. Register
$email = "test_athlete_$(Get-Random)@example.com"
$password = "password123"
$registerBody = @{
    email = $email
    password = $password
    role = "athlete"
    name = "Test Athlete"
    age = 25
} | ConvertTo-Json

Write-Host "Registering user $email..."
try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
} catch {
    Write-Host "Register failed: $_"
    exit 1
}

# 2. Login
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

Write-Host "Logging in..."
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Got token: $token"
} catch {
    Write-Host "Login failed: $_"
    exit 1
}

# 3. Log Workout
$date = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
$workoutBody = @{
    date = $date
    exercises = @(
        @{
            name = "Bodyweight Squat"
            weight = 0
            weightUnit = "kg"
            sets = 3
            reps = @(10, 10, 10)
            restTime = 60
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Attempting to create workout with weight 0..."
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $workoutResponse = Invoke-RestMethod -Uri "$baseUrl/workouts" -Method Post -Body $workoutBody -Headers $headers
    Write-Host "Success!"
    Write-Host ($workoutResponse | ConvertTo-Json)
} catch {
    Write-Host "Failed. Status: $($_.Exception.Response.StatusCode)"
    
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = [System.IO.StreamReader]::new($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Error Body: $body"
    }
}
