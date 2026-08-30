export enum PublishNotificationTargetType {
	FEISHU = 'feishu',
	WEBHOOK = 'webhook'
}

export enum PublishNotificationResourceType {
	TOPIC = 'topic',
	PIPELINE = 'pipeline'
}

export interface PublishNotificationSetting {
	settingId: string;
	// notify only when enabled
	enabled: boolean;
	// resources whose publish action triggers the notification
	resources: PublishNotificationResourceType[];
	// target type of the external system
	type: PublishNotificationTargetType;
	// feishu bot webhook url, or the url of a generic http endpoint
	url: string;
	// sign secret of the feishu bot, or bearer token of the generic endpoint
	secret: string;
	tenantId?: string;
	version?: number;
	createdAt?: string;
	createdBy?: string;
	lastModifiedAt?: string;
	lastModifiedBy?: string;
}

export interface PublishNotificationTestResult {
	success: boolean;
	message: string;
}
