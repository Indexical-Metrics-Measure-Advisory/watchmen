import {getSaml2CallbackUrl} from '@/services/data/login';
import {Account} from '@/services/data/login/types';
import {ButtonInk} from '@/widgets/basic/types';
import {faKey, faUserAstronaut} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import React, {ChangeEvent, useEffect, useRef, useState} from 'react';
import {
	Error,
	Form,
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

const Saml2Login = () => {
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
			const url = `${getSaml2CallbackUrl()}?accountName=${account.name}&SAMLResponse=3VZbj%2BI2FP4rKO8mjhNCYg1I06&RelayState=http%3A%2F%2F127.0.0.1%3A8000%2Fsaml%2Flogin&SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=VTSM64kZOG8pHk4aPKfCD541RSP3ltH38pPdmtnGAmRnQ4zF9i/irODsfrLdCDCsmRpa2lLkkilTywBE2JYbAi/m7+zPT95o2xOngVOk3FDw3Ymn29eR0JehOl/im2GXHJxvSJ9cJjHto9x/BluD/6qvW0yXKFkex47tAI4SI7iizG7V+IZOYv/SoJdjTKOadRZCrbeCPgWGraORCe1LhQEaoID5ylx+y0CQBQ3Dwpamnh5CS0kbgnyOgl0QrE15ag/9+b2R3uizIYeIRU3ws58OB8+9K1rX0JcTH4AWEj8dSsTiq5QESFpghG8e2uhmjkdW7mcbFPiv1mn/W8soHg==`;
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
					<Greeting>{hello} This is mock SAML2 Login.</Greeting>
					<FormBody>
						<FormRow>
							<FormRowIcon icon={faUserAstronaut}/>
							<FormRowInput value={account.name || ''} onChange={onValueChange('name')}
							              onFocus={onNameFocused}
							              ref={nameRef}/>
						</FormRow>
						<FormRow>
							<FormRowIcon icon={faKey}/>
							<FormRowInput type="password"
							              value={account.credential || ''} onChange={onValueChange('credential')}
							              onFocus={onPasswordFocused} onBlur={onPasswordBlurred}
							              ref={credentialRef}/>
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

export default Saml2Login;