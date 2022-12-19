import {Input} from '@/widgets/basic/input';
import styled from 'styled-components';

export const NameInput = styled(Input)`
	width       : calc(100% - var(--margin) / 2);
	height      : calc(var(--height) * 1.2);
	line-height : calc(var(--height) * 1.1);
	font-size   : 1.1em;
`;