export enum Router {
	LOGIN = '/login',
	MOCK_SAML2_LOGIN = '/saml/login',
	SAML2_CALLBACK = '/saml/callback',

	ADMIN = '/admin',
	ADMIN_HOME = '/admin/home',
	ADMIN_TOPICS = '/admin/topics',
	ADMIN_ENUMS = '/admin/enums',
	ADMIN_REPORTS = '/admin/reports',
	ADMIN_SPACES = '/admin/space',
	ADMIN_PIPELINE = '/admin/pipeline/:pipelineId',
	ADMIN_PIPELINE_CATALOG = '/admin/pipeline/catalog',
	ADMIN_PIPELINES = '/admin/pipeline',
	ADMIN_USER_GROUPS = '/admin/user-groups',
	ADMIN_USERS = '/admin/users',
	ADMIN_TENANTS = '/admin/tenants',
	ADMIN_DATA_SOURCES = '/admin/data-sources',
	ADMIN_EXTERNAL_WRITERS = '/admin/external-writers',
	ADMIN_PLUGINS = '/admin/plugins',
	ADMIN_MONITOR_LOGS = '/admin/monitor_logs',
	ADMIN_SIMULATOR = '/admin/simulator',
	ADMIN_SETTINGS = '/admin/settings',
	ADMIN_TOOLBOX = '/admin/toolbox',
	ADMIN_TOOLBOX_TOPIC_SNAPSHOT = '/admin/toolbox/topic-snapshot',
	ADMIN_TOOLBOX_PIPELINE_TRIGGER = '/admin/toolbox/pipeline-trigger',

	CONSOLE = '/console',
	CONSOLE_HOME = '/console/home',
	CONSOLE_DASHBOARD_AUTO = '/console/dashboard',
	CONSOLE_DASHBOARD = '/console/dashboard/:dashboardId',
	CONSOLE_CONNECTED_SPACE = '/console/space/connected/:connectId',
	CONSOLE_CONNECTED_SPACE_CATALOG = '/console/space/connected/:connectId/catalog',
	CONSOLE_CONNECTED_SPACE_SUBJECT = '/console/space/connected/:connectId/subject/:subjectId',
	CONSOLE_CONNECTED_SPACE_SUBJECT_DEF = '/console/space/connected/:connectId/subject/:subjectId/def',
	CONSOLE_CONNECTED_SPACE_SUBJECT_DATA = '/console/space/connected/:connectId/subject/:subjectId/data',
	CONSOLE_CONNECTED_SPACE_SUBJECT_REPORTS = '/console/space/connected/:connectId/subject/:subjectId/report',
	CONSOLE_CONNECTED_SPACE_SUBJECT_REPORT = '/console/space/connected/:connectId/subject/:subjectId/report/:reportId',
	CONSOLE_NOTIFICATION = '/console/notification',
	CONSOLE_MAIL = '/console/mail',
	CONSOLE_TIMELINE = '/console/timeline',
	CONSOLE_SETTINGS = '/console/settings',

	DATA_QUALITY = '/data-quality',
	DATA_QUALITY_HOME = '/data-quality/home',
	DATA_QUALITY_CONSANGUINITY = '/data-quality/consanguinity',
	DATA_QUALITY_CATALOG = '/data-quality/catalog',
	DATA_QUALITY_RULES = '/data-quality/rules',
	DATA_QUALITY_STATISTICS = '/data-quality/statistics',
	DATA_QUALITY_END_USER = '/data-quality/end-user',
	DATA_QUALITY_SETTINGS = '/data-quality/settings',

	INDICATOR = '/indicator',
	INDICATOR_BUCKETS = '/indicator/bucket',
	INDICATOR_INDICATORS = '/indicator/indicator',
	INDICATOR_INDICATOR_PREPARE = '/indicator/indicator/prepare',
	INDICATOR_INSPECTION = '/indicator/inspection',
	INDICATOR_ACHIEVEMENT = '/indicator/navigator',
	INDICATOR_ACHIEVEMENT_QUERY = '/indicator/navigator/query',
	INDICATOR_ACHIEVEMENT_EDIT = '/indicator/navigator/edit/:achievementId',
	INDICATOR_OBJECTIVE_ANALYSIS = '/indicator/objective-analysis',
	INDICATOR_SETTINGS = '/indicator/settings',

	SHARE = '/share',
	SHARE_DASHBOARD = '/share/dashboard/:dashboardId/:token'
}