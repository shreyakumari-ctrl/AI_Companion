import os

file_path = r'c:\Users\USER\Desktop\shreya\AI_Companion\frontend\src\components\ChatExperience.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for the corrupted block
corrupted_start = '<span>Features</span>\n              </button>\n              <button\n                type="button"\n                className="workspace-quick-action"\n                onClick={() => {\n                  handleStartFreshChat();\n                  setPanelOpen(false);\n                }}\n              >\n                  <p className="dashboard-sidebar__eyebrow">Quick prompt</p>'

# Actually, it's easier to just replace from a known good line to another known good line.
marker_start = '<span>Chats</span>'
marker_after = '{activePanelTab === "features" ? ('

# Find the start and the next stable point after the corruption
start_idx = content.find(marker_start)
# We know the Features tab button comes after. Let's find the end of the Features button first.
features_end_marker = '<span>Features</span>\n              </button>\n            </div>'

# Actually, the sidebar structure I want is:
new_sidebar_section = """<span>Chats</span>
              </button>
              <button
                type="button"
                className={`workspace-quick-action ${
                  activePanelTab === "features" ? "is-active" : ""
                }`}
                onClick={() => setActivePanelTab("features")}
              >
                <GridIcon />
                <span>Features</span>
              </button>
            </div>

            <div className="dashboard-sidebar__actions">
              <button
                type="button"
                className="workspace-quick-action"
                onClick={handleNewChat}
              >
                <SparkIcon />
                <span>New chat</span>
              </button>
              <button
                type="button"
                className="workspace-quick-action"
                onClick={() => {
                  handleWorkspaceAction("search");
                  setPanelOpen(false);
                }}
              >
                <SearchIcon />
                <span>Search</span>
              </button>
              <button
                type="button"
                className="workspace-quick-action"
                style={{ color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' }}
                onClick={() => {
                  setThemeModalOpen(true);
                }}
              >
                <CustomizeIcon />
                <span style={{ fontWeight: 700 }}>Vibe Designer</span>
              </button>
            </div>

            {activePanelTab === "chats" ? (
              <div className="dashboard-panel-stack dashboard-panel-stack--chats">
                <div className="dashboard-sidebar__section">
                  <p className="dashboard-sidebar__label">Recent Chats</p>
                  <div className="dashboard-history">
                    {historyItems.length ? (
                      historyItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`dashboard-history__item ${
                            item.id === conversationId ? "is-active" : ""
                          }`}
                          onClick={() => {
                            const matchedConversation = savedConversations.find(
                              (conversation) => conversation.id === item.id,
                            );

                            if (matchedConversation) {
                              void loadConversation(matchedConversation);
                              return;
                            }

                            handleRetryFromText(item.preview);
                            setPanelOpen(false);
                          }}
                        >
                          <strong>{item.title}</strong>
                          <span>{item.preview}</span>
                        </button>
                      ))
                    ) : (
                      <div className="dashboard-history__empty">
                        Your chats will show up here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activePanelTab === "features" ? ("""

# We'll replace everything from <span>Chats</span> to the next {activePanelTab === "features" ? (
target_end_marker = '{activePanelTab === "features" ? ('
end_idx = content.find(target_end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_sidebar_section + " " + content[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Sidebar repaired.")
else:
    print(f"FAILED: Could not find markers. start: {start_idx}, end: {end_idx}")
