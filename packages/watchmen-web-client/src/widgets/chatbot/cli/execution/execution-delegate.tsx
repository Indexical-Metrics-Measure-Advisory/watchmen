import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ReactNode} from 'react';
import {ICON_CMD_PROMPT, ICON_LOCK, ICON_ROBOT, ICON_UNLOCK} from '../../../basic/constants';
import {useForceUpdate} from '../../../basic/utils';
import {ExecutionContent} from '../types';
import {
	ExecuteThinkingContainer,
	ExecutionCommandLine,
	ExecutionContainer,
	ExecutionLockButton,
	ExecutionPrompt,
	ExecutionResult,
	ExecutionTimeContainer,
	ExecutionTimeLabel,
	ExecutionTimeLine
} from './widgets';

const ExecutionOperators = (props: {
	content: ExecutionContent;
}) => {
	const {content} = props;

	const forceUpdate = useForceUpdate();
	const onLockClicked = () => {
		content.locked = !content.locked;
		forceUpdate();
	};

	const {time: executeAt, locked} = content;
	const executeTime = executeAt ? (executeAt.isToday() ? executeAt.format('HH:mm:ss') : executeAt.fromNow()) : '';

	return <ExecutionTimeContainer>
		<ExecutionTimeLine/>
		<ExecutionTimeLabel>{executeTime}</ExecutionTimeLabel>
		<ExecutionLockButton onClick={onLockClicked}>
			<FontAwesomeIcon icon={locked ? ICON_UNLOCK : ICON_LOCK}/>
		</ExecutionLockButton>
	</ExecutionTimeContainer>;
};

export const ExecuteThinking = () => {
	return <ExecuteThinkingContainer>
		<span/>
		<span/>
		<span/>
	</ExecuteThinkingContainer>;
};
export const ExecutionDelegate = (props: {
	content: ExecutionContent;
	commandLine?: ReactNode;
	result?: ReactNode;
	toBeContinue?: boolean;
}) => {
	const {content, commandLine, result, toBeContinue = false} = props;

	const renderResult = (grab: boolean) => {
		if (result != null) {
			return <ExecutionResult data-grab-width={grab}>
				{result}
				{toBeContinue ? <ExecuteThinking/> : null}
			</ExecutionResult>;
		} else {
			return <ExecutionResult data-grab-width={grab}>
				<ExecuteThinking/>
			</ExecutionResult>;
		}
	};

	return <ExecutionContainer>
		<ExecutionPrompt>
			{commandLine != null ? <FontAwesomeIcon icon={ICON_CMD_PROMPT}/> : <FontAwesomeIcon icon={ICON_ROBOT}/>}
		</ExecutionPrompt>
		{commandLine != null
			? <ExecutionCommandLine>{commandLine}</ExecutionCommandLine>
			: renderResult(false)}
		<ExecutionOperators content={content}/>
		{commandLine != null ? renderResult(true) : null}
	</ExecutionContainer>;
};
