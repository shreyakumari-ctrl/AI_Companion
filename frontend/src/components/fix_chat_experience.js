const fs = require('fs');
const path = 'c:/Users/USER/Desktop/shreya/AI_Companion/frontend/src/components/ChatExperience.tsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const newSettingsContent = `              <div className="dashboard-drawer-settings-menu">
                {settingsView === "main" ? (
                  <>
                    <div className="settings-group">
                      <div className="settings-group-title">Account & Profile</div>
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
                        onClick={() => openSettingsSection("activity")}
                      >
                        <GridIcon />
                        <span>Activity Feed</span>
                      </button>
                    </div>

                    <div className="settings-group">
                      <div className="settings-group-title">Experience</div>
                      <button
                        type="button"
                        className="workspace-quick-action workspace-quick-action--sub"
                        onClick={() => setSettingsView("theme")}
                      >
                        <ThemeIcon mode={themeMode} />
                        <span>Appearance & Mood</span>
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
                    </div>

                    <div className="settings-group">
                      <div className="settings-group-title">Support & Legal</div>
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
                    </div>
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
                      className={`workspace-quick-action workspace-quick-action--sub \${themeMode === "light" ? "is-active" : ""}`}
                      onClick={() => setThemeMode("light")}
                    >
                      <ThemeIcon mode="light" />
                      <span>Light Mode</span>
                    </button>
                    <button
                      type="button"
                      className={`workspace-quick-action workspace-quick-action--sub \${themeMode === "dark" ? "is-active" : ""}`}
                      onClick={() => setThemeMode("dark")}
                    >
                      <ThemeIcon mode="dark" />
                      <span>Dark Mode</span>
                    </button>
                    <div className="nested-settings-divider" />
                    <div className="nested-settings-label">Visual Style</div>
                    <button
                      type="button"
                      className={`workspace-quick-action workspace-quick-action--sub \${visualTheme === "default" ? "is-active" : ""}`}
                      onClick={() => setVisualTheme("default")}
                    >
                      <span>Default Clean</span>
                    </button>
                    <button
                      type="button"
                      className={`workspace-quick-action workspace-quick-action--sub \${visualTheme === "vibe" ? "is-active" : ""}`}
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
                      <div className="subscription-card-premium-glow" />
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
              </div>`;

// Replace lines from 2232 to 2364 (index 2231 to 2363)
lines.splice(2231, 2364 - 2232 + 1, newSettingsContent);

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Successfully updated ChatExperience.tsx');
