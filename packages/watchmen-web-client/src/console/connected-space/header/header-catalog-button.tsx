import {Router} from '@/routes/types';
import {toConnectedSpaceCatalog} from '@/routes/utils';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {ICON_CONNECTED_SPACE_CATALOG} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Location} from 'history';
import React from 'react';
import {matchPath, useHistory, useLocation} from 'react-router-dom';

const isCatalogNow = (location: Location) => {
	return !!matchPath(location.pathname, Router.CONSOLE_CONNECTED_SPACE_CATALOG);
};

export const HeaderCatalogButton = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	const history = useHistory();
	const location = useLocation();

	const onCatalogClicked = () => {
		if (isCatalogNow(location)) {
			return;
		}
		history.push(toConnectedSpaceCatalog(connectedSpace.connectId));
	};

	return <PageHeaderButton tooltip={Lang.CONSOLE.CONNECTED_SPACE.CATALOG}
	                         ink={isCatalogNow(location) ? ButtonInk.PRIMARY : (void 0)}
	                         onClick={onCatalogClicked}>
		<FontAwesomeIcon icon={ICON_CONNECTED_SPACE_CATALOG}/>
	</PageHeaderButton>;
};