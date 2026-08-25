import {createTag, loadTags, PRESET_COLORS, saveTags, TagDef} from '@/services/data/tuples/tag-types';
import {Button} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {DialogBody, DialogFooter, DialogHeader, DialogLabel, DialogTitle} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {ChangeEvent, useState} from 'react';
import {
	TagEditorColorInput,
	TagEditorColorPalette,
	TagEditorColorSwatch,
	TagEditorField,
	TagEditorInput,
	TagEditorInputLines,
	TagEditorRequiredHint
} from './widgets';

const DEFAULT_COLOR = PRESET_COLORS[4];

export const TagEditor = (props: { tag?: TagDef; onSaved: () => void }) => {
	const {tag, onSaved} = props;
	const isEdit = !!tag;

	const {fire} = useEventBus();
	const [name, setName] = useState(tag?.name ?? '');
	const [color, setColor] = useState(tag?.color ?? DEFAULT_COLOR);
	const [category, setCategory] = useState(tag?.category ?? '');
	const [description, setDescription] = useState(tag?.description ?? '');

	const nameValid = name.trim().length !== 0;

	const onConfirmClicked = () => {
		if (!nameValid) {
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
			}
		} else {
			tags.push(createTag(name.trim(), color, category.trim() || undefined, description.trim() || undefined));
		}
		saveTags(tags);
		fire(EventTypes.HIDE_DIALOG);
		onSaved();
	};
	const onCancelClicked = () => fire(EventTypes.HIDE_DIALOG);

	return <>
		<DialogHeader>
			<DialogTitle>{isEdit ? Lang.TAG.EDIT_TAG : Lang.TAG.CREATE_TAG}</DialogTitle>
		</DialogHeader>
		<DialogBody>
			<TagEditorField>
				<DialogLabel>{Lang.TAG.NAME}</DialogLabel>
				<TagEditorInput value={name} placeholder={Lang.TAG.NAME_PLACEHOLDER} autoFocus={true}
				                onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}/>
				{nameValid ? null : <TagEditorRequiredHint>{Lang.TAG.NAME_REQUIRED}</TagEditorRequiredHint>}
			</TagEditorField>
			<TagEditorField>
				<DialogLabel>{Lang.TAG.COLOR}</DialogLabel>
				<TagEditorColorPalette>
					{PRESET_COLORS.map(c => {
						return <TagEditorColorSwatch key={c} $color={c} $selected={color === c}
						                             onClick={() => setColor(c)}/>;
					})}
				</TagEditorColorPalette>
				<TagEditorColorInput value={color}
				                     onChange={(event: ChangeEvent<HTMLInputElement>) => setColor(event.target.value)}/>
			</TagEditorField>
			<TagEditorField>
				<DialogLabel>{Lang.TAG.CATEGORY}</DialogLabel>
				<TagEditorInput value={category} placeholder={Lang.TAG.CATEGORY_PLACEHOLDER}
				                onChange={(event: ChangeEvent<HTMLInputElement>) => setCategory(event.target.value)}/>
			</TagEditorField>
			<TagEditorField>
				<DialogLabel>{Lang.TAG.DESCRIPTION}</DialogLabel>
				<TagEditorInputLines value={description} placeholder={Lang.TAG.DESCRIPTION_PLACEHOLDER}
				                     onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)}/>
			</TagEditorField>
		</DialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} disabled={!nameValid} onClick={onConfirmClicked}>
				{isEdit ? Lang.ACTIONS.SAVE : Lang.TAG.CREATE_TAG}
			</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCancelClicked}>{Lang.ACTIONS.CANCEL}</Button>
		</DialogFooter>
	</>;
};
