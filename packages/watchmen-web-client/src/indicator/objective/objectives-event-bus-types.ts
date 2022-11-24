import {TuplePage} from '@/services/data/query/tuple-page';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	EnumForIndicator,
	QueryIndicator,
	SubjectForIndicator,
	TopicForIndicator
} from '@/services/data/tuples/query-indicator-types';

export interface ObjectivesData {
	indicator?: Indicator;
	topic?: TopicForIndicator;
	subject?: SubjectForIndicator;
	enums?: Array<EnumForIndicator>;
}

export enum ObjectivesEventTypes {
	SEARCHED = 'searched',
	ASK_SEARCHED = 'ask-searched',
}

export interface ObjectivesEventBus {
	fire(type: ObjectivesEventTypes.SEARCHED, page: TuplePage<QueryIndicator>, searchText: string): this;
	on(type: ObjectivesEventTypes.SEARCHED, listener: (page: TuplePage<QueryIndicator>, searchText: string) => void): this;
	off(type: ObjectivesEventTypes.SEARCHED, listener: (page: TuplePage<QueryIndicator>, searchText: string) => void): this;

	fire(type: ObjectivesEventTypes.ASK_SEARCHED, onData: (page?: TuplePage<QueryIndicator>, searchText?: string) => void): this;
	on(type: ObjectivesEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryIndicator>, searchText?: string) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryIndicator>, searchText?: string) => void) => void): this;
}