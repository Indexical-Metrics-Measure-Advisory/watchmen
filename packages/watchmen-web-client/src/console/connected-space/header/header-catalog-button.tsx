import {Router} from '@/routes/types';
import {toConnectedSpaceCatalog} from '@/routes/utils';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {ICON_CONNECTED_SPACE_CATALOG} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {Location, matchPath, useLocation, useNavigate} from 'react-router-dom';

const isCatalogNow = (location: Location) => !!matchPath({path: Router.CONSOLE_CONNECTED_SPACE_CATALOG}, location.pathname);

export const HeaderCatalogButton = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	const navigate = useNavigate();
	const location = useLocation();

	const onCatalogClicked = () => {
		if (isCatalogNow(location)) {
			return;
		}
		navigate(toConnectedSpaceCatalog(connectedSpace.connectId));
	};

	return <PageHeaderButton tooltip={Lang.CONSOLE.CONNECTED_SPACE.CATALOG}
	                         ink={isCatalogNow(location) ? ButtonInk.PRIMARY : (void 0)}
	                         onClick={onCatalogClicked}>
		<FontAwesomeIcon icon={ICON_CONNECTED_SPACE_CATALOG}/>
	</PageHeaderButton>;
};