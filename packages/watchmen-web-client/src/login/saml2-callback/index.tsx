import {isSaml2MockEnabled} from '@/feature-switch';
import {Router} from '@/routes/types';
import {saveAccountIntoSession} from '@/services/data/account';
import {exchangeOnSaml2, getSSOTriggerURL} from '@/services/data/login';
import {Saml2LoginRequest} from '@/services/data/login/types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {Fragment, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

const Saml2Callback = () => {
	const navigate = useNavigate();
	const {fire} = useEventBus();
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const SAMLResponse = params.get('SAMLResponse');
		const RelayState = params.get('RelayState');
		const SigAlg = params.get('SigAlg');
		const Signature = params.get('Signature');

		const request: Saml2LoginRequest = {
			mockUserName: isSaml2MockEnabled() ? params.get('accountName')! : (void 0),
			data: SAMLResponse!,
			relayState: RelayState!,
			algorithm: SigAlg!,
			signature: Signature!
		};
		(async () => {
			const response = await exchangeOnSaml2(request);
			let {pass, accountName, admin, super: superAdmin, tenantId, error} = response;
			if (!pass) {
				fire(EventTypes.SHOW_ALERT, <AlertLabel>{error || Lang.LOGIN.FAIL}</AlertLabel>);
				return;
			}

			saveAccountIntoSession({
				name: (accountName || '').trim(),
				admin,
				super: superAdmin,
				tenantId
			});
			const triggerURL = getSSOTriggerURL();
			if (triggerURL != null && triggerURL.trim().length !== 0) {
				window.location.replace(triggerURL);
			} else if (admin || superAdmin) {
				navigate(Router.ADMIN, {replace: true});
			} else {
				navigate(Router.CONSOLE, {replace: true});
			}

		})();
	}, [fire, navigate]);

	return <Fragment/>;
};

export default Saml2Callback;