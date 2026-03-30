export const style = `
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b1020; color: #eef2ff; }
.wm-shell { display: grid; grid-template-columns: 270px 1fr; min-height: 100vh; }
.wm-nav { border-right: 1px solid #1f2a44; background: #0f172a; padding: 24px 16px; }
.wm-logo { font-size: 20px; font-weight: 700; margin-bottom: 5px; }
.wm-subtitle { color: #8ca3d7; font-size: 12px; margin-bottom: 24px; }
.wm-menu { display: flex; flex-direction: column; gap: 8px; }
.wm-menu-item { border: 1px solid transparent; border-radius: 10px; padding: 10px 12px; cursor: pointer; color: #c7d2fe; transition: all 0.2s;}
.wm-menu-item:hover { background: #15264f; }
.wm-menu-item.active { border-color: #3758f9; background: #15264f; color: #ffffff; font-weight: bold; }
.wm-main { padding: 20px; display: grid; grid-template-columns: 1fr 400px; gap: 20px; height: 100vh; overflow: hidden; }
.wm-content { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; padding-right: 10px;}
.wm-side { display: flex; flex-direction: column; border-left: 1px solid #1f2a44; padding-left: 20px; height: 100%; }

.wm-card { border: 1px solid #1f2a44; border-radius: 14px; background: #111a31; padding: 16px; margin-bottom: 14px;}
.wm-title { margin: 0 0 10px; font-size: 16px; font-weight: 700; }
.wm-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.wm-kpi { border: 1px solid #283b67; border-radius: 10px; padding: 10px; background: #0e1830; }
.wm-kpi-label { color: #8ca3d7; font-size: 12px; }
.wm-kpi-value { font-size: 22px; font-weight: 700; margin-top: 6px; }
.wm-list { display: flex; flex-direction: column; gap: 8px; }
.wm-list-item { border: 1px solid #283b67; border-radius: 10px; background: #0d1730; padding: 12px; }

.wm-badge { display: inline-flex; align-items: center; font-size: 11px; border-radius: 999px; padding: 3px 8px; margin-left: 8px; font-weight: bold;}
.wm-badge.high { background: #4a1822; color: #ff9fb0; }
.wm-badge.medium { background: #4d3d14; color: #ffd98f; }
.wm-badge.low { background: #1b3f2b; color: #9ef0b9; }

.wm-mini { color: #8ca3d7; font-size: 12px; margin-top: 4px; line-height: 1.4;}

/* Chat Panel Styles */
.wm-chat-container { display: flex; flex-direction: column; height: 100%; }
.wm-chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding-bottom: 20px; }
.wm-chat-msg { display: flex; flex-direction: column; gap: 6px; max-width: 90%; }
.wm-chat-msg.user { align-self: flex-end; }
.wm-chat-msg.assistant { align-self: flex-start; }
.wm-chat-bubble { padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.5; }
.wm-chat-msg.user .wm-chat-bubble { background: #3758f9; color: white; border-bottom-right-radius: 4px; }
.wm-chat-msg.assistant .wm-chat-bubble { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-bottom-left-radius: 4px; }
.wm-chat-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.wm-chat-action-btn { background: #0f172a; border: 1px solid #3b82f6; color: #93c5fd; padding: 6px 12px; border-radius: 999px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.wm-chat-action-btn:hover { background: #1e3a8a; color: white; }
.wm-chat-input-area { margin-top: auto; padding-top: 16px; border-top: 1px solid #1f2a44; display: flex; gap: 10px; }
.wm-chat-input { flex: 1; background: #0f172a; border: 1px solid #334155; border-radius: 20px; padding: 12px 16px; color: white; font-size: 14px; outline: none; }
.wm-chat-input:focus { border-color: #3758f9; }
.wm-chat-send { background: #3758f9; color: white; border: none; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.wm-chat-send:hover { background: #2546e0; }
`;
