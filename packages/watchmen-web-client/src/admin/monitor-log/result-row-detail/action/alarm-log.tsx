import {isAlarmLog, MonitorLogAction} from '@/services/data/admin/logs';
import {toDisplayValue} from './utils';
import {BodyLabel, BodyValue} from './widgets';

export const AlarmLog = (props: { log: MonitorLogAction }) => {
	const {log} = props;

	if (!isAlarmLog(log)) {
		return null;
	}

	const {prerequisite = true, touched} = log;
	let displayValue = toDisplayValue(touched);

	return <>
		<BodyLabel>Alarmed</BodyLabel>
		<BodyValue emphasis={true}>{`${prerequisite}`}</BodyValue>
		{prerequisite
			? <>
				<BodyLabel>Value</BodyLabel>
				<BodyValue>{displayValue}</BodyValue>
			</>
			: null}
	</>;
};