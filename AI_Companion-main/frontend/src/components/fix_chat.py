import sys
import io

path = r'c:\Users\USER\Desktop\shreya\AI_Companion\frontend\src\components\ChatExperience.tsx'
with io.open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_content = """                    <div className="settings-group">
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
                    </button>"""

new_lines = [l + '\n' for l in new_content.split('\n')]

# Replacing lines 2235 to 2302 (index 2234 to 2302)
# Wait, let's verify line numbers again from view_file output.
# 2234:                   <>
# 2235:                 <button
# ...
# 2301:                   â†  Back to settings
# 2302:                 </button> (close back button)
# 2303:                 <div className="nested-settings-title">Appearance</div>

# So I want to replace everything between 2235 and 2302.
# Index 2234 to 2302.
lines[2234:2302] = new_lines

# Fix the remaining arrow at 2344 (now shifted)
for i in range(len(lines)):
    if 'â†' in lines[i] and 'Back to settings' in lines[i]:
        lines[i] = lines[i].replace('â†', '←')

with io.open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Successfully fixed' + path)
