import {TagDef, PRESET_COLORS, createTag, loadTags, saveTags} from '@/services/data/tuples/tag-types';
import React, {ChangeEvent, useState} from 'react';

interface TagEditorProps {
	tag?: TagDef;
	onSave: () => void;
	onCancel: () => void;
}

export const TagEditor = (props: TagEditorProps) => {
	const {tag, onSave, onCancel} = props;
	const isEdit = !!tag;

	const [name, setName] = useState(tag?.name ?? '');
	const [color, setColor] = useState(tag?.color ?? '#1890ff');
	const [category, setCategory] = useState(tag?.category ?? '');
	const [description, setDescription] = useState(tag?.description ?? '');

	const handleSave = () => {
		if (!name.trim()) {
			return;
		}
		const tags = loadTags();
		if (isEdit && tag) {
			const index = tags.findIndex(t => t.tagId === tag.tagId);
			if (index !== -1) {
				tags[index] = {
					...tags[index],
					name: name.trim(),
					color,
					category: category.trim() || undefined,
					description: description.trim() || undefined,
					lastModifiedAt: new Date().toISOString()
				};
				saveTags(tags);
			}
		} else {
			const newTag = createTag(name.trim(), color, category.trim() || undefined, description.trim() || undefined);
			tags.push(newTag);
			saveTags(tags);
		}
		onSave();
	};

	return (
		<div style={{
			position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
			background: 'rgba(0,0,0,0.3)', zIndex: 1000,
			display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
			overflowY: 'auto', paddingTop: '10vh', paddingBottom: '10vh'
		}} onClick={(e: React.MouseEvent) => {
			if (e.target === e.currentTarget) onCancel();
		}}>
			<div style={{
				background: 'var(--bg-color)', borderRadius: '8px',
				boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
				padding: '24px', width: '420px', maxHeight: '80vh', overflowY: 'auto'
			}}>
				<h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700}}>
					{isEdit ? 'Edit Tag' : 'Create Tag'}
				</h3>
				<div style={{marginBottom: '12px'}}>
					<label style={{fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block', color: 'var(--text-secondary)'}}>
						Name *
					</label>
					<input
						type="text" value={name} autoFocus
						onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
						style={{height: 'var(--height)', padding: '0 8px', border: 'var(--border)', borderRadius: 'var(--border-radius)', fontSize: '14px', outline: 'none', width: '100%'}}
					/>
				</div>
				<div style={{marginBottom: '12px'}}>
			<label style={{fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block', color: 'var(--text-secondary)'}}>
					Color *
					</label>
					<div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
						{PRESET_COLORS.map(c => (
							<div
								key={c}
								onClick={() => setColor(c)}
								style={{
									width: '24px', height: '24px', borderRadius: '4px',
									backgroundColor: c, cursor: 'pointer',
									border: color === c ? '2px solid #000' : '2px solid transparent',
									transform: color === c ? 'scale(1.1)' : 'scale(1)',
									transition: 'all 150ms ease'
								}}
							/>
						))}
					</div>
					<div style={{marginTop: '4px'}}>
						<input
							type="text" value={color}
							onChange={(e: ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
							style={{width: '120px', height: 'var(--height)', padding: '0 8px', border: 'var(--border)', borderRadius: 'var(--border-radius)', fontSize: '14px'}}
						/>
					</div>
				</div>
				<div style={{marginBottom: '12px'}}>
			<label style={{fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block', color: 'var(--text-secondary)'}}>
					Category
					</label>
					<input
						type="text" value={category}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
						style={{height: 'var(--height)', padding: '0 8px', border: 'var(--border)', borderRadius: 'var(--border-radius)', fontSize: '14px', outline: 'none', width: '100%'}}
					/>
				</div>
				<div style={{marginBottom: '12px'}}>
			<label style={{fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block', color: 'var(--text-secondary)'}}>
					Description
					</label>
					<textarea
						value={description}
						onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
						style={{padding: '8px', border: 'var(--border)', borderRadius: 'var(--border-radius)', fontSize: '14px', outline: 'none', resize: 'vertical', minHeight: '60px', width: '100%'}}
					/>
				</div>
				<div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px'}}>
					<button onClick={onCancel} style={{background: 'transparent', border: 'var(--border)', borderRadius: '4px', padding: '6px 16px', cursor: 'pointer', fontSize: '13px'}}>
						Cancel
					</button>
					<button onClick={handleSave} disabled={!name.trim()} style={{background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 16px', cursor: 'pointer', fontSize: '13px'}}>
						{isEdit ? 'Save' : 'Create'}
					</button>
				</div>
			</div>
		</div>
	);
};
