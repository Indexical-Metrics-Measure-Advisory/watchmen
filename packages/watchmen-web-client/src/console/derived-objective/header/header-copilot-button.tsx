import {toDerivedObjectiveCopilot} from '@/routes/utils';
import {ICON_MAGIC_SPARKLES} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useNavigate} from 'react-router-dom';
import {DerivedObjective} from "@/services/data/tuples/derived-objective-types";

export const HeaderCopilotButton = (props: { derivedObjective: DerivedObjective}) => {
	const {derivedObjective} = props;

	const navigate = useNavigate();
	const onAiSubjectClicked = async () => {
		navigate(toDerivedObjectiveCopilot(derivedObjective.derivedObjectiveId));
	};

	return <PageHeaderButton tooltip={Lang.CONSOLE.CONNECTED_SPACE.COPILOT} onClick={onAiSubjectClicked}>
		<FontAwesomeIcon icon={ICON_MAGIC_SPARKLES}/>
	</PageHeaderButton>;
};