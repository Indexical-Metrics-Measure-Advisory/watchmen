import {getOidcCallbackUrl} from '@/services/data/login';
import {Account} from '@/services/data/login/types';
import {ButtonInk} from '@/widgets/basic/types';
import {faKey, faUserAstronaut} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import React, {ChangeEvent, useEffect, useRef, useState} from 'react';
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
} from '../widgets';

const OidcLogin = () => {
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
			setError('Please tell me who you are, my friend.');
			nameRef.current!.focus();
			return;
		}
		if ((account.credential || '').trim().length === 0) {
			setError('Credential is required to enjoy the journey.');
			credentialRef.current!.focus();
			return;
		}
		setError('');
		setIng(true);

		setTimeout(() => {
			const url = `${getOidcCallbackUrl()}?accountName=${account.name}`;
			window.location.replace(url);
		}, 2000);
	};

	const hour = dayjs().hour();
	const hello = (hour < 5 || hour > 21) ? 'Good evening !' : (hour < 12 ? 'Good morning !' : 'Good evening !');

	return <LoginContainer>
		<LoginHeader>
			<LoginHeaderLogo/>
			<LoginHeaderTitle>
				Indexical Metrics <span>&</span> Measure Advisory
			</LoginHeaderTitle>
		</LoginHeader>
		<LoginBody>
			<ImagePart>
				<Image avoid={avoid}/>
			</ImagePart>
			<FormPart>
				<Form>
					<Greeting>{hello} This is mock OIDC Login.</Greeting>
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
						<SubmitButton ink={ButtonInk.PRIMARY} spin={ing} onClick={onLoginClicked}>
							<span>Go !</span>
						</SubmitButton>
					</FormFooter>
				</Form>
			</FormPart>
		</LoginBody>
	</LoginContainer>;
};

export default OidcLogin;