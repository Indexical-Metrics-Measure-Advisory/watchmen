import {Objective, ObjectiveFactor} from '@/services/data/tuples/objective-types';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {Input} from '@/widgets/basic/input';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent} from 'react';
import {useSave} from '../use-save';
import {ItemNo, RemoveItemButton} from '../widgets';
import {FactorContainer} from './widgets';

export const FactorItem = (props: {
	objective: Objective;
	factor: ObjectiveFactor;
	index: number;
	onRemove: (factor: ObjectiveFactor) => void;
}) => {
	const {objective, factor, index, onRemove} = props;

	const save = useSave();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		factor.name = value;
		save(objective);
	};
	const onRemoveClicked = () => onRemove(factor);

	return <FactorContainer>
		<ItemNo>{index === -1 ? '' : `#${index}`}</ItemNo>
		<Input value={factor.name || ''} onChange={onNameChanged}
		       placeholder={Lang.PLAIN.OBJECTIVE_FACTOR_NAME_PLACEHOLDER}/>
		<RemoveItemButton ink={ButtonInk.DANGER} data-as-icon={true} onClick={onRemoveClicked}>
			<FontAwesomeIcon icon={ICON_DELETE}/>
		</RemoveItemButton>
	</FactorContainer>;
};