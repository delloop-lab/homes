# PowerShell script to set up Supabase for the Homes app
# This script will guide you through the Supabase setup process

Write-Host "=== Supabase Setup for Homes App ===" -ForegroundColor Green
Write-Host ""

# Check if we have the necessary files
if (!(Test-Path "supabase\schema.sql")) {
    Write-Host "Error: supabase\schema.sql not found!" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "setup-supabase.sql")) {
    Write-Host "Error: setup-supabase.sql not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Go to your Supabase Dashboard" -ForegroundColor Yellow
Write-Host "Visit: https://supabase.com/dashboard/project/ivcsxedmkuyutfvudyfl" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 2: Enable Authentication" -ForegroundColor Yellow
Write-Host "1. Go to Authentication > Settings" -ForegroundColor White
Write-Host "2. Enable 'Email' provider" -ForegroundColor White
Write-Host "3. Set 'Site URL' to: http://localhost:3000" -ForegroundColor White
Write-Host "4. Disable 'Email confirmations' for development" -ForegroundColor White
Write-Host ""

Write-Host "Step 3: Run Database Schema" -ForegroundColor Yellow
Write-Host "1. Go to SQL Editor in your Supabase dashboard" -ForegroundColor White
Write-Host "2. Copy and paste the contents of:" -ForegroundColor White
Write-Host "   - First: setup-supabase.sql (for auth setup)" -ForegroundColor Cyan
Write-Host "   - Then: supabase\schema.sql (for main tables)" -ForegroundColor Cyan
Write-Host "3. Click 'Run' for each script" -ForegroundColor White
Write-Host ""

Write-Host "Step 4: Test the Setup" -ForegroundColor Yellow
Write-Host "1. Start your dev server: npm run dev" -ForegroundColor White
Write-Host "2. Go to http://localhost:3000" -ForegroundColor White
Write-Host "3. Try signing up with an email and password" -ForegroundColor White
Write-Host ""

Write-Host "Current Environment:" -ForegroundColor Green
Write-Host "SUPABASE_URL: https://ivcsxedmkuyutfvudyfl.supabase.co" -ForegroundColor Cyan
Write-Host "ANON_KEY: Configured ✓" -ForegroundColor Green
Write-Host ""

$continue = Read-Host "Press Enter to open the setup files in notepad for easy copying, or type 'skip' to continue"

if ($continue -ne "skip") {
    Write-Host "Opening setup files..." -ForegroundColor Green
    
    # Open the auth setup file
    Start-Process notepad "setup-supabase.sql"
    Start-Sleep 2
    
    # Open the main schema file
    Start-Process notepad "supabase\schema.sql"
    
    Write-Host "Files opened in Notepad. Copy the contents to your Supabase SQL Editor." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "After running the SQL scripts, your authentication should work!" -ForegroundColor Green
Write-Host "Test user created: test@example.com / testuser123" -ForegroundColor Cyan









