import {fetchEnum} from '@/services/data/tuples/enum';
import {QueryEnum} from '@/services/data/tuples/query-enum-types';
import {Button} from '@/widgets/basic/button';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Input} from '@/widgets/basic/input';
import {ButtonInk} from '@/widgets/basic/types';
import {downloadAsZip, ZipFiles} from '@/widgets/basic/utils';
import {DialogBody, DialogFooter} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import dayjs from 'dayjs';
import React, {ChangeEvent, useState} from 'react';
import styled from 'styled-components';

interface Filter {
	value: string;
	handler?: number;
}

const SwitchDialogBody = styled(DialogBody)`
	display               : grid;
	grid-template-columns : 1fr;
	grid-template-rows    : auto auto 1fr auto auto auto;
	margin-bottom         : var(--margin);
`;
const TopicTableHeader = styled.div`
	display               : grid;
	position              : relative;
	grid-template-columns : 40px 60px 1fr;
`;
const HeaderCell = styled.div`
	display      : flex;
	align-items  : center;
	height       : var(--height);
	font-weight  : var(--font-bold);
	font-variant : petite-caps;
	padding      : 0 calc(var(--margin) / 4);
	> input {
		border-top    : 0;
		border-left   : 0;
		border-right  : 0;
		border-radius : 0;
		height        : calc(var(--height) * 0.8);
		width         : 100%;
		padding       : 0;
		margin-bottom : -1px;
		margin-left   : calc(var(--margin) / 2);
	}
`;
const TopicTableBody = styled.div.attrs({'data-v-scroll': ''})`
	display    : block;
	position   : relative;
	overflow-y : auto;
`;
const BodyRow = styled.div`
	display               : grid;
	position              : relative;
	grid-template-columns : 40px 60px 1fr;
	&:nth-child(2n) {
		background-color : var(--grid-rib-bg-color);
	}
	&:hover {
		background-color : var(--hover-color);
	}
`;
const BodyCell = styled.div`
	display     : flex;
	align-items : center;
	height      : var(--height);
	padding     : 0 calc(var(--margin) / 4);
`;
const DownloadOptionLeadLabel = styled.div`
	display      : flex;
	align-items  : center;
	height       : var(--height);
	font-variant : petite-caps;
	font-weight  : var(--font-bold);
`;

export const EnumItemsDownloadDialog = (props: {
	enums: Array<QueryEnum>;
}) => {
	const {enums} = props;

	const {fire} = useEventBus();
	const [items, setItems] = useState(enums);
	const [selection, setSelection] = useState(enums);
	const [filter, setFilter] = useState<Filter>({value: ''});

	const onFilterTextChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		if (filter.handler) {
			window.clearTimeout(filter.handler);
		}
		setFilter({
			value, handler: window.setTimeout(() => {
				delete filter.handler;
				const text = value.trim().toLowerCase();
				if (text === '') {
					setItems(enums);
				} else {
					setItems(enums.filter(topic => (topic.name || '').toLowerCase().includes(text)));
				}
			}, 300)
		});
	};
	const onSelectionChange = (enumeration: QueryEnum) => (value: boolean) => {
		if (value) {
			setSelection([enumeration, ...selection]);
		} else {
			setSelection(selection.filter(t => t !== enumeration));
		}
	};
	const onSelectAllClicked = () => {
		setSelection(enums);
	};
	const onDeselectAllClicked = () => {
		setSelection([]);
	};
	const onDownloadClicked = async () => {
		const data = await Promise.all(selection.map(async enumeration => {
			return await fetchEnum(enumeration.enumId);
		}));

		const zip: ZipFiles = data.reduce((zip, enumeration) => {
			zip[`${enumeration.name}-${enumeration.enumId}.csv`] = 'code,label,replaceCode,parentCode\n' + enumeration.items.map(item => {
				return `${item.code || ''},${item.label || ''},${item.replaceCode || ''},${item.parentCode || ''}`;
			}).join('\n');
			return zip;
		}, {} as ZipFiles);

		await downloadAsZip(zip, `enum-items-${dayjs().format('YYYYMMDDHHmmss')}.zip`);
	};
	const onCloseClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	return <>
		<SwitchDialogBody>
			<DownloadOptionLeadLabel>Please select enumerations</DownloadOptionLeadLabel>
			<TopicTableHeader>
				<HeaderCell>#</HeaderCell>
				<HeaderCell>View</HeaderCell>
				<HeaderCell>
					<span>Enumeration</span>
					<Input placeholder="Filter by name..."
					       value={filter.value} onChange={onFilterTextChanged}/>
				</HeaderCell>
			</TopicTableHeader>
			<TopicTableBody>
				{items.map((enumeration, index) => {
					return <BodyRow key={enumeration.enumId}>
						<BodyCell>{index + 1}</BodyCell>
						<BodyCell>
							<CheckBox value={selection.includes(enumeration)}
							          onChange={onSelectionChange(enumeration)}/>
						</BodyCell>
						<BodyCell>{enumeration.name || 'Noname Topic'}</BodyCell>
					</BodyRow>;
				})}
			</TopicTableBody>
		</SwitchDialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={onSelectAllClicked}>Select All</Button>
			<Button ink={ButtonInk.PRIMARY} onClick={onDeselectAllClicked}>Deselect All</Button>
			<Button ink={ButtonInk.PRIMARY} onClick={onDownloadClicked}>Download</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCloseClicked}>Close</Button>
		</DialogFooter>
	</>;
};
