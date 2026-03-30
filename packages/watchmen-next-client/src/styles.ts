export const style = `
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b1020; color: #eef2ff; }
.wm-shell { display: grid; grid-template-columns: 270px 1fr; min-height: 100vh; }
.wm-nav { border-right: 1px solid #1f2a44; background: #0f172a; padding: 24px 16px; }
.wm-logo { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.wm-subtitle { color: #8ca3d7; font-size: 12px; margin-bottom: 18px; }
.wm-menu { display: flex; flex-direction: column; gap: 8px; }
.wm-menu-item { border: 1px solid transparent; border-radius: 10px; padding: 10px 12px; cursor: pointer; color: #c7d2fe; }
.wm-menu-item.active { border-color: #3758f9; background: #15264f; color: #ffffff; }
.wm-main { padding: 20px; display: grid; grid-template-columns: 1fr 360px; gap: 16px; }
.wm-content { display: flex; flex-direction: column; gap: 14px; }
.wm-side { display: flex; flex-direction: column; gap: 14px; }
.wm-card { border: 1px solid #1f2a44; border-radius: 14px; background: #111a31; padding: 14px; }
.wm-title { margin: 0 0 10px; font-size: 16px; font-weight: 700; }
.wm-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.wm-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.wm-kpi { border: 1px solid #283b67; border-radius: 10px; padding: 10px; background: #0e1830; }
.wm-kpi-label { color: #8ca3d7; font-size: 12px; }
.wm-kpi-value { font-size: 22px; font-weight: 700; margin-top: 6px; }
.wm-list { display: flex; flex-direction: column; gap: 8px; }
.wm-list-item { border: 1px solid #283b67; border-radius: 10px; background: #0d1730; padding: 10px; }
.wm-badge { display: inline-flex; align-items: center; font-size: 11px; border-radius: 999px; padding: 3px 8px; margin-left: 8px; }
.wm-badge.high { background: #4a1822; color: #ff9fb0; }
.wm-badge.medium { background: #4d3d14; color: #ffd98f; }
.wm-badge.low { background: #1b3f2b; color: #9ef0b9; }
.wm-btn-group { display: flex; gap: 8px; margin-top: 8px; }
.wm-btn { border: 1px solid #3451a3; background: #15264f; color: #dbe6ff; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 12px; }
.wm-btn.reject { border-color: #80404f; background: #3e1b25; color: #ffc8d2; }
.wm-btn.investigate { border-color: #6e612b; background: #3d3615; color: #ffe5a5; }
.wm-timeline { border-left: 2px solid #3758f9; padding-left: 10px; display: flex; flex-direction: column; gap: 8px; }
.wm-tab { border: 1px solid #283b67; background: #0d1730; color: #d3ddff; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
.wm-tab.active { background: #1f3571; border-color: #5373ff; color: white; }
.wm-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.wm-mini { color: #8ca3d7; font-size: 12px; }
.wm-impact { color: #ff8fa4; font-weight: 600; }
.wm-flow { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; align-items: center; }
.wm-flow-item { border: 1px solid #273761; border-radius: 10px; padding: 10px; text-align: center; font-size: 12px; background: #0d1730; }
`;
