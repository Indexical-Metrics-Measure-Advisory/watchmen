import styled, {keyframes} from 'styled-components';
import {RelationCurvePoints} from './types';

export const Curve = styled.path.attrs<{ lattice: RelationCurvePoints, dash?: boolean, disabled?: boolean }>(
	({lattice: {drawn}, dash = false, disabled = false}) => {
		return {
			d: drawn,
			style: {
				strokeDasharray: dash ? '5 2' : (disabled ? '8 4' : (void 0)),
				opacity: dash ? 0.15 : (disabled ? 0.4 : 1),
				stroke: dash ? 'var(--info-color)' : (disabled ? 'var(--border-color)' : (void 0))
			}
		};
	})<{ lattice: RelationCurvePoints, dash?: boolean, disabled?: boolean }>`
	stroke       : var(--waive-color);
	stroke-width : 2px;
	fill         : transparent;
`;

const RelationAnimationFrames = keyframes`
	from {
		offset-distance : 0;
	}
	to {
		offset-distance : 100%;
	}
`;
export const RelationAnimationDot = styled.div.attrs<{ lattice: RelationCurvePoints, visible: boolean }>(
	({lattice: {drawn}, visible}) => {
		return {
			style: {
				display: visible ? 'block' : 'none',
				offsetPath: `path("${drawn}")`
			}
		};
	})<{ lattice: RelationCurvePoints, visible: boolean }>`
	position         : absolute;
	top              : 0;
	left             : 0;
	width            : 8px;
	height           : 8px;
	background-color : var(--info-color);
	border-radius    : 100%;
	offset-distance  : 0;
	animation        : ${RelationAnimationFrames} 2s ease-in-out 0s infinite normal none;
`;
