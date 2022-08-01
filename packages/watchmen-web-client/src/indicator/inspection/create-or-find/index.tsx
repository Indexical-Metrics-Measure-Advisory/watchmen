import {CreateOrFindEditor} from './editor';
import {CreateOrFindViewer} from './viewer';

export const CreateOrFind = (props: { reusable: boolean }) => {
	const {reusable} = props;

	return <>
		<CreateOrFindEditor reusable={reusable}/>
		<CreateOrFindViewer/>
	</>;
};