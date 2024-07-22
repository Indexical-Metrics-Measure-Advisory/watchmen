import {Router} from '@/routes/types';
import {toDerivedObjective} from '@/routes/utils';
import {ICON_BACK} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {Location, matchPath, useLocation, useNavigate} from 'react-router-dom';
import {DerivedObjective} from "@/services/data/tuples/derived-objective-types";

const isCatalogNow = (location: Location) => !!matchPath({path: Router.CONSOLE_CONNECTED_SPACE_CATALOG}, location.pathname);

export const HeaderBackButton = (props: { derivedObjective: DerivedObjective}) => {
	const {derivedObjective} = props;

	const navigate = useNavigate();
	const location = useLocation();

	const onCatalogClicked = () => {
		// if (isCatalogNow(location)) {
		// 	return;
		// }
		navigate(toDerivedObjective(derivedObjective.derivedObjectiveId));
	};

	return <PageHeaderButton tooltip={Lang.CONSOLE.CONNECTED_SPACE.CATALOG}
	                         ink={isCatalogNow(location) ? ButtonInk.PRIMARY : (void 0)}
	                         onClick={onCatalogClicked}>
		<FontAwesomeIcon icon={ICON_BACK} style={{transform: 'rotateY(180deg)'}}/>
	</PageHeaderButton>;
};