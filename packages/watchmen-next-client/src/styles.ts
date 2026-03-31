export const style = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
	--bg-main: #F3F6FB;
	--bg-card: #FFFFFF;
	--bg-card-hover: #F7FAFF;
	--bg-sidebar: #FFFFFF;
	--bg-sidebar-hover: #F2F6FF;
	--bg-sidebar-active: #EAF1FF;
	--bg-detail: #FFFFFF;
	--bg-detail-card: #F8FAFD;
	--bg-input: #F1F5F9;
	--border-light: #E2E8F0;
	--border-sidebar: #E6ECF5;
	--text-primary: #1E293B;
	--text-secondary: #475569;
	--text-tertiary: #64748B;
	--text-sidebar: #475569;
	--text-sidebar-active: #1D4ED8;
	--text-detail: #1E293B;
	--text-detail-secondary: #64748B;
	--blue-50: #EEF4FF;
	--blue-100: #E0EAFF;
	--blue-400: #60A5FA;
	--blue-500: #3B82F6;
	--blue-600: #2563EB;
	--blue-700: #1D4ED8;
	--green-50: #ECFDF3;
	--green-500: #22C55E;
	--green-600: #16A34A;
	--orange-50: #FFF7ED;
	--orange-100: #FFEDD5;
	--orange-400: #FB923C;
	--orange-500: #F97316;
	--orange-600: #EA580C;
	--red-50: #FEF2F2;
	--red-400: #F87171;
	--red-500: #EF4444;
	--gray-100: #F1F5F9;
	--gray-200: #E2E8F0;
	--gray-400: #CBD5E1;
	--gray-500: #94A3B8;
	--gray-600: #64748B;
	--shadow-sm: 0 1px 2px rgba(15,23,42,0.05);
	--shadow-md: 0 6px 18px rgba(15,23,42,0.08);
	--shadow-lg: 0 12px 32px rgba(15,23,42,0.12);
	--radius-sm: 8px;
	--radius-md: 12px;
	--radius-lg: 16px;
	--radius-xl: 20px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
	font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	background: var(--bg-main);
	color: var(--text-primary);
	font-size: 14px;
	line-height: 1.5;
	-webkit-font-smoothing: antialiased;
}

/* ===== Layout ===== */
.wm-shell {
	display: grid;
	grid-template-columns: 248px 1fr;
	min-height: 100vh;
}

/* ===== Sidebar ===== */
.wm-sidebar {
	background: var(--bg-sidebar);
	display: flex;
	flex-direction: column;
	padding: 18px 14px 14px;
	gap: 14px;
	border-right: 1px solid var(--border-sidebar);
	position: sticky;
	top: 0;
	height: 100vh;
	box-shadow: inset -1px 0 0 rgba(148, 163, 184, 0.08);
}

.wm-sidebar-head {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 8px 10px;
}

.wm-sidebar-logo {
	width: 36px;
	height: 36px;
	border-radius: 12px;
	background: linear-gradient(135deg, var(--blue-500), var(--blue-600));
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	font-weight: 700;
	color: white;
	box-shadow: 0 8px 18px rgba(37, 99, 235, 0.28);
	letter-spacing: -0.5px;
}

.wm-sidebar-brand-title {
	font-size: 14px;
	font-weight: 700;
	color: var(--text-primary);
	line-height: 1.1;
}

.wm-sidebar-brand-sub {
	font-size: 11px;
	color: var(--text-tertiary);
	margin-top: 2px;
}

.wm-nav-items {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
	padding: 4px;
	border: 1px solid var(--border-light);
	border-radius: 14px;
	background: linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%);
}

.wm-nav-item {
	width: 100%;
	height: 44px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: flex-start;
	padding: 0 12px;
	gap: 10px;
	cursor: pointer;
	transition: all 0.2s ease;
	position: relative;
	color: var(--text-sidebar);
	font-size: 14px;
	font-weight: 600;
	border: none;
	background: transparent;
}

.wm-nav-item:hover {
	background: var(--bg-sidebar-hover);
	color: var(--text-primary);
}

.wm-nav-item.active {
	background: var(--bg-sidebar-active);
	color: var(--text-sidebar-active);
	box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.16);
}

.wm-nav-icon {
	font-size: 16px;
	width: 18px;
	text-align: center;
	opacity: 0.9;
}

.wm-nav-label {
	letter-spacing: 0.1px;
}

.wm-nav-badge {
	position: absolute;
	top: 10px;
	right: 10px;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	border-radius: 50%;
	background: var(--orange-500);
	color: white;
	font-size: 10px;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid #fff;
	animation: pulse-badge 2s ease-in-out infinite;
}

@keyframes pulse-badge {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.1); }
}

.wm-sidebar-foot {
	font-size: 11px;
	color: var(--text-tertiary);
	padding: 0 8px 6px;
	text-align: center;
	line-height: 1.35;
}

/* ===== Main Content ===== */
.wm-main-content {
	display: flex;
	flex-direction: column;
	height: 100vh;
	overflow: hidden;
	background: linear-gradient(180deg, #F4F7FB 0%, #F8FAFD 100%);
}

.wm-scroll-area {
	flex: 1;
	overflow-y: auto;
	padding: 24px 28px;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.wm-scroll-area::-webkit-scrollbar {
	width: 6px;
}
.wm-scroll-area::-webkit-scrollbar-track {
	background: transparent;
}
.wm-scroll-area::-webkit-scrollbar-thumb {
	background: var(--gray-400);
	border-radius: 3px;
}

/* ===== Perceive Page ===== */
.wm-perceive-page {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-width: 0;
}

.wm-perceive-main {
	display: grid;
	grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
	gap: 16px;
	align-items: start;
}

.wm-perceive-timeline,
.wm-perceive-detail {
	min-width: 0;
}

/* ===== KPI Bar ===== */
.wm-kpi-bar {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 16px;
}

.wm-kpi-card {
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-md);
	padding: 20px;
	box-shadow: var(--shadow-sm);
	transition: all 0.2s ease;
	position: relative;
	overflow: hidden;
}

.wm-kpi-card:hover {
	box-shadow: var(--shadow-md);
	transform: translateY(-1px);
}

.wm-kpi-card::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 3px;
}

.wm-kpi-card.orange::before { background: linear-gradient(90deg, var(--orange-500), var(--orange-400)); }
.wm-kpi-card.green::before { background: linear-gradient(90deg, var(--green-600), var(--green-500)); }
.wm-kpi-card.gray::before { background: linear-gradient(90deg, var(--gray-500), var(--gray-400)); }
.wm-kpi-card.blue::before { background: linear-gradient(90deg, var(--blue-600), var(--blue-400)); }

.wm-kpi-label {
	font-size: 12px;
	font-weight: 500;
	color: var(--text-tertiary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.wm-kpi-value {
	font-size: 32px;
	font-weight: 700;
	margin-top: 8px;
	line-height: 1;
}

.wm-kpi-card.orange .wm-kpi-value { color: var(--orange-600); }
.wm-kpi-card.green .wm-kpi-value { color: var(--green-600); }
.wm-kpi-card.gray .wm-kpi-value { color: var(--text-secondary); }
.wm-kpi-card.blue .wm-kpi-value { color: var(--blue-600); }

.wm-kpi-sub {
	font-size: 12px;
	color: var(--text-tertiary);
	margin-top: 6px;
}

/* ===== Event Timeline ===== */
.wm-section-card {
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-lg);
	box-shadow: var(--shadow-sm);
	overflow: hidden;
}

.wm-section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18px 24px;
	border-bottom: 1px solid var(--border-light);
}

.wm-section-title {
	font-size: 16px;
	font-weight: 700;
	color: var(--text-primary);
}

.wm-filter-tabs {
	display: flex;
	gap: 4px;
	background: var(--bg-input);
	border-radius: 8px;
	padding: 3px;
}

.wm-filter-tab {
	padding: 6px 14px;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s;
	border: none;
	background: transparent;
	color: var(--text-secondary);
}

.wm-filter-tab:hover { color: var(--text-primary); }

.wm-filter-tab.active {
	background: var(--bg-card);
	color: var(--text-primary);
	box-shadow: var(--shadow-sm);
}

.wm-event-list {
	display: flex;
	flex-direction: column;
}

.wm-event-item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px 24px;
	cursor: pointer;
	transition: all 0.15s ease;
	border-bottom: 1px solid var(--border-light);
	position: relative;
}

.wm-event-item:last-child { border-bottom: none; }

.wm-event-item:hover {
	background: var(--bg-card-hover);
}

.wm-event-item.selected {
	background: var(--blue-50);
}

.wm-event-item.pending-item {
	background: var(--orange-50);
}

.wm-event-item.pending-item.selected {
	background: linear-gradient(90deg, var(--orange-50), var(--blue-50));
}

.wm-severity-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	flex-shrink: 0;
}

.wm-severity-dot.critical { background: var(--orange-500); box-shadow: 0 0 8px rgba(232, 89, 12, 0.4); }
.wm-severity-dot.warning { background: var(--orange-400); }
.wm-severity-dot.info { background: var(--blue-400); }

.wm-event-info { flex: 1; min-width: 0; }

.wm-event-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.wm-event-meta {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
	margin-top: 4px;
	font-size: 12px;
	color: var(--text-tertiary);
}

.wm-event-topic {
	display: inline-flex;
	padding: 2px 8px;
	background: var(--gray-100);
	border-radius: 4px;
	font-weight: 500;
	color: var(--text-secondary);
}

.wm-status-badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	font-weight: 600;
	border-radius: 999px;
	padding: 4px 10px;
	white-space: nowrap;
}

.wm-status-badge.pending {
	background: var(--orange-100);
	color: var(--orange-600);
}

.wm-status-badge.approved {
	background: var(--green-50);
	color: var(--green-600);
}

.wm-status-badge.rejected {
	background: var(--gray-100);
	color: var(--gray-600);
}

.wm-status-badge.pending::before {
	content: '';
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--orange-500);
	animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.4; }
}

.wm-confidence {
	font-size: 11px;
	font-weight: 600;
	color: var(--text-tertiary);
	white-space: nowrap;
}

/* ===== Detail Panel ===== */
.wm-detail-panel {
	background: var(--bg-detail);
	border-radius: var(--radius-lg);
	border: 1px solid var(--border-light);
	box-shadow: var(--shadow-sm);
	overflow: hidden;
	animation: slideDown 0.3s ease;
}

@keyframes slideDown {
	from { opacity: 0; transform: translateY(-8px); }
	to { opacity: 1; transform: translateY(0); }
}

.wm-detail-header {
	padding: 24px 28px;
	border-bottom: 1px solid var(--border-light);
}

.wm-detail-title-row {
	display: flex;
	align-items: center;
	gap: 12px;
}

.wm-detail-title {
	font-size: 18px;
	font-weight: 700;
	color: var(--text-detail);
}

.wm-detail-severity-badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	font-weight: 700;
	border-radius: 6px;
	padding: 4px 10px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.wm-detail-severity-badge.critical {
	background: rgba(232, 89, 12, 0.15);
	color: var(--orange-400);
}

.wm-detail-severity-badge.warning {
	background: rgba(255, 146, 43, 0.15);
	color: var(--orange-400);
}

.wm-detail-severity-badge.info {
	background: rgba(116, 143, 252, 0.15);
	color: var(--blue-400);
}

.wm-detail-desc {
	font-size: 14px;
	color: var(--text-detail-secondary);
	margin-top: 10px;
	line-height: 1.6;
}

.wm-detail-meta {
	display: flex;
	align-items: center;
	gap: 16px;
	margin-top: 12px;
	font-size: 12px;
	color: var(--text-detail-secondary);
}

.wm-detail-meta-item {
	display: flex;
	align-items: center;
	gap: 6px;
}

.wm-detail-body {
	padding: 24px 28px;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.wm-detail-subtitle {
	font-size: 13px;
	font-weight: 700;
	color: var(--text-detail);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: 16px;
}

.wm-metrics-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 14px;
}

.wm-metric-card {
	background: var(--bg-detail-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-md);
	padding: 16px;
}

.wm-metric-label {
	font-size: 12px;
	font-weight: 600;
	color: var(--text-detail-secondary);
	margin-bottom: 12px;
}

.wm-metric-values {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	margin-bottom: 12px;
}

.wm-metric-baseline {
	font-size: 18px;
	font-weight: 700;
	color: var(--blue-400);
}

.wm-metric-arrow {
	font-size: 14px;
	color: var(--text-detail-secondary);
}

.wm-metric-current {
	font-size: 18px;
	font-weight: 700;
	color: var(--orange-400);
}

.wm-metric-unit {
	font-size: 12px;
	color: var(--text-detail-secondary);
	margin-left: 2px;
}

.wm-metric-change {
	font-size: 12px;
	font-weight: 600;
	margin-top: 4px;
}

.wm-metric-change.up { color: var(--orange-400); }
.wm-metric-change.down { color: var(--green-500); }

.wm-metric-bars {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.wm-bar-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.wm-bar-label {
	font-size: 11px;
	color: var(--text-detail-secondary);
	width: 56px;
	flex-shrink: 0;
}

.wm-bar-track {
	flex: 1;
	height: 6px;
	border-radius: 3px;
	background: #E7EDF7;
	overflow: hidden;
}

.wm-bar-fill {
	height: 100%;
	border-radius: 3px;
	transition: width 0.6s ease;
}

.wm-bar-fill.baseline { background: var(--blue-500); }
.wm-bar-fill.current { background: var(--orange-500); }

/* Changes List */
.wm-changes-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.wm-change-item {
	display: flex;
	align-items: center;
	gap: 14px;
	background: var(--bg-detail-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-sm);
	padding: 14px 16px;
}

.wm-change-impact {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 8px;
	font-size: 11px;
	font-weight: 700;
	flex-shrink: 0;
}

.wm-change-impact.high { background: rgba(232, 89, 12, 0.15); color: var(--orange-400); }
.wm-change-impact.medium { background: rgba(255, 146, 43, 0.15); color: var(--orange-400); }
.wm-change-impact.low { background: rgba(64, 192, 87, 0.15); color: var(--green-500); }

.wm-change-field {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-detail);
}

.wm-change-diff {
	font-size: 12px;
	color: var(--text-detail-secondary);
	margin-top: 2px;
}

.wm-change-diff .old { text-decoration: line-through; opacity: 0.6; }
.wm-change-diff .arrow { margin: 0 6px; color: var(--blue-400); }
.wm-change-diff .new { color: var(--blue-400); font-weight: 600; }

/* Action Bar */
.wm-action-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px 28px;
	border-top: 1px solid var(--border-light);
	background: #FAFCFF;
}

.wm-action-buttons {
	display: flex;
	gap: 12px;
}

.wm-btn {
	border: none;
	border-radius: var(--radius-sm);
	padding: 10px 24px;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	display: flex;
	align-items: center;
	gap: 8px;
}

.wm-btn:hover { transform: scale(1.02); }

.wm-btn-primary {
	background: var(--blue-600);
	color: white;
	box-shadow: 0 2px 8px rgba(59, 91, 219, 0.3);
}

.wm-btn-primary:hover { background: var(--blue-700); box-shadow: 0 4px 12px rgba(59, 91, 219, 0.4); }

.wm-btn-ghost {
	background: transparent;
	color: var(--text-detail-secondary);
	border: 1px solid var(--border-light);
}

.wm-btn-ghost:hover { background: #F1F5F9; color: var(--text-detail); }

.wm-confidence-score {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	color: var(--text-detail-secondary);
}

.wm-confidence-value {
	font-weight: 700;
	color: var(--blue-400);
}

/* ===== Agent Panel ===== */
.wm-agent-panel {
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-lg);
	box-shadow: var(--shadow-sm);
	overflow: hidden;
}

.wm-agent-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18px 24px;
	border-bottom: 1px solid var(--border-light);
	cursor: pointer;
}

.wm-agent-header-left {
	display: flex;
	align-items: center;
	gap: 10px;
}

.wm-agent-avatar {
	width: 28px;
	height: 28px;
	border-radius: 8px;
	background: linear-gradient(135deg, var(--blue-500), #7C3AED);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	color: white;
}

.wm-agent-toggle {
	font-size: 12px;
	color: var(--text-tertiary);
	transition: transform 0.2s;
}

.wm-agent-toggle.collapsed { transform: rotate(-90deg); }

.wm-agent-body {
	overflow: hidden;
	transition: max-height 0.3s ease;
}

.wm-agent-body.collapsed { max-height: 0 !important; }

.wm-agent-messages {
	max-height: 280px;
	overflow-y: auto;
	padding: 16px 24px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.wm-agent-messages::-webkit-scrollbar { width: 4px; }
.wm-agent-messages::-webkit-scrollbar-thumb { background: var(--gray-400); border-radius: 2px; }

.wm-agent-msg {
	display: flex;
	gap: 10px;
	animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
	from { opacity: 0; transform: translateY(4px); }
	to { opacity: 1; transform: translateY(0); }
}

.wm-agent-msg-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
	margin-top: 6px;
}

.wm-agent-msg-dot.detected { background: var(--orange-500); }
.wm-agent-msg-dot.analyzed { background: var(--blue-400); }
.wm-agent-msg-dot.suggested { background: #7C3AED; }
.wm-agent-msg-dot.user_action { background: var(--green-500); }
.wm-agent-msg-dot.info { background: var(--gray-500); }

.wm-agent-msg-content {
	flex: 1;
}

.wm-agent-msg-text {
	font-size: 13px;
	color: var(--text-primary);
	line-height: 1.5;
}

.wm-agent-msg-time {
	font-size: 11px;
	color: var(--text-tertiary);
	margin-top: 2px;
}

.wm-agent-input-area {
	display: flex;
	gap: 10px;
	padding: 14px 24px;
	border-top: 1px solid var(--border-light);
}

.wm-agent-input {
	flex: 1;
	background: var(--bg-input);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-sm);
	padding: 10px 14px;
	font-size: 13px;
	color: var(--text-primary);
	outline: none;
	font-family: inherit;
	transition: border-color 0.2s;
}

.wm-agent-input:focus { border-color: var(--blue-400); }

.wm-agent-input::placeholder { color: var(--text-tertiary); }

.wm-agent-send {
	width: 36px;
	height: 36px;
	border-radius: 8px;
	background: var(--blue-600);
	color: white;
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
}

.wm-agent-send:hover { background: var(--blue-700); transform: scale(1.05); }

/* ===== No Selection State ===== */
.wm-empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 48px 24px;
	color: var(--text-tertiary);
}

.wm-empty-icon {
	font-size: 40px;
	margin-bottom: 16px;
	opacity: 0.4;
}

.wm-empty-text {
	font-size: 14px;
	font-weight: 500;
}

.wm-empty-sub {
	font-size: 12px;
	margin-top: 4px;
}

/* ===== Resolved Badge ===== */
.wm-resolved-bar {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 14px 18px;
	background: var(--bg-detail-card);
	border-radius: var(--radius-sm);
	margin-top: 8px;
}

.wm-resolved-icon {
	font-size: 16px;
}

.wm-resolved-text {
	font-size: 13px;
	color: var(--text-detail);
}

.wm-resolved-text strong { font-weight: 600; }

.wm-resolved-desc {
	font-size: 12px;
	color: var(--text-detail-secondary);
	margin-top: 2px;
}

@media (max-width: 1360px) {
	.wm-perceive-main {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 1080px) {
	.wm-shell {
		grid-template-columns: 72px 1fr;
	}
	.wm-sidebar-head,
	.wm-sidebar-foot,
	.wm-nav-label {
		display: none;
	}
	.wm-nav-items {
		padding: 0;
		border: none;
		background: transparent;
	}
	.wm-nav-item {
		width: 48px;
		height: 48px;
		justify-content: center;
		padding: 0;
		margin: 0 auto;
	}
	.wm-scroll-area {
		padding: 18px;
	}
}
`;
