# opencode-init.ps1
# Initialize OpenCode in a new repository on Windows (PowerShell).
# Creates required directories and directory junctions/symlinks for global skills and bin tools.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Write-Host "Initializing OpenCode in $(Get-Location)..." -ForegroundColor Cyan

# 1. Create .opencode directory
$localOpencode = Join-Path (Get-Location) ".opencode"
if (-not (Test-Path $localOpencode)) {
    New-Item -ItemType Directory -Path $localOpencode -Force | Out-Null
    Write-Host "Created directory: .opencode" -ForegroundColor Green
}

$userProfile = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }
$globalConfig = Join-Path $userProfile ".config\opencode"

# Helper function to create junction or symlink
function Link-GlobalDirectory {
    param(
        [string]$GlobalPath,
        [string]$LocalPath,
        [string]$Label
    )

    if (Test-Path $GlobalPath) {
        if (-not (Test-Path $LocalPath)) {
            try {
                # Directory Junction works without admin/developer mode privileges on Windows
                New-Item -ItemType Junction -Path $LocalPath -Target $GlobalPath -Force | Out-Null
                Write-Host "Junction created for $Label`: $LocalPath -> $GlobalPath" -ForegroundColor Green
            } catch {
                try {
                    New-Item -ItemType SymbolicLink -Path $LocalPath -Target $GlobalPath -Force | Out-Null
                    Write-Host "Symlink created for $Label`: $LocalPath -> $GlobalPath" -ForegroundColor Green
                } catch {
                    Write-Warning "Could not create link for $Label`: $_"
                }
            }
        } else {
            Write-Host "Directory or link already exists at $LocalPath" -ForegroundColor Yellow
        }
    } else {
        Write-Warning "Global $Label directory not found at $GlobalPath"
    }
}

# 2. Link global skills
$globalSkills = Join-Path $globalConfig "skills"
$localSkills = Join-Path $localOpencode "skills"
Link-GlobalDirectory -GlobalPath $globalSkills -LocalPath $localSkills -Label "skills"

# 3. Link global bin (ast-index and other CLI tools)
$globalBin = Join-Path $globalConfig "bin"
$localBin = Join-Path $localOpencode "bin"
Link-GlobalDirectory -GlobalPath $globalBin -LocalPath $localBin -Label "bin"

# 4. Update .gitignore
$gitignorePath = Join-Path (Get-Location) ".gitignore"
$ignoreEntries = @(
    ".opencode/task_state.md",
    ".opencode/repomap.txt"
)

if (Test-Path $gitignorePath) {
    $content = Get-Content $gitignorePath -Raw -ErrorAction SilentlyContinue
    $missingEntries = @()
    foreach ($entry in $ignoreEntries) {
        if ($content -notmatch [regex]::Escape($entry)) {
            $missingEntries += $entry
        }
    }
    if ($missingEntries.Count -gt 0) {
        $append = "`n# OpenCode`n" + ($missingEntries -join "`n") + "`n"
        Add-Content -Path $gitignorePath -Value $append
        Write-Host "Updated .gitignore with OpenCode entries." -ForegroundColor Green
    }
} else {
    $initial = "# OpenCode`n" + ($ignoreEntries -join "`n") + "`n"
    Set-Content -Path $gitignorePath -Value $initial
    Write-Host "Created .gitignore with OpenCode entries." -ForegroundColor Green
}

Write-Host "Initialization complete!" -ForegroundColor Cyan
