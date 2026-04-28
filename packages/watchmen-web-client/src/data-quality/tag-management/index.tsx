import {TagDef, loadTags, saveTags} from '@/services/data/tuples/tag-types';
import React, {useEffect, useState} from 'react';
import {TagEditor} from './tag-editor';
import {TagActionButtons, TagCell, TagListHeader, TagListHeaderCell, TagManagementContainer, TagRow} from './widgets';

const TagManagement = () => {
	const [tags, setTags] = useState<Array<TagDef>>([]);
	const [editingTag, setEditingTag] = useState<TagDef | undefined>(undefined);
	const [showEditor, setShowEditor] = useState(false);

	const loadTagList = () => {
		const data = loadTags();
		setTags(data);
	};

	useEffect(() => {
		loadTagList();
	}, []);

	const handleCreate = () => {
		setEditingTag(undefined);
		setShowEditor(true);
	};

	const handleEdit = (tag: TagDef) => {
		setEditingTag(tag);
		setShowEditor(true);
	};

	const handleDelete = (tag: TagDef) => {
		if (!window.confirm(`Are you sure to delete tag "${tag.name}"?`)) {
			return;
		}
		const updated = tags.filter(t => t.tagId !== tag.tagId);
		saveTags(updated);
		setTags(updated);
	};

	const handleSave = () => {
		setShowEditor(false);
		setEditingTag(undefined);
		loadTagList();
	};

	const handleCancel = () => {
		setShowEditor(false);
		setEditingTag(undefined);
	};

	return (
		<TagManagementContainer>
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '12px 16px',
				borderBottom: 'var(--border)'
			}}>
				<h2 style={{margin: 0, fontSize: '16px', fontWeight: 700}}>Tag Management</h2>
				<button
					onClick={handleCreate}
					style={{
						backgroundColor: 'var(--primary-color)',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						padding: '6px 16px',
						cursor: 'pointer',
						fontSize: '13px'
					}}
				>
					+ Create Tag
				</button>
			</div>

			<div style={{flexGrow: 1, overflowY: 'auto', padding: '0 16px 16px 16px'}}>
				{tags.length === 0 ? (
					<div style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						height: '200px',
						opacity: 0.5
					}}>
						<span>No tags found. Create your first tag to get started.</span>
					</div>
				) : (
					<div style={{marginTop: '16px'}}>
						<div style={{
							display: 'grid',
							gridTemplateColumns: '40px 1fr 120px 1fr 120px',
							borderBottom: '2px solid var(--border-color)',
							height: '40px',
							alignItems: 'center'
						}}>
						<div style={{fontWeight: 600, fontSize: '12px', padding: '0 8px'}}>#</div>
						<div style={{fontWeight: 600, fontSize: '12px', padding: '0 8px'}}>Name</div>
						<div style={{fontWeight: 600, fontSize: '12px', padding: '0 8px'}}>Color</div>
						<div style={{fontWeight: 600, fontSize: '12px', padding: '0 8px'}}>Category</div>
						<div style={{fontWeight: 600, fontSize: '12px', padding: '0 8px'}}>Actions</div>
						</div>
						{tags.map((tag, index) => (
							<div
								key={tag.tagId}
								style={{
									display: 'grid',
									gridTemplateColumns: '40px 1fr 120px 1fr 120px',
									borderBottom: '1px solid var(--border-color)',
									alignItems: 'center',
									padding: '8px 0',
									position: 'relative'
								}}
							>
								<div style={{
									position: 'absolute',
									left: 0,
									top: 0,
									bottom: 0,
									width: '4px',
									backgroundColor: tag.color
								}} />
								<div style={{padding: '0 8px', textAlign: 'center'}}>{index + 1}</div>
								<div style={{padding: '0 8px', fontWeight: 500}}>{tag.name}</div>
								<div style={{padding: '0 8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
									<div style={{
										width: '20px',
										height: '20px',
										borderRadius: '4px',
										backgroundColor: tag.color,
										flexShrink: 0
									}} />
									<span style={{fontSize: '12px', opacity: 0.6}}>{tag.color}</span>
								</div>
								<div style={{padding: '0 8px', fontSize: '14px'}}>{tag.category || '-'}</div>
								<div style={{padding: '0 8px', display: 'flex', gap: '8px'}}>
									<button
										onClick={() => handleEdit(tag)}
										style={{
											backgroundColor: 'transparent',
											border: 'var(--border)',
											borderRadius: '4px',
											padding: '4px 12px',
											cursor: 'pointer',
											fontSize: '12px'
										}}
									>Edit</button>
									<button
										onClick={() => handleDelete(tag)}
										style={{
											backgroundColor: '#ff4d4f',
											color: 'white',
											border: 'none',
											borderRadius: '4px',
											padding: '4px 12px',
											cursor: 'pointer',
											fontSize: '12px'
										}}
									>Delete</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{showEditor ? (
				<TagEditor
					tag={editingTag}
					onSave={handleSave}
					onCancel={handleCancel}
				/>
			) : null}
		</TagManagementContainer>
	);
};

export default TagManagement;
