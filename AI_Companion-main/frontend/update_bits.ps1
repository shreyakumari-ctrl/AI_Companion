
$path = "c:\Users\USER\Desktop\shreya\AI_Companion\frontend\src\components\ChatExperience.tsx"
$content = [IO.File]::ReadAllText($path)

# Check if handleSubmit is already updated
if ($content -like "*detectMood(text)*") {
    Write-Host "handleSubmit already updated."
} else {
    Write-Host "Updating handleSubmit..."
    $oldSubmit = '    setInput("");'
    $newSubmit = '    const detected = detectMood(text);
    if (detected) {
      setVisualTheme("vibe");
      setVibeMood(detected);
    }

    setInput("");'
    $content = $content.Replace($oldSubmit, $newSubmit)
}

# Update Settings Drawer
Write-Host "Updating Settings Drawer..."
$oldDiv = '              <div className="dashboard-drawer-settings-menu">'
$newDiv = '              <div className="dashboard-drawer-settings-menu">
                {settingsView === "main" ? (
                  <>'

if ($content.Contains($oldDiv)) {
    $content = $content.Replace($oldDiv, $newDiv)
    Write-Host "Drawer opening updated."
} else {
    Write-Host "ERROR: Could not find drawer opening div."
}

[IO.File]::WriteAllText($path, $content)
Write-Host "Done."
