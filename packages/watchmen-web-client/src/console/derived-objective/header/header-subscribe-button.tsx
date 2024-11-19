import {Subscription, SubscriptionFrequency} from '@/services/data/subscribe';
import {submitDerivedObjectiveSubscription} from '@/services/data/tuples/derived-objective';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {
    ObjectiveTimeFrame,
    ObjectiveTimeFrameKind,
    ObjectiveTimeFrameTill
} from '@/services/data/tuples/objective-types';
import {Button} from '@/widgets/basic/button';
import {ICON_SUBSCRIBE} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {DialogBody, DialogFooter, DialogLabel} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {guardTimeFrame} from '@/widgets/objective/time-frame-utils';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {useObjectiveEventBus} from '../objective-event-bus';
import {ObjectiveEventTypes} from '../objective-event-bus-types';

const ShareDialogBody = styled(DialogBody)`
	display               : grid;
	grid-template-columns : auto 1fr;
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
	align-items           : center;
	margin-bottom         : var(--margin);
	> span[data-widget=dialog-label] {
		display     : flex;
		position    : relative;
		align-items : center;
	}
	> span[data-widget=dialog-label]:first-child {
		grid-column   : span 2;
		font-size     : 1.4em;
		font-weight   : var(--font-bold);
		margin-bottom : calc(var(--margin) / 2);
	}
	> span[data-widget=dialog-label]:nth-child(8) {
		grid-column : span 2;
		font-size   : 1.1em;
		font-weight : var(--font-demi-bold);
	}
	> span[data-widget=dialog-label]:nth-child(2),
	> span[data-widget=dialog-label]:nth-child(4),
	> span[data-widget=dialog-label]:nth-child(6),
	> span[data-widget=dialog-label]:nth-child(7) {
		height : var(--height);
		&:nth-child(2n) {
			font-weight : var(--font-bold);
			opacity     : 0.7;
		}
	}
`;

const askFrequency = (timeFrame: ObjectiveTimeFrame): SubscriptionFrequency | null => {
	if (timeFrame.till === ObjectiveTimeFrameTill.SPECIFIED) {
		return null;
	}
	switch (timeFrame?.kind) {
		case ObjectiveTimeFrameKind.DAY_OF_WEEK:
		case ObjectiveTimeFrameKind.DAY_OF_MONTH:
		case ObjectiveTimeFrameKind.LAST_N_DAYS:
			return SubscriptionFrequency.DAILY;
		case ObjectiveTimeFrameKind.WEEK_OF_YEAR:
		case ObjectiveTimeFrameKind.LAST_N_WEEKS:
			return SubscriptionFrequency.WEEKLY;
		case ObjectiveTimeFrameKind.MONTH:
		case ObjectiveTimeFrameKind.LAST_N_MONTHS:
			return SubscriptionFrequency.MONTHLY;
		default:
			return null;
	}
};

const DerivedObjectiveSubscribe = (props: { derivedObjective: DerivedObjective; frequency: SubscriptionFrequency }) => {
	const {derivedObjective, frequency} = props;

	const {fire} = useEventBus();
	const [state, setState] = useState(false);
	const [subscription] = useState<Subscription>({mail: '', slack: '', frequency});

	// const onMailChanged = (event: ChangeEvent<HTMLInputElement>) => {
	// 	setSubscription(state => ({...state, mail: event.target.value}));
	// };
	// const onSlackChanged = (event: ChangeEvent<HTMLInputElement>) => {
	// 	setSubscription(state => ({...state, slack: event.target.value}));
	// };
	const onSubscribeClicked = async () => {
		setState(false);
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => submitDerivedObjectiveSubscription(derivedObjective.derivedObjectiveId, subscription),
			() => setState(true));
	};
	const onCloseClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	const frequencyLabel = {
		[SubscriptionFrequency.DAILY]: Lang.SUBSCRIBE.DAILY,
		[SubscriptionFrequency.WEEKLY]: Lang.SUBSCRIBE.WEEKLY,
		[SubscriptionFrequency.MONTHLY]: Lang.SUBSCRIBE.MONTHLY
	}[frequency];

	return <>
		<ShareDialogBody>
			<DialogLabel>{Lang.SUBSCRIBE.ON}</DialogLabel>
			{/*<DialogLabel>{Lang.SUBSCRIBE.BY_MAIL}</DialogLabel>*/}
			{/*<Input value={subscription.mail} onChange={onMailChanged}*/}
			{/*       placeholder={Lang.PLAIN.SUBSCRIBE_MAIL_ADDRESS_PLACEHOLDER}/>*/}
			{/*<DialogLabel>{Lang.SUBSCRIBE.BY_SLACK}</DialogLabel>*/}
			{/*<Input value={subscription.slack} onChange={onSlackChanged}/>*/}
			<DialogLabel>{Lang.SUBSCRIBE.FREQUENCY}</DialogLabel>
			<DialogLabel>{frequencyLabel}</DialogLabel>
			{state ? <DialogLabel>{Lang.SUBSCRIBE.SUBSCRIPTION_SUBMITTED}</DialogLabel> : null}
		</ShareDialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={onSubscribeClicked}>{Lang.ACTIONS.CONFIRM}</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCloseClicked}>{Lang.ACTIONS.CLOSE}</Button>
		</DialogFooter>
	</>;
};

export const HeaderSubscribeButton = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	const {fire} = useEventBus();
	const {on, off} = useObjectiveEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onTimeFrameChanged = () => forceUpdate();
		on(ObjectiveEventTypes.TIME_FRAME_CHANGED, onTimeFrameChanged);
		return () => {
			off(ObjectiveEventTypes.TIME_FRAME_CHANGED, onTimeFrameChanged);
		};
	}, [on, off, forceUpdate]);

	const {definition: objective} = derivedObjective;
	const timeFrame = guardTimeFrame(objective);
	const frequency = askFrequency(timeFrame);
	if (frequency == null) {
		return null;
	}

	const onSubscribeClicked = () => {
		fire(EventTypes.SHOW_DIALOG,
			<DerivedObjectiveSubscribe derivedObjective={derivedObjective} frequency={frequency}/>);
	};

	return <PageHeaderButton tooltip={Lang.ACTIONS.SUBSCRIBE} onClick={onSubscribeClicked}>
		<FontAwesomeIcon icon={ICON_SUBSCRIBE}/>
	</PageHeaderButton>;
};