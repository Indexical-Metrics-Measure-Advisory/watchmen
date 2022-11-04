import {SubjectColumnAlignment, SubjectColumnFormat, SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {ICON_RENDERER} from '@/widgets/basic/constants';
import {DropdownOption} from '@/widgets/basic/types';
import {useCollapseFixedThing, useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useRef, useState} from 'react';
import {useColumnEventBus} from './column-event-bus';
import {ColumnEventTypes} from './column-event-bus-types';
import {
	RendererButton,
	RendererContainer,
	RendererItemCheckBox,
	RendererItemDropdown,
	RendererItemLabel,
	RendererPanel
} from './widgets';

interface EditorState {
	constructed: boolean;
	visible: boolean;
	x: number;
	y: number;
	positionOnTop: boolean;
}

export const RendererEditor = (props: { column: SubjectDataSetColumn }) => {
	const {column} = props;

	const buttonRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const {fire: fireColumn} = useColumnEventBus();
	const [editorState, setEditorState] = useState<EditorState>({
		constructed: false, visible: false, x: 0, y: 0, positionOnTop: false
	});
	const forceUpdate = useForceUpdate();
	useCollapseFixedThing({
		containerRef: panelRef,
		visible: editorState.visible,
		hide: () => setEditorState(state => ({...state, visible: false}))
	});
	useEffect(() => {
		if (editorState.constructed && panelRef.current != null) {
			const {x, y, height: buttonHeight} = buttonRef.current!.getBoundingClientRect();
			const {width, height} = panelRef.current.getBoundingClientRect();
			if (window.innerHeight - y - buttonHeight - 4 < height) {
				setTimeout(() => {
					setEditorState({
						constructed: true, visible: true,
						x: x - width, y: y - height + buttonHeight, positionOnTop: true
					});
				}, 10);
			} else {
				setTimeout(() => {
					setEditorState({constructed: true, visible: true, x: x - width, y, positionOnTop: false});
				}, 10);
			}
		}
	}, [editorState.constructed]);
	useEffect(() => {
		if (!editorState.visible) {
			setEditorState(state => ({...state, constructed: false}));
		}
	}, [editorState.visible]);

	const onEditClicked = () => {
		if (!editorState.constructed) {
			setEditorState(state => ({...state, constructed: true}));
		}
	};
	const onAlignmentChanged = (option: DropdownOption) => {
		column.renderer!.alignment = option.value as SubjectColumnAlignment;
		forceUpdate();
		fireColumn(ColumnEventTypes.RENDERER_CHANGED, column);
	};
	const onFormatChanged = (option: DropdownOption) => {
		column.renderer!.format = option.value as SubjectColumnFormat;
		forceUpdate();
		fireColumn(ColumnEventTypes.RENDERER_CHANGED, column);
	};
	const onHighlightNegativeChanged = (value: boolean) => {
		column.renderer!.highlightNegative = value;
		forceUpdate();
		fireColumn(ColumnEventTypes.RENDERER_CHANGED, column);
	};

	if (column.renderer == null) {
		column.renderer = {
			alignment: SubjectColumnAlignment.LEFT,
			format: SubjectColumnFormat.NONE,
			highlightNegative: false
		};
	}

	const alignmentOptions = [
		{
			value: SubjectColumnAlignment.LEFT,
			label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_RENDERER_ALIGNMENT_LEFT
		},
		{
			value: SubjectColumnAlignment.CENTER,
			label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_RENDERER_ALIGNMENT_CENTER
		},
		{
			value: SubjectColumnAlignment.RIGHT,
			label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_RENDERER_ALIGNMENT_RIGHT
		}
	];
	const formatOptions = [
		{value: SubjectColumnFormat.NONE, label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_RENDERER_FORMAT_NONE},
		{value: SubjectColumnFormat.USE_GROUP, label: SubjectColumnFormat.USE_GROUP},
		{value: SubjectColumnFormat.USE_GROUP_1, label: SubjectColumnFormat.USE_GROUP_1},
		{value: SubjectColumnFormat.USE_GROUP_2, label: SubjectColumnFormat.USE_GROUP_2},
		{value: SubjectColumnFormat.USE_GROUP_3, label: SubjectColumnFormat.USE_GROUP_3},
		{value: SubjectColumnFormat.USE_GROUP_4, label: SubjectColumnFormat.USE_GROUP_4},
		{value: SubjectColumnFormat.USE_GROUP_5, label: SubjectColumnFormat.USE_GROUP_5},
		{value: SubjectColumnFormat.USE_GROUP_6, label: SubjectColumnFormat.USE_GROUP_6}
	];

	return <RendererContainer>
		<RendererButton onClick={onEditClicked} editorVisible={editorState.visible} ref={buttonRef}>
			<FontAwesomeIcon icon={ICON_RENDERER}/>
		</RendererButton>
		{editorState.constructed
			? <RendererPanel x={editorState.x} y={editorState.y} positionOnTop={editorState.positionOnTop}
			                 visible={editorState.visible}
			                 ref={panelRef}>
				<RendererItemLabel>{Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_RENDERER_ALIGNMENT}</RendererItemLabel>
				<RendererItemDropdown value={column.renderer?.alignment ?? SubjectColumnAlignment.LEFT}
				                      options={alignmentOptions} onChange={onAlignmentChanged}/>
				<RendererItemLabel>{Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_RENDERER_FORMAT}</RendererItemLabel>
				<RendererItemDropdown value={column.renderer?.format ?? SubjectColumnFormat.NONE}
				                      options={formatOptions} onChange={onFormatChanged}/>
				<RendererItemLabel>{Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_RENDERER_HIGHLIGHT_NEGATIVE}</RendererItemLabel>
				<RendererItemCheckBox value={column.renderer?.highlightNegative ?? false}
				                      onChange={onHighlightNegativeChanged}/>
			</RendererPanel>
			: null}
	</RendererContainer>;
};