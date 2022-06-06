import {TuplePage} from '@/services/data/query/tuple-page';
import {
	fetchEnumAndParents,
	importEnumItems,
	listAllEnums,
	listEnums,
	listEnumsForHolder,
	saveEnum
} from '@/services/data/tuples/enum';
import {Enum, EnumId, EnumItem} from '@/services/data/tuples/enum-types';
import {QueryEnum} from '@/services/data/tuples/query-enum-types';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {ICON_DOWNLOAD, ICON_UPLOAD, TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {uploadFile, UploadFileType} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import JSZip, {JSZipObject} from 'jszip';
import React, {useEffect} from 'react';
import EnumBackground from '../../assets/enum-background.svg';
import {renderCard} from './card';
import {renderEditor} from './editor';
import {EnumItemsDownloadDialog} from './enum-items-download-dialog';
import {parseFromCsv, parseFromJson} from './items/enum-import-from-file';
import {createEnum} from './utils';

class ParsedImportFile {
	enumId?: EnumId;
	name?: string;
	items?: Array<EnumItem>;
	message?: string;
	notImplemented?: boolean;
	path?: string;
}

const fetchEnumAndCodes = async (queryEnum: QueryEnum) => {
	const {enumeration, parents} = await fetchEnumAndParents(queryEnum.enumId);
	return {tuple: enumeration, parents};
};

const getKeyOfEnum = (enumeration: QueryEnum) => enumeration.enumId;

const AdminEnums = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTupleEventBus();
	useEffect(() => {
		const onDoCreateEnum = () => {
			const enumeration = createEnum();
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listEnumsForHolder(),
				(parents) => fire(TupleEventTypes.TUPLE_CREATED, enumeration, {parents}));
		};
		const onDoEditEnum = async (queryEnum: QueryEnum) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await fetchEnumAndCodes(queryEnum),
				({tuple, parents}) => fire(TupleEventTypes.TUPLE_LOADED, tuple, {parents}));
		};
		const onDoSearchEnum = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listEnums({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
				(page: TuplePage<QueryTuple>) => fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText));
		};
		const onSaveEnum = async (enumeration: Enum, onSaved: (enumeration: Enum, saved: boolean) => void) => {
			if (!enumeration.name || !enumeration.name.trim()) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Enumeration name is required.</AlertLabel>, () => {
					onSaved(enumeration, false);
				});
				return;
			}
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await saveEnum(enumeration),
				() => onSaved(enumeration, true),
				() => onSaved(enumeration, false));
		};
		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateEnum);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditEnum);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchEnum);
		on(TupleEventTypes.SAVE_TUPLE, onSaveEnum);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateEnum);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditEnum);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchEnum);
			off(TupleEventTypes.SAVE_TUPLE, onSaveEnum);
		};
	}, [on, off, fire, fireGlobal]);
	useHelp(HELP_KEYS.ADMIN_ENUM);

	const onDownloadEnumItemsClicked = () => {
		const askData = () => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listAllEnums(),
				(enums: Array<QueryEnum>) => {
					if (enums.length === 0) {
						fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Failed to get enumeration list.</AlertLabel>);
					} else {
						fireGlobal(EventTypes.SHOW_DIALOG, <EnumItemsDownloadDialog enums={enums}/>,
							{
								marginTop: '10vh',
								marginLeft: '20%',
								width: '60%',
								height: '80vh'
							});
					}
				});
		};
		askData();
	};
	const readIdNameFromFileName = (fileName: string): { id?: EnumId, name: string } => {
		const extStartPos = fileName.lastIndexOf('.');
		const namePart = fileName.substring(0, extStartPos - 1);
		let id: EnumId;
		let name: string;
		if (namePart.indexOf('-') !== -1) {
			[name, id] = namePart.split('-');
		} else {
			id = namePart;
			name = namePart;
		}
		return {id, name};
	};
	const readFile = async (path: string, file: JSZipObject): Promise<ParsedImportFile> => {
		const fileName = file.name;
		const {id, name} = readIdNameFromFileName(fileName);
		try {
			switch (true) {
				case fileName.endsWith('.txt'):
				case fileName.endsWith('.csv'): {
					const content = await file.async('string');
					const items = await parseFromCsv(content);
					return {enumId: id, name, items, notImplemented: false, path};
				}
				case fileName.endsWith('.json'): {
					const content = await file.async('string');
					const items = await parseFromJson(content);
					return {enumId: id, name, items, notImplemented: false, path};
				}
				default:
					return {enumId: id, name, notImplemented: true, path};
			}
		} catch {
			return {enumId: id, name, message: 'Error occurred on read file.', notImplemented: false, path};
		}
	};
	const doImport = async (files: Array<ParsedImportFile>) => {
		fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
			Importing enumeration items takes time, please wait a minute. Or click button to leave, upload is
			processing in back, and a message should popup on success.
		</AlertLabel>);
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await importEnumItems(files.map(file => ({
				enumId: file.enumId,
				name: file.name,
				items: file.items ?? []
			}))),
			() => fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel> Enum items uploaded. </AlertLabel>)
		);
	};
	const onFileSelected = async (file: File) => {
		const content = await file.arrayBuffer();
		const zip = await new JSZip().loadAsync(content);
		const readers: Array<() => Promise<ParsedImportFile>> = [];
		zip.forEach((path, file) => readers.push(async () => await readFile(path, file)));
		const results = await Promise.all(readers.map(read => read()));
		const hasError = results.some(result => result.notImplemented || result.message != null);
		if (hasError) {
			const files = results.filter(result => result.notImplemented || result.message != null).map(result => `'${result.path}'`).join(', ');
			if (files.length === results.length) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					No file in zip can be parsed, check your files please.
				</AlertLabel>);
			} else {
				fireGlobal(EventTypes.SHOW_YES_NO_DIALOG, `File(s) ${files} cannot be parsed, do you still want to import the correct ones?`,
					async () => {
						fireGlobal(EventTypes.HIDE_DIALOG);
						await doImport(results.filter(result => !result.notImplemented && result.message == null));
					},
					() => fireGlobal(EventTypes.HIDE_DIALOG));
			}
		} else {
			await doImport(results);
		}
	};
	const onUploadEnumItemsClicked = () => {
		uploadFile([UploadFileType.ZIP], onFileSelected);
	};

	return <TupleWorkbench title="Enumerations"
	                       createButtonLabel="Create Enumeration" canCreate={true}
	                       moreButtons={[{
		                       label: 'Export Items',
		                       icon: ICON_DOWNLOAD,
		                       action: onDownloadEnumItemsClicked
	                       }, {
		                       label: 'Upload Items',
		                       icon: ICON_UPLOAD,
		                       action: onUploadEnumItemsClicked
	                       }]}
	                       searchPlaceholder="Search by enum name, description, etc."
	                       tupleLabel="Enumeration" tupleImage={EnumBackground} tupleImagePosition="20px 40px"
	                       renderEditor={renderEditor}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfEnum}
	/>;
};
const AdminEnumsIndex = () => {
	return <TupleEventBusProvider>
		<AdminEnums/>
	</TupleEventBusProvider>;
};

export default AdminEnumsIndex;