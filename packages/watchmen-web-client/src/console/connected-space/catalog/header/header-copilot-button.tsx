import {toConnectedSpaceCopilot} from '@/routes/utils';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {ICON_MAGIC_SPARKLES} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useNavigate} from 'react-router-dom';

export const HeaderCopilotButton = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	const navigate = useNavigate();
	const onAiSubjectClicked = async () => {
		navigate(toConnectedSpaceCopilot(connectedSpace.connectId));
	};

	return <PageHeaderButton tooltip={Lang.CONSOLE.CONNECTED_SPACE.COPILOT} onClick={onAiSubjectClicked}>
		<FontAwesomeIcon icon={ICON_MAGIC_SPARKLES}/>
	</PageHeaderButton>;
};