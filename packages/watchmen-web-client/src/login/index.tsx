import {Router} from '@/routes/types';
import {toAbsoluteUrl} from '@/routes/utils';
import {saveAccountIntoSession} from '@/services/data/account';
import {askLoginConfig, login} from '@/services/data/login';
import {Account, LoginConfig, LoginMethod} from '@/services/data/login/types';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {Lang} from '@/widgets/langs';
import {faKey, faUserAstronaut} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import React, {ChangeEvent, Fragment, useEffect, useRef, useState} from 'react';
import {
	Error,
	Form,
	FormAutofillChip,
	FormBody,
	FormFooter,
	FormPart,
	FormRow,
	FormRowIcon,
	FormRowInput,
	Greeting,
	Image,
	ImagePart,
	LoginBody,
	LoginContainer,
	LoginHeader,
	LoginHeaderLogo,
	LoginHeaderTitle,
	SubmitButton
} from './widgets';

const RegularLogin = () => {
	// noinspection DuplicatedCode
	const nameRef = useRef<HTMLInputElement>(null);
	const credentialRef = useRef<HTMLInputElement>(null);
	const [account, setAccount] = useState<Account>({} as Account);
	const [avoid, setAvoid] = useState(false);
	const [ing, setIng] = useState(false);
	const [error, setError] = useState('');
	useEffect(() => {
		if (nameRef.current) {
			nameRef.current.focus();
			nameRef.current.select();
		}
	}, []);

	const onValueChange = (prop: keyof Account) => (event: ChangeEvent<HTMLInputElement>) => {
		setAccount({...account, [prop]: event.target.value});
	};
	const onNameFocused = () => nameRef.current!.select();
	const onPasswordFocused = () => {
		credentialRef.current!.select();
		setAvoid(true);
	};
	const onPasswordBlurred = () => setAvoid(false);
	const onLoginClicked = async () => {
		if ((account.name || '').trim().length === 0) {
			setError(Lang.LOGIN.NAME_EMPTY);
			nameRef.current!.focus();
			return;
		}
		if ((account.credential || '').trim().length === 0) {
			setError(Lang.LOGIN.CREDENTIAL_EMPTY);
			credentialRef.current!.focus();
			return;
		}
		setError('');
		setIng(true);

		try {
			const {pass, admin, super: superAdmin, tenantId, error} = await login(account);
			if (!pass) {
				setError(error || Lang.LOGIN.FAIL);
				return;
			}

			saveAccountIntoSession({
				name: (account.name || '').trim(),
				admin,
				super: superAdmin,
				tenantId
			});
			if (admin || superAdmin) {
				window.location.replace(toAbsoluteUrl(Router.ADMIN));
			} else {
				window.location.replace(toAbsoluteUrl(Router.CONSOLE));
			}
		} catch (e) {
			console.error(e);
			setError(Lang.ERROR.UNPREDICTED);
			setIng(false);
		}
	};

	const hour = dayjs().hour();
	const hello = (hour < 5 || hour > 21) ? Lang.LOGIN.EVENING : (hour < 12 ? Lang.LOGIN.MORNING : Lang.LOGIN.AFTERNOON);

	return <LoginContainer>
		<LoginHeader>
			<LoginHeaderLogo/>
			<LoginHeaderTitle>{Lang.LOGIN.PRODUCT_TITLE}</LoginHeaderTitle>
		</LoginHeader>
		<LoginBody>
			<ImagePart>
				<Image avoid={avoid}/>
			</ImagePart>
			<FormPart>
				<Form>
					<Greeting>{hello}</Greeting>
					<FormBody>
						<FormRow>
							<FormRowIcon icon={faUserAstronaut}/>
							<FormRowInput defaultValue={account.name || ''} onChange={onValueChange('name')}
							              onFocus={onNameFocused}
							              ref={nameRef}/>
							<FormAutofillChip/>
						</FormRow>
						<FormRow>
							<FormRowIcon icon={faKey}/>
							<FormRowInput type="password"
							              defaultValue={account.credential || ''} onChange={onValueChange('credential')}
							              onFocus={onPasswordFocused} onBlur={onPasswordBlurred}
							              ref={credentialRef}/>
							<FormAutofillChip/>
						</FormRow>
					</FormBody>
					<FormFooter>
						<Error>{error}</Error>
						<SubmitButton ink={ButtonInk.PRIMARY} spin={ing}
						              onClick={onLoginClicked}>
							<span>{Lang.LOGIN.BUTTON}</span>
						</SubmitButton>
					</FormFooter>
				</Form>
			</FormPart>
		</LoginBody>
	</LoginContainer>;
};

const LoginIndex = () => {
	const {fire} = useEventBus();
	const [config, setConfig] = useState<LoginConfig | null>(null);
	useEffect(() => {
		(async () => {
			try {
				const config = await askLoginConfig();
				setConfig(config);
			} catch {
				setConfig({method: LoginMethod.DOLL});
			}
		})();
	}, [fire]);

	if (config == null) {
		return <Fragment/>;
	} else if (config.method == null || config.url == null || config.url.trim().length === 0 || config.method === LoginMethod.DOLL) {
		return <RegularLogin/>;
	} else if (config.method === LoginMethod.SAML2) {
		// redirect to saml2 server
		window.location.replace(config.url!);
		return <Fragment/>;
	} else if (config.method === LoginMethod.OIDC) {
		// redirect to oidc server
		window.location.replace(config.url!);
		return <Fragment/>;

	} else {
		return <RegularLogin/>;
	}
};

export {LoginIndex};
export default LoginIndex;