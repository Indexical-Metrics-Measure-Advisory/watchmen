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
	--indigo-500: #6366F1;
	--indigo-600: #4F46E5;
	--indigo-50: #EEF2FF;
	--purple-500: #8B5CF6;
	--purple-50: #F5F3FF;
	--cyan-500: #06B6D4;
	--cyan-50: #ECFEFF;
	--hero-gradient: linear-gradient(135deg, #1E293B 0%, #1D4ED8 50%, #3B82F6 100%);
	--hero-gradient-subtle: linear-gradient(135deg, #F0F5FF 0%, #E8F0FE 50%, #F0EAFF 100%);
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

.wm-section-hint {
	font-size: 12px;
	color: var(--text-tertiary);
	font-weight: 500;
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
	.wm-observe-graph-shell {
		grid-template-columns: 1fr;
	}
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
	.wm-observe-hero-content {
		flex-direction: column;
		align-items: flex-start;
	}
	.wm-observe-hero-strip {
		flex-wrap: wrap;
	}
	.wm-observe-strip-item {
		padding: 10px 16px;
	}
	.wm-observe-impact-summary {
		grid-template-columns: 1fr;
	}
	.wm-observe-grid {
		grid-template-columns: 1fr;
	}
	.wm-observe-catalog-head,
	.wm-observe-catalog-row {
		grid-template-columns: 1fr;
	}
	.wm-observe-events-head,
	.wm-observe-events-row {
		grid-template-columns: 1fr;
	}
}

/* ===== Observe Page ===== */
.wm-observe-page {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.wm-observe-hero {
	position: relative;
	border-radius: var(--radius-xl);
	overflow: hidden;
	background: var(--hero-gradient);
	box-shadow: var(--shadow-lg), 0 0 0 1px rgba(30, 41, 59, 0.1);
}

.wm-observe-hero-bg {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse 80% 60% at 20% 80%, rgba(99, 102, 241, 0.3) 0%, transparent 60%),
		radial-gradient(ellipse 60% 50% at 80% 20%, rgba(59, 130, 246, 0.25) 0%, transparent 60%),
		radial-gradient(ellipse 40% 40% at 50% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 60%);
	pointer-events: none;
}

.wm-observe-hero-content {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 24px;
	padding: 32px 36px 28px;
}

.wm-observe-hero-left {
	flex: 1;
}

.wm-observe-title {
	font-size: 30px;
	font-weight: 700;
	color: #FFFFFF;
	letter-spacing: -0.5px;
	line-height: 1.2;
}

.wm-observe-subtitle {
	font-size: 15px;
	color: rgba(255, 255, 255, 0.72);
	margin-top: 10px;
	max-width: 640px;
	line-height: 1.6;
}

.wm-observe-hero-actions {
	display: flex;
	gap: 12px;
	flex-shrink: 0;
}

.wm-observe-hero-strip {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0;
	padding: 0 36px;
	background: rgba(0, 0, 0, 0.15);
	backdrop-filter: blur(4px);
	border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.wm-observe-strip-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 14px 24px;
	flex: 1;
}

.wm-observe-strip-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.wm-observe-strip-dot.blue { background: var(--blue-400); box-shadow: 0 0 8px rgba(96, 165, 250, 0.5); }
.wm-observe-strip-dot.green { background: var(--green-500); box-shadow: 0 0 8px rgba(34, 197, 94, 0.5); }
.wm-observe-strip-dot.orange { background: var(--orange-400); box-shadow: 0 0 8px rgba(251, 146, 60, 0.5); }
.wm-observe-strip-dot.red { background: var(--red-400); box-shadow: 0 0 8px rgba(248, 113, 113, 0.5); }

.wm-observe-strip-value {
	font-size: 18px;
	font-weight: 700;
	color: #FFFFFF;
	letter-spacing: -0.3px;
}

.wm-observe-strip-label {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.55);
	font-weight: 500;
}

.wm-observe-strip-divider {
	width: 1px;
	height: 28px;
	background: rgba(255, 255, 255, 0.12);
	flex-shrink: 0;
}

.wm-observe-tabs {
	display: inline-flex;
	gap: 4px;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: 16px;
	padding: 5px;
	box-shadow: var(--shadow-sm);
	width: fit-content;
}

.wm-observe-tab {
	border: none;
	background: transparent;
	padding: 10px 18px;
	border-radius: 12px;
	font-size: 13px;
	font-weight: 600;
	color: var(--text-secondary);
	cursor: pointer;
	transition: all 0.2s ease;
	display: flex;
	align-items: center;
	gap: 8px;
}

.wm-observe-tab-icon {
	font-size: 14px;
	opacity: 0.7;
}

.wm-observe-tab:hover {
	color: var(--text-primary);
	background: var(--bg-sidebar-hover);
}

.wm-observe-tab.active {
	background: var(--blue-50);
	color: var(--blue-700);
	box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.1), var(--shadow-sm);
}

.wm-observe-tab.active .wm-observe-tab-icon {
	opacity: 1;
}

.wm-observe-overview {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.wm-observe-kpis {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 16px;
}

.wm-observe-scale-grid {
	padding: 20px 24px 24px;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	gap: 14px;
}

.wm-observe-scale-card {
	border: 1px solid var(--border-light);
	background: linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%);
	border-radius: 16px;
	padding: 20px;
	transition: all 0.2s ease;
	cursor: pointer;
	text-align: left;
	font-family: inherit;
	width: 100%;
}

.wm-observe-scale-card:hover {
	box-shadow: var(--shadow-md);
	transform: translateY(-1px);
}

.wm-observe-scale-top {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 8px;
}

.wm-observe-scale-value {
	font-size: 28px;
	font-weight: 700;
	color: var(--text-primary);
	line-height: 1;
}

.wm-observe-scale-pct {
	font-size: 13px;
	font-weight: 600;
	color: var(--blue-500);
}

.wm-observe-scale-bar-track {
	height: 4px;
	border-radius: 2px;
	background: var(--gray-100);
	margin-top: 14px;
	overflow: hidden;
}

.wm-observe-scale-bar-fill {
	height: 100%;
	border-radius: 2px;
	background: linear-gradient(90deg, var(--blue-500), var(--indigo-500));
	transition: width 0.6s ease;
}

.wm-observe-scale-label {
	font-size: 13px;
	font-weight: 700;
	color: var(--text-primary);
	margin-top: 12px;
}

.wm-observe-scale-sub {
	font-size: 12px;
	color: var(--text-tertiary);
	margin-top: 4px;
	line-height: 1.5;
}

.wm-observe-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 20px;
}

.wm-observe-stage-list,
.wm-observe-impact-list,
.wm-observe-event-cards,
.wm-observe-domain-list {
	padding: 20px 24px 24px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.wm-observe-stage-row {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px 16px;
	background: var(--bg-detail-card);
	border: 1px solid var(--border-light);
	border-radius: 14px;
	transition: all 0.15s ease;
	cursor: pointer;
	text-align: left;
	font-family: inherit;
	width: 100%;
}

.wm-observe-stage-row:hover {
	background: var(--bg-card-hover);
	border-color: var(--blue-100);
}

.wm-observe-stage-left {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 130px;
	flex-shrink: 0;
}

.wm-observe-stage-icon {
	font-size: 16px;
	opacity: 0.6;
	width: 20px;
	text-align: center;
}

.wm-observe-stage-name,
.wm-observe-impact-name,
.wm-observe-node-name,
.wm-observe-detail-name,
.wm-observe-event-target {
	font-size: 14px;
	font-weight: 700;
	color: var(--text-primary);
}

.wm-observe-stage-center {
	flex: 1;
	min-width: 0;
}

.wm-observe-stage-right {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	flex-shrink: 0;
}

.wm-health-bar {
	height: 8px;
	border-radius: 4px;
	background: var(--gray-100);
	overflow: hidden;
	display: flex;
}

.wm-health-bar-fill {
	height: 100%;
	transition: width 0.5s ease;
}

.wm-health-bar-fill.healthy { background: var(--green-500); }
.wm-health-bar-fill.warning { background: var(--orange-400); }
.wm-health-bar-fill.error { background: var(--red-500); }

.wm-health-bar-fill.healthy:first-child { border-radius: 4px 0 0 4px; }
.wm-health-bar-fill.error:last-child { border-radius: 0 4px 4px 0; }

.wm-health-pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 4px 10px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 700;
	text-transform: capitalize;
	letter-spacing: 0.2px;
}

.wm-health-pill.healthy {
	background: var(--green-50);
	color: var(--green-600);
}

.wm-health-pill.warning {
	background: var(--orange-100);
	color: var(--orange-600);
}

.wm-health-pill.error {
	background: var(--red-50);
	color: var(--red-500);
}

.wm-health-pill.unknown {
	background: var(--gray-100);
	color: var(--gray-600);
}

.wm-observe-event-card {
	border: 1px solid var(--border-light);
	background: var(--bg-detail-card);
	border-radius: 14px;
	padding: 16px 18px;
	text-align: left;
	cursor: pointer;
	transition: all 0.2s ease;
	position: relative;
	font-family: inherit;
	width: 100%;
	display: block;
}

.wm-observe-event-card::before {
	content: '';
	position: absolute;
	left: 0;
	top: 12px;
	bottom: 12px;
	width: 3px;
	border-radius: 0 3px 3px 0;
}

.wm-observe-event-card.error::before { background: var(--red-500); }
.wm-observe-event-card.warning::before { background: var(--orange-400); }
.wm-observe-event-card.healthy::before { background: var(--green-500); }

.wm-observe-event-card:hover,
.wm-observe-node-card:hover,
.wm-observe-events-row:hover {
	box-shadow: var(--shadow-md);
	transform: translateY(-1px);
}

.wm-observe-event-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 10px;
}

.wm-observe-severity-indicator {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.wm-observe-severity-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
}

.wm-observe-severity-indicator.error .wm-observe-severity-dot {
	background: var(--red-500);
	box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

.wm-observe-severity-indicator.warning .wm-observe-severity-dot {
	background: var(--orange-400);
	box-shadow: 0 0 8px rgba(251, 146, 60, 0.4);
}

.wm-observe-severity-indicator.healthy .wm-observe-severity-dot {
	background: var(--green-500);
}

.wm-observe-severity-indicator.error { color: var(--red-500); }
.wm-observe-severity-indicator.warning { color: var(--orange-600); }
.wm-observe-severity-indicator.healthy { color: var(--green-600); }

.wm-observe-event-time,
.wm-observe-node-type,
.wm-observe-impact-path,
.wm-observe-detail-type,
.wm-observe-detail-desc,
.wm-observe-meta-key,
.wm-observe-related-row {
	font-size: 12px;
	color: var(--text-tertiary);
}

.wm-observe-event-message {
	font-size: 13px;
	color: var(--text-secondary);
	margin-top: 8px;
	line-height: 1.6;
}

.wm-observe-event-impacts {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 10px;
}

.wm-observe-impact-tag {
	display: inline-flex;
	padding: 3px 8px;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 600;
	background: var(--blue-50);
	color: var(--blue-600);
}

.wm-observe-domain-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 16px 18px;
	background: var(--bg-detail-card);
	border: 1px solid var(--border-light);
	border-radius: 14px;
	transition: all 0.15s ease;
}

.wm-observe-domain-row:hover {
	background: var(--bg-card-hover);
	border-color: var(--blue-100);
}

.wm-observe-domain-row.error {
	border-left: 3px solid var(--red-500);
}

.wm-observe-domain-row.warning {
	border-left: 3px solid var(--orange-400);
}

.wm-observe-domain-row.healthy {
	border-left: 3px solid var(--green-500);
}

.wm-observe-domain-info {
	flex: 1;
	min-width: 0;
}

.wm-observe-domain-top {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 4px;
}

.wm-observe-domain-score-ring {
	position: relative;
	width: 52px;
	height: 52px;
	flex-shrink: 0;
}

.wm-observe-domain-score-ring svg {
	width: 100%;
	height: 100%;
	transform: rotate(-90deg);
}

.wm-ring-bg {
	fill: none;
	stroke: var(--gray-100);
	stroke-width: 3;
}

.wm-ring-fill {
	fill: none;
	stroke-width: 3;
	stroke-linecap: round;
	transition: stroke-dasharray 0.6s ease;
}

.wm-observe-domain-score-ring.healthy .wm-ring-fill { stroke: var(--green-500); }
.wm-observe-domain-score-ring.warning .wm-ring-fill { stroke: var(--orange-400); }
.wm-observe-domain-score-ring.error .wm-ring-fill { stroke: var(--red-500); }

.wm-observe-domain-score-value {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 13px;
	font-weight: 700;
	color: var(--text-primary);
}

.wm-observe-impact-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 14px 16px;
	background: var(--bg-detail-card);
	border: 1px solid var(--border-light);
	border-radius: 14px;
	transition: all 0.15s ease;
}

.wm-observe-impact-row:hover {
	background: var(--bg-card-hover);
	border-color: var(--blue-100);
}

.wm-observe-impact-info {
	flex: 1;
	min-width: 0;
}

.wm-observe-impact-path {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 6px;
}

.wm-observe-path-seg {
	font-size: 11px;
	font-weight: 500;
	color: var(--text-tertiary);
	padding: 2px 6px;
	background: var(--gray-100);
	border-radius: 4px;
}

.wm-observe-path-arrow {
	font-size: 10px;
	color: var(--gray-400);
}

.wm-observe-stage-bars,
.wm-observe-impact-tags,
.wm-observe-node-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.wm-observe-graph-shell {
	display: grid;
	grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.75fr);
	gap: 20px;
	align-items: start;
}

.wm-observe-toolbar {
	display: flex;
	gap: 4px;
}

.wm-observe-cluster-strip {
	padding: 20px 24px 0;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 12px;
}

.wm-observe-cluster-card {
	border: 1px solid var(--border-light);
	background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%);
	border-radius: 16px;
	padding: 16px 18px;
	display: flex;
	flex-direction: column;
	gap: 10px;
	transition: all 0.2s ease;
	cursor: pointer;
	text-align: left;
	font-family: inherit;
	width: 100%;
}

.wm-observe-cluster-card:hover {
	box-shadow: var(--shadow-sm);
}

.wm-observe-cluster-top {
	display: flex;
	align-items: center;
	gap: 8px;
}

.wm-observe-cluster-icon {
	font-size: 14px;
	opacity: 0.6;
}

.wm-observe-cluster-stage {
	font-size: 12px;
	font-weight: 700;
	color: var(--text-tertiary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.wm-observe-cluster-count {
	font-size: 24px;
	font-weight: 700;
	color: var(--text-primary);
	line-height: 1;
}

.wm-observe-cluster-pills {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
}

.wm-observe-graph-board {
	padding: 20px 24px 24px;
	display: grid;
	grid-template-columns: repeat(7, minmax(170px, 1fr));
	gap: 14px;
	overflow-x: auto;
}

.wm-observe-graph-focused {
	padding-top: 16px;
}

.wm-observe-stage-column {
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 170px;
}

.wm-observe-stage-column-title {
	font-size: 12px;
	font-weight: 700;
	color: var(--text-tertiary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	padding: 0 4px;
	display: flex;
	align-items: center;
	gap: 6px;
}

.wm-observe-stage-column-body {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.wm-observe-empty-cluster {
	border: 1px dashed var(--border-light);
	background: var(--bg-detail-card);
	border-radius: 14px;
	padding: 18px 14px;
	font-size: 12px;
	color: var(--text-tertiary);
	text-align: center;
}

.wm-observe-node-card {
	border: 1px solid var(--border-light);
	background: var(--bg-card);
	border-radius: 14px;
	padding: 14px;
	text-align: left;
	cursor: pointer;
	transition: all 0.2s ease;
	display: flex;
	align-items: flex-start;
	gap: 10px;
	font-family: inherit;
	width: 100%;
}

.wm-observe-node-health-indicator {
	width: 4px;
	border-radius: 2px;
	align-self: stretch;
	flex-shrink: 0;
	min-height: 32px;
}

.wm-observe-node-health-indicator.healthy { background: var(--green-500); }
.wm-observe-node-health-indicator.warning { background: var(--orange-400); }
.wm-observe-node-health-indicator.error { background: var(--red-500); }

.wm-observe-node-body {
	flex: 1;
	min-width: 0;
}

.wm-observe-node-card.selected {
	box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.2);
	background: var(--blue-50);
}

.wm-observe-node-card.warning {
	background: linear-gradient(180deg, #FFFDF8 0%, #FFFFFF 100%);
}

.wm-observe-node-card.error {
	background: linear-gradient(180deg, #FFF6F6 0%, #FFFFFF 100%);
}

.wm-observe-node-badge {
	display: inline-flex;
	padding: 3px 8px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 600;
	color: var(--text-secondary);
	background: var(--gray-100);
}

.wm-observe-graph-detail .wm-section-card {
	position: sticky;
	top: 0;
}

.wm-observe-detail-body {
	padding: 22px 24px 24px;
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.wm-observe-metadata,
.wm-observe-related {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.wm-observe-meta-row,
.wm-observe-related-row,
.wm-observe-impact-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 14px;
	border: 1px solid var(--border-light);
	border-radius: 10px;
	background: var(--bg-detail-card);
	transition: all 0.15s ease;
}

.wm-observe-meta-row:hover,
.wm-observe-related-row:hover,
.wm-observe-impact-item:hover {
	background: var(--bg-card-hover);
}

.wm-observe-meta-value {
	font-size: 12px;
	font-weight: 600;
	color: var(--text-primary);
	text-align: right;
}

.wm-observe-impact-page {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.wm-observe-impact-summary {
	padding: 20px 24px 24px;
	display: grid;
	grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr);
	gap: 16px;
}

.wm-observe-impact-highlight {
	border: 1px solid var(--border-light);
	background: linear-gradient(135deg, var(--bg-detail-card) 0%, #F0F5FF 100%);
	border-radius: 16px;
	padding: 20px;
}

.wm-observe-highlight-label {
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--text-tertiary);
	font-weight: 700;
}

.wm-observe-highlight-value {
	font-size: 22px;
	font-weight: 700;
	color: var(--text-primary);
	margin-top: 10px;
}

.wm-observe-impact-stats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.wm-observe-impact-stat {
	border: 1px solid var(--border-light);
	background: var(--bg-card);
	border-radius: 16px;
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	transition: all 0.2s ease;
}

.wm-observe-impact-stat:hover {
	box-shadow: var(--shadow-sm);
}

.wm-observe-impact-stat strong {
	font-size: 24px;
	color: var(--text-primary);
}

.wm-observe-impact-stat span {
	font-size: 12px;
	color: var(--text-tertiary);
}

.wm-observe-impact-table {
	padding: 20px 24px 24px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.wm-observe-catalog-page {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.wm-observe-catalog-controls {
	padding: 20px 24px 0;
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.wm-observe-search-box {
	min-width: 280px;
	padding: 12px 16px;
	border-radius: 14px;
	background: var(--bg-input);
	border: 1px solid var(--border-light);
	color: var(--text-tertiary);
	font-size: 13px;
	display: flex;
	align-items: center;
	gap: 8px;
	transition: all 0.2s ease;
}

.wm-observe-search-box:focus-within {
	border-color: var(--blue-400);
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.wm-observe-search-icon {
	font-size: 16px;
	opacity: 0.5;
}

.wm-observe-catalog-table {
	padding: 12px 24px 24px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.wm-observe-catalog-head,
.wm-observe-catalog-row {
	display: grid;
	grid-template-columns: minmax(220px, 1.3fr) 110px 150px 90px 120px 130px;
	gap: 12px;
	align-items: center;
}

.wm-observe-catalog-head {
	padding: 0 14px 8px;
	font-size: 11px;
	font-weight: 700;
	color: var(--text-tertiary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.wm-observe-catalog-row {
	border: 1px solid var(--border-light);
	background: var(--bg-card);
	border-radius: 14px;
	padding: 14px;
	font-size: 13px;
	color: var(--text-primary);
	transition: all 0.15s ease;
}

.wm-observe-catalog-row:hover {
	background: var(--bg-card-hover);
	border-color: var(--blue-100);
}

.wm-observe-catalog-name {
	display: flex;
	align-items: center;
	gap: 10px;
	font-weight: 600;
}

.wm-observe-catalog-stage-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.wm-observe-catalog-stage-dot.healthy { background: var(--green-500); }
.wm-observe-catalog-stage-dot.warning { background: var(--orange-400); }
.wm-observe-catalog-stage-dot.error { background: var(--red-500); }

.wm-observe-catalog-count {
	font-weight: 700;
	color: var(--text-primary);
}

.wm-observe-inline-btn {
	padding: 8px 14px;
	font-size: 12px;
	border-radius: 10px;
}

.wm-observe-events-table {
	padding: 20px 24px 24px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.wm-observe-events-head,
.wm-observe-events-row {
	display: grid;
	grid-template-columns: 150px 120px 160px minmax(160px, 1fr) minmax(160px, 1fr);
	gap: 12px;
	align-items: center;
}

.wm-observe-events-head {
	padding: 0 14px 12px;
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--text-tertiary);
}

.wm-observe-events-row {
	border: 1px solid var(--border-light);
	background: var(--bg-card);
	border-radius: 14px;
	padding: 14px;
	cursor: pointer;
	text-align: left;
	font-size: 13px;
	color: var(--text-primary);
	transition: all 0.15s ease;
	font-family: inherit;
	width: 100%;
}

.wm-observe-events-row:hover {
	background: var(--bg-card-hover);
	border-color: var(--blue-100);
}

.wm-observe-events-time {
	font-variant-numeric: tabular-nums;
	color: var(--text-tertiary);
	font-size: 12px;
}

.wm-observe-events-type {
	font-weight: 600;
}

.wm-observe-events-target {
	font-weight: 600;
}

.wm-observe-events-impact {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.wm-btn-sm {
	padding: 6px 14px;
	font-size: 12px;
	border-radius: 8px;
}

/* ===== Global Search ===== */
.wm-search-highlight {
	background: rgba(251, 191, 36, 0.3);
	color: inherit;
	padding: 1px 0;
	border-radius: 2px;
}

.wm-observe-global-search-box {
	display: flex;
	align-items: center;
	gap: 10px;
	background: rgba(255, 255, 255, 0.16);
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 14px;
	padding: 0 16px;
	backdrop-filter: blur(8px);
	transition: all 0.2s ease;
	min-width: 300px;
}

.wm-observe-global-search-box:focus-within {
	background: rgba(255, 255, 255, 0.24);
	border-color: rgba(255, 255, 255, 0.35);
	box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.wm-observe-global-search-input {
	border: none;
	background: transparent;
	color: #FFFFFF;
	font-size: 14px;
	font-weight: 500;
	outline: none;
	width: 280px;
	padding: 12px 0;
}

.wm-observe-global-search-input::placeholder {
	color: rgba(255, 255, 255, 0.5);
}

.wm-observe-search-clear {
	border: none;
	background: rgba(255, 255, 255, 0.15);
	color: rgba(255, 255, 255, 0.8);
	font-size: 18px;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	transition: all 0.15s ease;
}

.wm-observe-search-clear:hover {
	background: rgba(255, 255, 255, 0.3);
	color: #FFFFFF;
}

/* ===== Catalog Controls ===== */
.wm-observe-catalog-filters-top {
	padding: 0 24px 16px;
	display: flex;
	flex-direction: column;
	gap: 14px;
	border-bottom: 1px solid var(--border-light);
}

.wm-observe-catalog-toolbar {
	padding: 14px 24px 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.wm-observe-filter-group {
	display: flex;
	align-items: center;
	gap: 10px;
}

.wm-observe-filter-label {
	font-size: 11px;
	font-weight: 700;
	color: var(--text-tertiary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	min-width: 52px;
	flex-shrink: 0;
}

.wm-observe-sort-group {
	display: flex;
	align-items: center;
	gap: 8px;
}

.wm-observe-search-input {
	flex: 1;
	border: none;
	background: transparent;
	color: var(--text-primary);
	font-size: 13px;
	font-weight: 500;
	outline: none;
	padding: 0;
}

.wm-observe-search-input::placeholder {
	color: var(--text-tertiary);
}

/* ===== Filter Pills ===== */
.wm-filter-pills {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
}

.wm-filter-pill {
	border: 1px solid var(--border-light);
	background: transparent;
	color: var(--text-secondary);
	padding: 6px 14px;
	border-radius: 999px;
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.15s ease;
	text-transform: capitalize;
}

.wm-filter-pill:hover {
	background: var(--bg-sidebar-hover);
	border-color: var(--blue-100);
	color: var(--text-primary);
}

.wm-filter-pill.active {
	background: var(--blue-50);
	color: var(--blue-700);
	border-color: rgba(37, 99, 235, 0.2);
	box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
}

/* ===== Events Filters ===== */
.wm-observe-event-filters {
	padding: 0 24px 16px;
	display: flex;
	flex-direction: column;
	gap: 14px;
	border-bottom: 1px solid var(--border-light);
}

/* ===== Empty State ===== */
.wm-observe-empty {
	padding: 32px 24px;
	text-align: center;
	font-size: 13px;
	color: var(--text-tertiary);
}

/* ===== Pagination ===== */
.wm-pagination {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 24px;
	border-top: 1px solid var(--border-light);
}

.wm-pagination-info {
	font-size: 12px;
	color: var(--text-tertiary);
	font-variant-numeric: tabular-nums;
}

.wm-pagination-btns {
	display: flex;
	gap: 4px;
}

.wm-pagination-btn {
	border: 1px solid var(--border-light);
	background: var(--bg-card);
	color: var(--text-secondary);
	padding: 6px 12px;
	border-radius: 8px;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.15s ease;
	min-width: 34px;
	text-align: center;
}

.wm-pagination-btn:hover {
	background: var(--bg-sidebar-hover);
	border-color: var(--blue-100);
}

.wm-pagination-btn.active {
	background: var(--blue-50);
	color: var(--blue-700);
	border-color: rgba(37, 99, 235, 0.2);
}

.wm-pagination-btn[disabled] {
	opacity: 0.4;
	cursor: not-allowed;
}

/* ===== Graph Breadcrumb ===== */
.wm-graph-breadcrumb {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 14px 24px;
}

.wm-graph-breadcrumb-sep {
	font-size: 14px;
	color: var(--gray-400);
}

.wm-graph-breadcrumb-item {
	border: none;
	background: transparent;
	font-size: 13px;
	font-weight: 600;
	color: var(--text-tertiary);
	cursor: pointer;
	padding: 4px 10px;
	border-radius: 8px;
	transition: all 0.15s ease;
}

.wm-graph-breadcrumb-item:hover {
	background: var(--bg-sidebar-hover);
	color: var(--text-primary);
}

.wm-graph-breadcrumb-item.active {
	color: var(--blue-700);
	background: var(--blue-50);
}

/* ===== Graph Page ===== */
.wm-observe-graph-page {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

/* ===== Cluster Card Clickable ===== */
.wm-observe-cluster-card-clickable {
	cursor: pointer;
}

.wm-observe-cluster-hint {
	font-size: 11px;
	color: var(--blue-500);
	font-weight: 600;
	margin-top: 4px;
}

/* ===== Zoom Panel (Domain View) ===== */
.wm-observe-zoom-panel {
	padding: 0 24px 24px;
}

.wm-observe-zoom-summary {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
	padding: 16px 0 20px;
}

.wm-observe-zoom-stage-badge {
	display: flex;
	align-items: center;
	gap: 10px;
}

.wm-observe-zoom-total {
	font-size: 12px;
	color: var(--text-tertiary);
	font-weight: 500;
}

.wm-observe-domain-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: 14px;
}

.wm-observe-domain-card {
	border: 1px solid var(--border-light);
	background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%);
	border-radius: 16px;
	padding: 18px;
	text-align: left;
	cursor: pointer;
	transition: all 0.2s ease;
}

.wm-observe-domain-card:hover {
	box-shadow: var(--shadow-md);
	transform: translateY(-1px);
}

.wm-observe-domain-card.error {
	border-left: 3px solid var(--red-500);
}

.wm-observe-domain-card.warning {
	border-left: 3px solid var(--orange-400);
}

.wm-observe-domain-card.healthy {
	border-left: 3px solid var(--green-500);
}

.wm-observe-domain-card-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	margin-bottom: 10px;
}

.wm-observe-domain-card-name {
	font-size: 15px;
	font-weight: 700;
	color: var(--text-primary);
}

.wm-observe-domain-card-count {
	font-size: 24px;
	font-weight: 700;
	color: var(--text-primary);
	margin-bottom: 10px;
}

.wm-observe-domain-card-pills {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
	margin-top: 10px;
}

.wm-observe-domain-card-types {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
	margin-top: 8px;
}

/* ===== Shared Page Hero ===== */
.wm-page {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.wm-page-hero {
	border-radius: var(--radius-xl);
	overflow: hidden;
	background: var(--hero-gradient-subtle);
	border: 1px solid #DDE4F0;
	padding: 28px 32px 24px;
}

.wm-page-hero-title {
	font-size: 26px;
	font-weight: 700;
	color: var(--text-primary);
	letter-spacing: -0.5px;
}

.wm-page-hero-desc {
	font-size: 14px;
	color: var(--text-tertiary);
	margin-top: 6px;
}

.wm-page-hero-kpis {
	display: flex;
	gap: 24px;
	margin-top: 20px;
	flex-wrap: wrap;
}

.wm-hero-kpi {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.wm-hero-kpi-val {
	font-size: 28px;
	font-weight: 700;
	color: var(--text-primary);
	line-height: 1;
}

.wm-hero-kpi-label {
	font-size: 12px;
	color: var(--text-tertiary);
	font-weight: 500;
}

.wm-hero-kpi.green .wm-hero-kpi-val { color: var(--green-600); }
.wm-hero-kpi.orange .wm-hero-kpi-val { color: var(--orange-600); }
.wm-hero-kpi.red .wm-hero-kpi-val { color: var(--red-500); }
.wm-hero-kpi.blue .wm-hero-kpi-val { color: var(--blue-600); }

/* ===== Shared Status Dot ===== */
.wm-status-dot {
	display: inline-block;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	margin-right: 4px;
	vertical-align: middle;
}

.wm-status-dot.healthy { background: var(--green-500); }
.wm-status-dot.warning { background: var(--orange-400); }
.wm-status-dot.error { background: var(--red-500); }
.wm-status-dot.unknown { background: var(--gray-400); }

/* ===== Ingest: Source Cards ===== */
.wm-source-grid {
	padding: 20px 24px 24px;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 14px;
}

.wm-source-card {
	border: 1px solid var(--border-light);
	background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%);
	border-radius: 16px;
	padding: 18px;
	transition: all 0.2s ease;
}

.wm-source-card:hover {
	box-shadow: var(--shadow-md);
	transform: translateY(-1px);
}

.wm-source-card.border-error { border-left: 3px solid var(--red-500); }
.wm-source-card.border-warning { border-left: 3px solid var(--orange-400); }

.wm-source-card-top {
	display: flex;
	align-items: center;
	gap: 12px;
}

.wm-source-icon {
	font-size: 28px;
	flex-shrink: 0;
}

.wm-source-info {
	flex: 1;
	min-width: 0;
}

.wm-source-name {
	font-size: 14px;
	font-weight: 700;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.wm-source-type {
	font-size: 11px;
	color: var(--text-tertiary);
	font-weight: 500;
	margin-top: 2px;
}

.wm-source-health {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	font-weight: 600;
	color: var(--text-secondary);
	flex-shrink: 0;
}

.wm-source-card-body {
	display: flex;
	gap: 16px;
	margin-top: 14px;
	padding-top: 14px;
	border-top: 1px solid var(--border-light);
}

.wm-source-stat {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.wm-source-stat-val {
	font-size: 13px;
	font-weight: 700;
	color: var(--text-primary);
}

.wm-source-stat-label {
	font-size: 11px;
	color: var(--text-tertiary);
}

.wm-source-card-foot {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--border-light);
}

.wm-source-endpoint {
	font-size: 11px;
	color: var(--text-tertiary);
	padding: 3px 8px;
	background: var(--bg-input);
	border-radius: 6px;
	font-family: monospace;
}

.wm-source-code {
	font-size: 11px;
	color: var(--text-tertiary);
	font-weight: 500;
	margin-left: auto;
}

/* ===== Model: Topic Cards ===== */
.wm-topic-grid {
	padding: 20px 24px 24px;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: 14px;
}

.wm-topic-card {
	border: 1px solid var(--border-light);
	background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%);
	border-radius: 16px;
	padding: 18px;
	transition: all 0.2s ease;
}

.wm-topic-card:hover {
	box-shadow: var(--shadow-md);
	transform: translateY(-1px);
}

.wm-topic-card.border-error { border-left: 3px solid var(--red-500); }
.wm-topic-card.border-warning { border-left: 3px solid var(--orange-400); }

.wm-topic-card-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
}

.wm-topic-name {
	font-size: 15px;
	font-weight: 700;
	color: var(--text-primary);
}

.wm-topic-badges {
	display: flex;
	gap: 6px;
	flex-shrink: 0;
}

.wm-topic-badge {
	display: inline-flex;
	padding: 3px 8px;
	border-radius: 6px;
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.3px;
}

.wm-topic-badge.raw { background: #FEF3C7; color: #92400E; }
.wm-topic-badge.meta { background: #DBEAFE; color: #1E40AF; }
.wm-topic-badge.distinct { background: #EDE9FE; color: #5B21B6; }
.wm-topic-badge.aggregate { background: #D1FAE5; color: #065F46; }
.wm-topic-badge.time { background: #FCE7F3; color: #9D174D; }
.wm-topic-badge.ratio { background: #CFFAFE; color: #155E75; }
.wm-topic-badge.business { background: var(--indigo-50); color: var(--indigo-600); }
.wm-topic-badge.system { background: var(--gray-100); color: var(--gray-600); }

.wm-topic-desc {
	font-size: 12px;
	color: var(--text-secondary);
	margin-top: 10px;
	font-style: italic;
}

.wm-topic-stats {
	display: flex;
	gap: 20px;
	margin-top: 14px;
	padding-top: 14px;
	border-top: 1px solid var(--border-light);
}

.wm-topic-stat {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.wm-topic-stat-val {
	font-size: 13px;
	font-weight: 700;
	color: var(--text-primary);
	display: flex;
	align-items: center;
	gap: 4px;
}

.wm-topic-stat-label {
	font-size: 11px;
	color: var(--text-tertiary);
}

.wm-topic-factors {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--border-light);
}

.wm-factor-chip {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 4px 10px;
	border-radius: 999px;
	background: var(--bg-input);
	font-size: 11px;
}

.wm-factor-name {
	font-weight: 600;
	color: var(--text-secondary);
}

.wm-factor-type {
	color: var(--text-tertiary);
	font-family: monospace;
}

.wm-factor-more {
	font-size: 11px;
	color: var(--blue-500);
	font-weight: 600;
	padding: 4px 10px;
	border-radius: 999px;
	background: var(--blue-50);
}

/* ===== Transform: Pipeline Cards ===== */
.wm-pipeline-grid {
	padding: 20px 24px 24px;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 14px;
}

.wm-pipeline-card {
	border: 1px solid var(--border-light);
	background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%);
	border-radius: 16px;
	padding: 18px;
	transition: all 0.2s ease;
}

.wm-pipeline-card:hover {
	box-shadow: var(--shadow-md);
	transform: translateY(-1px);
}

.wm-pipeline-card.border-error { border-left: 3px solid var(--red-500); }
.wm-pipeline-card.border-warning { border-left: 3px solid var(--orange-400); }

.wm-pipeline-card-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
}

.wm-pipeline-name {
	font-size: 14px;
	font-weight: 700;
	color: var(--text-primary);
}

.wm-pipeline-type-badge {
	padding: 3px 8px;
	border-radius: 6px;
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.3px;
	background: var(--blue-50);
	color: var(--blue-600);
	flex-shrink: 0;
}

.wm-pipeline-card-body {
	display: flex;
	gap: 16px;
	margin-top: 14px;
	padding-top: 14px;
	border-top: 1px solid var(--border-light);
}

.wm-pipeline-stat {
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.wm-pipeline-stat-val {
	font-size: 12px;
	font-weight: 600;
	color: var(--text-primary);
}

.wm-pipeline-stat-label {
	font-size: 11px;
	color: var(--text-tertiary);
}

.wm-pipeline-status {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 600;
}

.wm-pipeline-status.healthy { background: var(--green-50); color: var(--green-600); }
.wm-pipeline-status.warning { background: var(--orange-100); color: var(--orange-600); }
.wm-pipeline-status.error { background: var(--red-50); color: var(--red-500); }
.wm-pipeline-status.disabled { background: var(--gray-100); color: var(--gray-600); }

.wm-check { color: var(--green-600); font-weight: 700; }
.wm-check.warn { color: var(--orange-500); }

.wm-pipeline-card-foot {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--border-light);
}

.wm-pipeline-topic {
	font-size: 11px;
	color: var(--text-tertiary);
	padding: 3px 8px;
	background: var(--bg-input);
	border-radius: 6px;
}

.wm-pipeline-health {
	font-size: 11px;
	font-weight: 600;
	color: var(--text-secondary);
	display: flex;
	align-items: center;
	margin-left: auto;
}

/* ===== Govern: Quality Rules ===== */
.wm-rule-list {
	padding: 0;
	display: flex;
	flex-direction: column;
}

.wm-rule-row {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px 24px;
	border-bottom: 1px solid var(--border-light);
	transition: all 0.15s ease;
}

.wm-rule-row:last-child { border-bottom: none; }

.wm-rule-row:hover {
	background: var(--bg-card-hover);
}

.wm-rule-row.disabled {
	opacity: 0.5;
}

.wm-rule-main {
	flex: 1;
	min-width: 0;
}

.wm-rule-name {
	font-size: 13px;
	font-weight: 700;
	color: var(--text-primary);
}

.wm-rule-desc {
	font-size: 12px;
	color: var(--text-tertiary);
	margin-top: 2px;
}

.wm-rule-meta {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.wm-rule-category {
	font-size: 11px;
	color: var(--text-tertiary);
	font-weight: 500;
	padding: 3px 8px;
	background: var(--bg-input);
	border-radius: 6px;
}

.wm-rule-topic {
	font-size: 11px;
	color: var(--blue-600);
	font-weight: 600;
}

.wm-rule-status {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
}

.wm-pass-rate {
	font-size: 13px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
}

.wm-pass-rate.pass-high { color: var(--green-600); }
.wm-pass-rate.pass-mid { color: var(--orange-600); }
.wm-pass-rate.pass-low { color: var(--red-500); }

.wm-rule-checked {
	font-size: 11px;
	color: var(--text-tertiary);
	white-space: nowrap;
}

.wm-severity-pill {
	display: inline-flex;
	padding: 3px 8px;
	border-radius: 6px;
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.3px;
}

.wm-severity-pill.critical { background: #FEE2E2; color: #991B1B; }
.wm-severity-pill.warning { background: #FEF3C7; color: #92400E; }
.wm-severity-pill.info { background: #DBEAFE; color: #1E40AF; }

/* ===== Govern: Masking Policies ===== */
.wm-masking-grid {
	padding: 20px 24px 24px;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 14px;
}

.wm-masking-card {
	border: 1px solid var(--border-light);
	background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%);
	border-radius: 16px;
	padding: 18px;
	transition: all 0.2s ease;
}

.wm-masking-card:hover {
	box-shadow: var(--shadow-sm);
}

.wm-masking-card.disabled {
	opacity: 0.5;
}

.wm-masking-card-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.wm-masking-name {
	font-size: 14px;
	font-weight: 700;
	color: var(--text-primary);
}

.wm-masking-strategy {
	padding: 3px 8px;
	border-radius: 6px;
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.3px;
	background: var(--purple-50);
	color: var(--purple-500);
}

.wm-masking-target {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 14px;
	padding-top: 14px;
	border-top: 1px solid var(--border-light);
	font-size: 12px;
}

.wm-masking-topic {
	font-weight: 600;
	color: var(--text-secondary);
	padding: 2px 8px;
	background: var(--bg-input);
	border-radius: 6px;
}

.wm-masking-arrow {
	color: var(--gray-400);
	font-weight: 700;
}

.wm-masking-factor {
	font-weight: 600;
	color: var(--purple-500);
	font-family: monospace;
}

.wm-masking-roles {
	display: flex;
	gap: 6px;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--border-light);
}

.wm-masking-role {
	display: inline-flex;
	padding: 3px 8px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 500;
	background: var(--bg-input);
	color: var(--text-tertiary);
}

/* ===== Feedback: Decision Log ===== */
.wm-feedback-list {
	display: flex;
	flex-direction: column;
}

.wm-feedback-row {
	display: flex;
	align-items: flex-start;
	gap: 14px;
	padding: 16px 24px;
	border-bottom: 1px solid var(--border-light);
	transition: all 0.15s ease;
}

.wm-feedback-row:last-child { border-bottom: none; }

.wm-feedback-row:hover {
	background: var(--bg-card-hover);
}

.wm-feedback-row.decision { border-left: 3px solid var(--indigo-500); }
.wm-feedback-row.alert { border-left: 3px solid var(--orange-400); }
.wm-feedback-row.error { border-left: 3px solid var(--red-500); }
.wm-feedback-row.info { border-left: 3px solid var(--blue-400); }
.wm-feedback-row.action { border-left: 3px solid var(--green-500); }

.wm-feedback-icon {
	font-size: 18px;
	flex-shrink: 0;
}

.wm-feedback-body {
	flex: 1;
	min-width: 0;
}

.wm-feedback-content {
	font-size: 13px;
	color: var(--text-primary);
	line-height: 1.6;
}

.wm-feedback-time {
	font-size: 11px;
	color: var(--text-tertiary);
	flex-shrink: 0;
	font-variant-numeric: tabular-nums;
}
`;
