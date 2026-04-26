
$path = "c:\Users\USER\Desktop\shreya\AI_Companion\frontend\src\components\ChatExperience.tsx"
$content = [IO.File]::ReadAllText($path)

# 1. Update handleSubmit
$oldSubmit = '    setInput("");'
$newSubmit = '    const detected = detectMood(text);
    if (detected) {
      setVisualTheme("vibe");
      setVibeMood(detected);
    }

    setInput("");'

$content = $content.Replace($oldSubmit, $newSubmit)

# 2. Update Settings Drawer
$oldDrawer = '              <div className="dashboard-drawer-settings-menu">
                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={openProfileUpdateModal}
                >
                  <UserAvatarIcon />
                  <span>Profile Update</span>
                </button>
                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={() => setSettingsView("theme")}
                >
                  <ThemeIcon mode={themeMode} />
                  <span>Theme Settings</span>
                </button>
                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={() => setSettingsView("subscription")}
                >
                  <PricingIcon />
                  <span className="flex-between">
                    Subscription 
                    <span className="upgrade-badge">Upgrade</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={() => openSettingsSection("activity")}
                >
                  <GridIcon />
                  <span>Activity</span>
                </button>
                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={() => openSupportModal("help")}
                >
                  <HelpIcon />
                  <span>Help Center</span>
                </button>
                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={() => openSupportModal("terms")}
                >
                  <ShieldIcon />
                  <span>Terms & Conditions</span>
                </button>
              </div>'

$newDrawer = '              <div className="dashboard-drawer-settings-menu">
                {settingsView === "main" ? (
                  <>
                    <button
                      type="button"
                      className="workspace-quick-action workspace-quick-action--sub"
                      onClick={openProfileUpdateModal}
                    >
                      <UserAvatarIcon />
                      <span>Profile Update</span>
                    </button>
                    <button
                      type="button"
                      className="workspace-quick-action workspace-quick-action--sub"
                      onClick={() => setSettingsView("theme")}
                    >
                      <ThemeIcon mode={themeMode} />
                      <span>Theme Settings</span>
                    </button>
                    <button
                      type="button"
                      className="workspace-quick-action workspace-quick-action--sub"
                      onClick={() => setSettingsView("subscription")}
                    >
                      <PricingIcon />
                      <span className="flex-between">
                        Subscription 
                        <span className="upgrade-badge">Upgrade</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="workspace-quick-action workspace-quick-action--sub"
                      onClick={() => openSettingsSection("activity")}
                    >
                      <GridIcon />
                      <span>Activity</span>
                    </button>
                    <button
                      type="button"
                      className="workspace-quick-action workspace-quick-action--sub"
                      onClick={() => openSupportModal("help")}
                    >
                      <HelpIcon />
                      <span>Help Center</span>
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

$content = $content.Replace($oldDrawer, $newDrawer)

[IO.File]::WriteAllText($path, $content)
