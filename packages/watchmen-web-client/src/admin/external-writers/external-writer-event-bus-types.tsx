import {ExternalWriter} from '@/services/data/tuples/external-writer-types';

export enum ExternalWriterEventTypes {
	EXTERNAL_WRITER_CODE_CHANGED = 'external-writer-code-changed',
	EXTERNAL_WRITER_NAME_CHANGED = 'external-writer-name-changed',
	EXTERNAL_WRITER_TENANT_CHANGED = 'external-writer-tenant-changed',
	EXTERNAL_WRITER_TYPE_CHANGED = 'external-writer-type-changed',
	EXTERNAL_WRITER_CONNECT_PROP_CHANGED = 'external-writer-connect-prop-changed',
}

export interface ExternalWriterEventBus {
	fire(type: ExternalWriterEventTypes.EXTERNAL_WRITER_CODE_CHANGED, writer: ExternalWriter): this;
	on(type: ExternalWriterEventTypes.EXTERNAL_WRITER_CODE_CHANGED, listener: (writer: ExternalWriter) => void): this;
	off(type: ExternalWriterEventTypes.EXTERNAL_WRITER_CODE_CHANGED, listener: (writer: ExternalWriter) => void): this;

	fire(type: ExternalWriterEventTypes.EXTERNAL_WRITER_NAME_CHANGED, writer: ExternalWriter): this;
	on(type: ExternalWriterEventTypes.EXTERNAL_WRITER_NAME_CHANGED, listener: (writer: ExternalWriter) => void): this;
	off(type: ExternalWriterEventTypes.EXTERNAL_WRITER_NAME_CHANGED, listener: (writer: ExternalWriter) => void): this;

	fire(type: ExternalWriterEventTypes.EXTERNAL_WRITER_TENANT_CHANGED, writer: ExternalWriter): this;
	on(type: ExternalWriterEventTypes.EXTERNAL_WRITER_TENANT_CHANGED, listener: (writer: ExternalWriter) => void): this;
	off(type: ExternalWriterEventTypes.EXTERNAL_WRITER_TENANT_CHANGED, listener: (writer: ExternalWriter) => void): this;

	fire(type: ExternalWriterEventTypes.EXTERNAL_WRITER_TYPE_CHANGED, writer: ExternalWriter): this;
	on(type: ExternalWriterEventTypes.EXTERNAL_WRITER_TYPE_CHANGED, listener: (writer: ExternalWriter) => void): this;
	off(type: ExternalWriterEventTypes.EXTERNAL_WRITER_TYPE_CHANGED, listener: (writer: ExternalWriter) => void): this;

	fire(type: ExternalWriterEventTypes.EXTERNAL_WRITER_CONNECT_PROP_CHANGED, writer: ExternalWriter): this;
	on(type: ExternalWriterEventTypes.EXTERNAL_WRITER_CONNECT_PROP_CHANGED, listener: (writer: ExternalWriter) => void): this;
	off(type: ExternalWriterEventTypes.EXTERNAL_WRITER_CONNECT_PROP_CHANGED, listener: (writer: ExternalWriter) => void): this;
}