import {listTagsByType, saveTag} from '@/services/data/tuples/tag';
import {PRESET_COLORS, Tag, TagType} from '@/services/data/tuples/tag-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';
import React, {ChangeEvent, useEffect, useRef, useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {ICON_ADD, ICON_DROPDOWN} from '@/widgets/basic/constants';
import {DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {
	TagPickerContainer,
	TagItem,
	TagColorDot,
	TagRemoveButton,
	TagDropdown,
	TagDropdownItem,
	CreateTagButton
} from './tag-picker-widgets';

interface TagPickerProps {
	value: Array<string>;
	onChange: (tagIds: Array<string>) => void;
	placeholder?: string;
}

/** admin tags carry no color; derive a stable one from the name for the dots */
const colorOfName = (name: string): string => {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash * 31 + name.charCodeAt(i)) % 997;
	}
	return PRESET_COLORS[hash % PRESET_COLORS.length];
};

const getTagById = (tags: Array<Tag>, tagId: string): Tag | undefined => {
	return tags.find(tag => tag.tagId === tagId);
};

const getTagOptions = (tags: Array<Tag>, selectedIds: Array<string>): Array<DropdownOption> => {
	return tags
		.filter(tag => !selectedIds.includes(tag.tagId ?? ''))
		.map(tag => ({
			value: tag.tagId ?? '',
			label: tag.name ?? ''
		}))
		.sort((a, b) => a.label.localeCompare(b.label));
};

export const TagPicker = (props: TagPickerProps) => {
	const {value, onChange, placeholder = 'Select tags...'} = props;

	const {fire} = useEventBus();
	const [availableTags, setAvailableTags] = useState<Array<Tag>>([]);
	const [dropdownActive, setDropdownActive] = useState(false);
	const [atBottom, setAtBottom] = useState(true);
	const [searchText, setSearchText] = useState('');
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newTagName, setNewTagName] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// load topic-type tags from the admin tag store
	useEffect(() => {
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await listTagsByType(TagType.TOPIC),
			(loaded: Array<Tag>) => setAvailableTags(loaded ?? []));
	}, [fire]);

	// 点击外部关闭下拉
	useEffect(() => {
		const handler = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setDropdownActive(false);
				setShowCreateForm(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	const selectedTags = value.map(tagId => getTagById(availableTags, tagId)).filter(Boolean) as Array<Tag>;

	const toggleDropdown = () => {
		if (!dropdownActive) {
			// 计算下拉位置
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				const dropdownHeight = 240;
				setAtBottom(rect.bottom + dropdownHeight < window.innerHeight);
			}
		}
		setDropdownActive(!dropdownActive);
		setShowCreateForm(false);
	};

	const toggleTag = (tagId: string) => {
		const newValue = value.includes(tagId)
			? value.filter(id => id !== tagId)
			: [...value, tagId];
		onChange(newValue);
	};

	const removeTag = (tagId: string) => {
		onChange(value.filter(id => id !== tagId));
	};

	const handleCreateTag = () => {
		if (!newTagName.trim()) {
			return;
		}
		// saveTag fills the server-generated tagId back into the object on creation
		const tag: Tag = {
			tagId: generateUuid(),
			name: newTagName.trim(),
			type: TagType.TOPIC,
			version: 1,
			createdAt: getCurrentTime(),
			lastModifiedAt: getCurrentTime()
		};
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await saveTag(tag),
			() => {
				setAvailableTags(prev => [...prev, tag]);
				onChange([...value, tag.tagId]);
				setNewTagName('');
				setShowCreateForm(false);
				setSearchText('');
			});
	};

	const filteredOptions = getTagOptions(availableTags, value).filter(option => {
		if (!searchText) {
			return true;
		}
		const tag = availableTags.find(t => t.tagId === option.value);
		return (tag?.name ?? '').toLowerCase().includes(searchText.toLowerCase());
	});

	return (
		<TagPickerContainer
			data-widget="tag-picker"
			data-active={dropdownActive}
			ref={containerRef}
			onClick={toggleDropdown}
		>
			{selectedTags.length === 0 && !dropdownActive
				? <span style={{opacity: 0.6, fontStyle: 'italic'}}>{placeholder}</span>
				: null}
			{selectedTags.map(tag => (
				<TagItem key={tag.tagId} color={colorOfName(tag.name ?? '')}>
					<TagColorDot color={colorOfName(tag.name ?? '')}/>
					<span>{tag.name}</span>
					<TagRemoveButton data-widget="tag-remove" onClick={(e) => {
						e.stopPropagation();
						removeTag(tag.tagId ?? '');
					}}>×</TagRemoveButton>
				</TagItem>
			))}
			{dropdownActive ? (
				<TagDropdown atBottom={atBottom}>
					<div style={{padding: '4px 8px', borderBottom: 'var(--border)'}}>
						<input
							ref={inputRef}
							type="text"
							placeholder="Search or create..."
							value={searchText}
							onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
							onClick={(e) => e.stopPropagation()}
							style={{
								border: 'none',
								outline: 'none',
								width: '100%',
								background: 'transparent',
								fontSize: '14px'
							}}
						/>
					</div>
					{filteredOptions.map(option => {
						const tag = availableTags.find(t => t.tagId === option.value)!;
						return (
							<TagDropdownItem
								key={option.value}
								active={value.includes(option.value)}
								onClick={(e: React.MouseEvent) => {
									e.stopPropagation();
									toggleTag(option.value);
								}}
							>
								<TagColorDot color={colorOfName(tag.name ?? '')}/>
								<span>{tag.name}</span>
							</TagDropdownItem>
						);
					})}
					{searchText && !availableTags.some(t => (t.name ?? '').toLowerCase() === searchText.toLowerCase()) ? (
						<CreateTagButton onClick={(e) => {
							e.stopPropagation();
							setShowCreateForm(true);
							setNewTagName(searchText);
						}}>
							<FontAwesomeIcon icon={ICON_ADD}/>
							<span>Create "{searchText}"</span>
						</CreateTagButton>
					) : null}
					{showCreateForm ? (
						<div style={{
							padding: '8px',
							borderTop: 'var(--border)',
							display: 'flex',
							flexDirection: 'column',
							gap: '4px'
						}} onClick={(e) => e.stopPropagation()}>
							<input
								type="text"
								placeholder="Tag name"
								value={newTagName}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTagName(e.target.value)}
								style={{
									border: 'var(--border)',
									borderRadius: '4px',
									padding: '4px 8px',
									fontSize: '14px'
								}}
							/>
							<div style={{display: 'flex', gap: '4px'}}>
								<button
									onClick={handleCreateTag}
									style={{
										backgroundColor: 'var(--primary-color)',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										padding: '4px 8px',
										cursor: 'pointer',
										fontSize: '12px'
									}}
								>Create</button>
								<button
									onClick={() => setShowCreateForm(false)}
									style={{
										backgroundColor: 'transparent',
										border: 'var(--border)',
										borderRadius: '4px',
										padding: '4px 8px',
										cursor: 'pointer',
										fontSize: '12px'
									}}
								>Cancel</button>
							</div>
						</div>
					) : null}
				</TagDropdown>
			) : null}
			<span style={{marginLeft: 'auto', display: 'flex', alignItems: 'center'}}>
				<FontAwesomeIcon icon={ICON_DROPDOWN} style={{fontSize: '12px', opacity: 0.5}}/>
			</span>
		</TagPickerContainer>
	);
};
