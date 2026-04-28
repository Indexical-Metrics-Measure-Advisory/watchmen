import {TagDef, loadTags, saveTags} from '@/services/data/tuples/tag-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {Button} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {EventTypes} from '@/widgets/events/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {PageHeaderButtons} from '@/widgets/basic/page-header-buttons';
import React, {useEffect, useState} from 'react';
import {
	TagCardActions,
	TagCardBody,
	TagCardColorDot,
	TagCardContainer,
	TagCardDeleteBtn,
	TagCardDescription,
	TagCardEditBtn,
	TagCardGrid,
	TagCardMeta,
	TagCardMetaItem,
	TagCardTitle,
	TagEditorActions,
	TagEditorCancelBtn,
	TagEditorColorInput,
	TagEditorColorPicker,
	TagEditorColorSwatch,
	TagEditorField,
	TagEditorInput,
	TagEditorLabel,
	TagEditorOverlay,
	TagEditorPanel,
	TagEditorSaveBtn,
	TagEditorTextarea,
	TagEditorTitle,
	TagManagementContainer,
	TagNoData,
} from './widgets';

const TagManagement = () => {
	const [tags, setTags] = useState<Array<TagDef>>([]);
	const [editingTag, setEditingTag] = useState<TagDef | undefined>(undefined);
	const [showEditor, setShowEditor] = useState(false);
	const [expandedTagId, setExpandedTagId] = useState<string | null>(null);
	const {fire} = useEventBus();

	const loadTagList = () => {
		const data = loadTags();
		setTags(data);
	};

	useEffect(() => {
		loadTagList();
	}, []);

	const handleCreate = () => {
		setEditingTag(undefined);
		setExpandedTagId(null);
		setShowEditor(true);
	};

	const handleEdit = (tag: TagDef) => {
		setEditingTag(tag);
		setShowEditor(true);
	};

	const handleDelete = (tag: TagDef) => {
		fire(EventTypes.SHOW_YES_NO_DIALOG,
			`Are you sure to delete tag "${tag.name}"?`,
			() => {
				const updated = tags.filter(t => t.tagId !== tag.tagId);
				saveTags(updated);
				setTags(updated);
				fire(EventTypes.HIDE_DIALOG);
			},
			() => fire(EventTypes.HIDE_DIALOG)
		);
	};

	const handleSave = () => {
		setShowEditor(false);
		setEditingTag(undefined);
		setExpandedTagId(null);
		loadTagList();
	};

	const handleCancel = () => {
		setShowEditor(false);
		setEditingTag(undefined);
	};

	const toggleExpand = (tagId: string) => {
		setExpandedTagId(prev => prev === tagId ? null : tagId);
	};

	const renderTagCard = (tag: TagDef) => {
		const isExpanded = expandedTagId === tag.tagId;

		return (
			<TagCardContainer
				key={tag.tagId}
				data-widget="tag-card"
				onClick={() => !isExpanded && toggleExpand(tag.tagId)}
			>
				<TagCardBody onClick={isExpanded ? () => toggleExpand(tag.tagId) : undefined}>
					<TagCardTitle>
						<TagCardColorDot $color={tag.color} data-widget="tag-color-dot" />
						<span>{tag.name}</span>
					</TagCardTitle>
					{tag.description ? (
						<TagCardDescription>{tag.description}</TagCardDescription>
					) : null}
					<TagCardMeta>
						{tag.category ? (
							<TagCardMetaItem>{tag.category}</TagCardMetaItem>
						) : null}
						<TagCardMetaItem style={{display: 'flex', alignItems: 'center', gap: 4}}>
							<TagCardColorDot $color={tag.color} style={{width: 8, height: 8, borderRadius: 2}} />
							{tag.color}
						</TagCardMetaItem>
					</TagCardMeta>
				</TagCardBody>

				<TagCardActions>
					<TagCardEditBtn
						data-widget="tag-edit-btn"
						onClick={(e) => { e.stopPropagation(); handleEdit(tag); }}
					>
						Edit
					</TagCardEditBtn>
					<TagCardDeleteBtn
						data-widget="tag-delete-btn"
						onClick={(e) => { e.stopPropagation(); handleDelete(tag); }}
					>
						Delete
					</TagCardDeleteBtn>
				</TagCardActions>
			</TagCardContainer>
		);
	};

		return (
		<TagManagementContainer>
			<FullWidthPageHeaderContainer>
				<PageTitle>Tag Management</PageTitle>
				<PageHeaderButtons>
					<Button ink={ButtonInk.PRIMARY} onClick={handleCreate}>
						Create Tag
					</Button>
				</PageHeaderButtons>
			</FullWidthPageHeaderContainer>

			<div style={{flexGrow: 1, overflowY: 'auto'}}>
				{tags.length === 0 ? (
					<TagNoData>No tags found. Create your first tag to get started.</TagNoData>
				) : (
					<TagCardGrid>{tags.map(tag => renderTagCard(tag))}</TagCardGrid>
				)}
			</div>

			{showEditor ? (
				<TagEditorOverlay
					onClick={(e: React.MouseEvent) => {
						if (e.target === e.currentTarget) handleCancel();
					}}
				>
					<TagEditorPanel>
						<TagEditorTitle>
							{editingTag ? 'Edit Tag' : 'Create Tag'}
						</TagEditorTitle>

						<TagEditorField>
							<TagEditorLabel>Name *</TagEditorLabel>
							<TagEditorInput
								type="text"
								value={editingTag?.name ?? ''}
								placeholder="Tag name"
								autoFocus
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
									setEditingTag(prev => prev ? {...prev, name: e.target.value} : {tagId: '', name: e.target.value, color: '#1890ff', createdAt: '', lastModifiedAt: ''});
								}}
							/>
						</TagEditorField>

						<TagEditorField>
							<TagEditorLabel>Color *</TagEditorLabel>
							<TagEditorColorPicker>
								{['#ff4d4f', '#fa8c16', '#faad14', '#52c41a', '#1890ff', '#2f54eb', '#722ed1', '#eb2f96', '#13c2c2', '#a0d911'].map(c => (
									<TagEditorColorSwatch
										key={c}
										$color={c}
										$selected={editingTag?.color === c}
										onClick={() => setEditingTag(prev => prev ? {...prev, color: c} : {tagId: '', name: '', color: c, createdAt: '', lastModifiedAt: ''})}
									/>
								))}
							</TagEditorColorPicker>
							<TagEditorColorInput
								type="text"
								value={editingTag?.color ?? '#1890ff'}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTag(prev => prev ? {...prev, color: e.target.value} : {tagId: '', name: '', color: e.target.value, createdAt: '', lastModifiedAt: ''})}
							/>
						</TagEditorField>

						<TagEditorField>
							<TagEditorLabel>Category</TagEditorLabel>
							<TagEditorInput
								type="text"
								value={editingTag?.category ?? ''}
								placeholder="Optional category"
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTag(prev => prev ? {...prev, category: e.target.value} : {tagId: '', name: '', color: '#1890ff', category: e.target.value, createdAt: '', lastModifiedAt: ''})}
							/>
						</TagEditorField>

						<TagEditorField>
							<TagEditorLabel>Description</TagEditorLabel>
							<TagEditorTextarea
								value={editingTag?.description ?? ''}
								placeholder="Optional description"
								onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingTag(prev => prev ? {...prev, description: e.target.value} : {tagId: '', name: '', color: '#1890ff', description: e.target.value, createdAt: '', lastModifiedAt: ''})}
							/>
						</TagEditorField>

						<TagEditorActions>
							<TagEditorCancelBtn onClick={handleCancel}>Cancel</TagEditorCancelBtn>
							<TagEditorSaveBtn
								disabled={!editingTag?.name?.trim()}
								onClick={() => {
									if (!editingTag?.name?.trim()) return;
									const tags = loadTags();
									if (editingTag.tagId) {
										// edit existing
										const index = tags.findIndex(t => t.tagId === editingTag.tagId);
										if (index !== -1) {
											tags[index] = {
												...tags[index],
												name: editingTag.name.trim(),
												color: editingTag.color,
												category: editingTag.category?.trim() || undefined,
												description: editingTag.description?.trim() || undefined,
												lastModifiedAt: new Date().toISOString()
											};
										}
									} else {
										// create new
										const newTag: TagDef = {
											tagId: generateUuid(),
											name: editingTag.name.trim(),
											color: editingTag.color,
											category: editingTag.category?.trim() || undefined,
											description: editingTag.description?.trim() || undefined,
											createdAt: new Date().toISOString(),
											lastModifiedAt: new Date().toISOString()
										};
										tags.push(newTag);
									}
									saveTags(tags);
									handleSave();
								}}
							>
								{editingTag?.tagId ? 'Save' : 'Create'}
							</TagEditorSaveBtn>
						</TagEditorActions>
					</TagEditorPanel>
				</TagEditorOverlay>
			) : null}
		</TagManagementContainer>
	);
};

export default TagManagement;
