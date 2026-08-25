import {loadTags, saveTags, TagDef} from '@/services/data/tuples/tag-types';
import {prettifyDateTimeToMinute} from '@/services/data/tuples/utils';
import {Button} from '@/widgets/basic/button';
import {ICON_CREATED_AT, ICON_DELETE, ICON_LAST_MODIFIED_AT, ICON_SEARCH, ICON_TAG} from '@/widgets/basic/constants';
import {FullWidthPage} from '@/widgets/basic/page';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {PageHeaderButtons} from '@/widgets/basic/page-header-buttons';
import {ButtonInk, TooltipAlignment} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {
	TupleCard,
	TupleCardDescription,
	TupleCardStatistics,
	TupleCardStatisticsItem,
	TupleCardTitle
} from '@/widgets/tuple-workbench/tuple-card';
import {TupleSearchButton, TupleSearchInput} from '@/widgets/tuple-workbench/tuple-search-bar/widgets';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent, useEffect, useRef, useState} from 'react';
import {TagEditor} from './tag-editor';
import {TagCardColorDot, TagCardDeleteButton, TagCardGrid, TagNoData, TagSearchBarContainer} from './widgets';

const matchesSearch = (tag: TagDef, searchText: string): boolean => {
	return (tag.name ?? '').toLowerCase().includes(searchText)
		|| (tag.category ?? '').toLowerCase().includes(searchText)
		|| (tag.description ?? '').toLowerCase().includes(searchText);
};

const TagManagement = () => {
	const {fire} = useEventBus();
	const searchRef = useRef<HTMLInputElement>(null);
	const [tags, setTags] = useState<Array<TagDef>>([]);
	const [searchText, setSearchText] = useState('');

	const reloadTags = () => setTags(loadTags());
	useEffect(() => {
		reloadTags();
	}, []);

	const onSearchChanged = (event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value);
	const onSearchClicked = () => {
		searchRef.current?.focus();
		searchRef.current?.select();
	};
	const onCreateClicked = () => {
		fire(EventTypes.SHOW_DIALOG, <TagEditor onSaved={reloadTags}/>);
	};
	const onEditClicked = (tag: TagDef) => () => {
		fire(EventTypes.SHOW_DIALOG, <TagEditor tag={tag} onSaved={reloadTags}/>);
	};
	const onDeleteClicked = (tag: TagDef) => (event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		fire(EventTypes.SHOW_YES_NO_DIALOG,
			Lang.TAG.DELETE_CONFIRM.replace('{name}', tag.name),
			() => {
				const updated = loadTags().filter(t => t.tagId !== tag.tagId);
				saveTags(updated);
				setTags(updated);
				fire(EventTypes.HIDE_DIALOG);
			},
			() => fire(EventTypes.HIDE_DIALOG));
	};

	const renderTagCard = (tag: TagDef) => {
		return <TupleCard key={tag.tagId} onClick={onEditClicked(tag)}>
			<TupleCardTitle>
				<TagCardColorDot $color={tag.color}/>
				<span>{tag.name}</span>
				<TagCardDeleteButton tooltip={{label: Lang.ACTIONS.DELETE, alignment: TooltipAlignment.CENTER}}
				                     onClick={onDeleteClicked(tag)}>
					<FontAwesomeIcon icon={ICON_DELETE}/>
				</TagCardDeleteButton>
			</TupleCardTitle>
			<TupleCardDescription>{tag.description}</TupleCardDescription>
			<TupleCardStatistics>
				{tag.category
					? <TupleCardStatisticsItem tooltip={{label: Lang.TAG.CATEGORY, alignment: TooltipAlignment.CENTER}}>
						<FontAwesomeIcon icon={ICON_TAG}/>
						<span>{tag.category}</span>
					</TupleCardStatisticsItem>
					: null}
				<TupleCardStatisticsItem tooltip={{label: Lang.TAG.CREATED_AT, alignment: TooltipAlignment.CENTER}}>
					<FontAwesomeIcon icon={ICON_CREATED_AT}/>
					<span>{prettifyDateTimeToMinute(tag.createdAt)}</span>
				</TupleCardStatisticsItem>
				<TupleCardStatisticsItem tooltip={{label: Lang.TAG.LAST_MODIFIED_AT, alignment: TooltipAlignment.CENTER}}>
					<FontAwesomeIcon icon={ICON_LAST_MODIFIED_AT}/>
					<span>{prettifyDateTimeToMinute(tag.lastModifiedAt)}</span>
				</TupleCardStatisticsItem>
			</TupleCardStatistics>
		</TupleCard>;
	};

	const text = searchText.trim().toLowerCase();
	const filteredTags = text.length === 0 ? tags : tags.filter(tag => matchesSearch(tag, text));

	return <FullWidthPage>
		<FullWidthPageHeaderContainer>
			<PageTitle>{Lang.TAG.LIST_TITLE}</PageTitle>
			<PageHeaderButtons>
				<Button ink={ButtonInk.PRIMARY} onClick={onCreateClicked}>{Lang.TAG.CREATE_TAG}</Button>
			</PageHeaderButtons>
		</FullWidthPageHeaderContainer>
		<TagSearchBarContainer noIndent={false}>
			<TupleSearchButton onClick={onSearchClicked}>
				<FontAwesomeIcon icon={ICON_SEARCH}/>
			</TupleSearchButton>
			<TupleSearchInput placeholder={Lang.TAG.SEARCH_PLACEHOLDER}
			                  value={searchText} onChange={onSearchChanged}
			                  ref={searchRef}/>
		</TagSearchBarContainer>
		<TagCardGrid>
			{filteredTags.length === 0
				? <TagNoData>{Lang.TAG.NO_DATA}</TagNoData>
				: filteredTags.map(renderTagCard)}
		</TagCardGrid>
	</FullWidthPage>;
};

export default TagManagement;
