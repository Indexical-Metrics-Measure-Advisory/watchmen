export enum SubscriptionFrequency {
	MONTHLY = 'monthly',
	WEEKLY = 'weekly',
	DAILY = 'daily'
}

export interface Subscription {
	mail: string;
	slack: string;
	frequency: SubscriptionFrequency;
}
