import {findAccount} from '@/services/data/account';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {ReactNode} from 'react';
import {ICON_COMMENTS} from '../../basic/constants';
import {GreetingContainer, GreetingDescription, GreetingIcon, GreetingTitle} from './widgets';
import {Lang} from "@/widgets/langs";

export const Greeting = (props: { title?: string; children?: ReactNode }) => {
	const name = findAccount()?.name || 'there';
	const hello = Lang.COPILOT.HELLO
	const {title = `${name}`, children} = props;

	return <GreetingContainer>
		<GreetingIcon>
			<FontAwesomeIcon icon={ICON_COMMENTS}/>
		</GreetingIcon>
		<GreetingTitle>{hello} {title}</GreetingTitle>
		<GreetingDescription>{children}</GreetingDescription>
	</GreetingContainer>;
};