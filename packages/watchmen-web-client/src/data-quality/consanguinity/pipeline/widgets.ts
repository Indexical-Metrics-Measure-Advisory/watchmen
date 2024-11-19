import styled from 'styled-components';
import {ExecutionResultClickableItem, ExecutionResultItem} from '@/widgets/chatbot';

// noinspection CssUnresolvedCustomProperty
export const PipelineName = styled.div`
	display: flex;
	align-items: center;
	height: var(--height);
	grid-column: span 3;
	color: var(--warn-color);
	font-weight: var(--font-boldest);
`;
// noinspection CssUnresolvedCustomProperty
export const TopicGroup = styled.div`
	display: flex;
	align-items: center;
	height: var(--height);
	color: var(--warn-color);
	font-weight: var(--font-bold);
	grid-column: 1;
`;
export const TopicName = styled(ExecutionResultClickableItem)`
	grid-column: 2;
`;
export const FactorName = styled(ExecutionResultItem)`
	grid-column: 3;
`;
// noinspection CssUnresolvedCustomProperty
export const InspectResult = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	grid-column: span 3;
	grid-column-gap: var(--margin);
`;
// noinspection CssUnresolvedCustomProperty
export const InspectPipelineName = styled.div`
	display: flex;
	align-items: center;
	height: var(--height);
	color: var(--warn-color);
	font-weight: var(--font-boldest);
`;
export const InspectItems = styled.div`
	display: flex;
	flex-direction: column;
	grid-column: span 2;
`;
// noinspection CssUnresolvedCustomProperty
export const InspectItem = styled.div`
	display: flex;
	align-items: center;
	height: var(--height);
`;