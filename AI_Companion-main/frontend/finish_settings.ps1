
$path = "c:\Users\USER\Desktop\shreya\AI_Companion\frontend\src\components\ChatExperience.tsx"
$content = [IO.File]::ReadAllText($path)

# Update Settings Drawer Views
Write-Host "Updating Settings Drawer Views..."

$oldBlock = '                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={() => openSupportModal("terms")}
                >
                  <ShieldIcon />
                  <span>Terms & Conditions</span>
                </button>
              </div>'

$newBlock = '                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={() => openSupportModal("terms")}
                >
                  <ShieldIcon />
                  <span>Terms & Conditions</span>
                </button>
              </>
            ) : settingsView === "theme" ? (
              <>
                <button 
                  type="button" 
                  className="settings-back-btn"
                  onClick={() => setSettingsView("main")}
                >
                  ← Back to settings
                </button>
                <div className="nested-settings-title">Appearance</div>
                <button
                  type="button"
                  className={`workspace-quick-action workspace-quick-action--sub ${themeMode === "light" ? "is-active" : ""}`}
                  onClick={() => setThemeMode("light")}
                >
                  <ThemeIcon mode="light" />
                  <span>Light Mode</span>
                </button>
                <button
                  type="button"
                  className={`workspace-quick-action workspace-quick-action--sub ${themeMode === "dark" ? "is-active" : ""}`}
                  onClick={() => setThemeMode("dark")}
                >
                  <ThemeIcon mode="dark" />
                  <span>Dark Mode</span>
                </button>
                <div className="nested-settings-divider" />
                <div className="nested-settings-label">Visual Style</div>
                <button
                  type="button"
                  className={`workspace-quick-action workspace-quick-action--sub ${visualTheme === "default" ? "is-active" : ""}`}
                  onClick={() => setVisualTheme("default")}
                >
                  <span>Default Clean</span>
                </button>
                <button
                  type="button"
                  className={`workspace-quick-action workspace-quick-action--sub ${visualTheme === "vibe" ? "is-active" : ""}`}
                  onClick={() => setVisualTheme("vibe")}
                >
                  <span>AI Vibe (Auto Mood)</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button" 
                  className="settings-back-btn"
                  onClick={() => setSettingsView("main")}
                >
                  ← Back to settings
                </button>
                <div className="nested-settings-title">Subscription</div>
                <div className="subscription-card-compact">
                  <strong>Free Plan</strong>
                  <p>Basic features & standard AI speed</p>
                  <button 
                    type="button" 
                    className="upgrade-action-btn"
                    onClick={() => {
                      router.push("/pricing");
                      setPanelOpen(false);
                    }}
                  >
                    Upgrade to Pro
                  </button>
                </div>
              </>
            )}
          </div>'

if ($content.Contains($oldBlock)) {
    $content = $content.Replace($oldBlock, $newBlock)
    Write-Host "Drawer views updated."
} else {
    # Try with different line endings if the first match fails
    $oldBlockUnix = $oldBlock.Replace("`r`n", "`n")
    if ($content.Contains($oldBlockUnix)) {
        $content = $content.Replace($oldBlockUnix, $newBlock)
        Write-Host "Drawer views updated (Unix-style)."
    } else {
        Write-Host "ERROR: Could not find settings terms button block."
    }
}

[IO.File]::WriteAllText($path, $content)
Write-Host "Done."
