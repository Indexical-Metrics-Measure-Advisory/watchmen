import {Topic} from '@/services/data/tuples/topic-types';
import {isNotAggregationTopic, isRawTopic} from '@/services/data/tuples/topic-utils';
import {ZipFiles} from '@/widgets/basic/utils';
import {MSSQLFactorTypeMap} from './mssql';
import {
	asFactorName,
	asFullTopicName,
	asIndexName,
	asTopicName,
	asUniqueIndexName,
	gatherIndexes,
	gatherUniqueIndexes,
	getAggregateAssistColumnName,
	getInsertTimeColumnName,
	getRawTopicDataColumnName,
	getTenantIdColumnName,
	getUpdateTimeColumnName,
	getVersionColumnName
} from './utils';

const buildColumn = (topic: Topic, columnName: string, columnType: string) => {
	const tableName = asFullTopicName(topic);
	return `\tSELECT @count = COUNT(1) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${columnName}';
	IF @count = 0
		-- add columns
	    EXEC SP_EXECUTESQL N'ALTER TABLE ${tableName} ADD (${columnName} ${columnType})';
	ELSE
		-- modify columns
		EXEC SP_EXECUTESQL N'ALTER TABLE ${tableName} ALTER COLUMN ${columnName} ${columnType}';
`;
};
const buildFactors = (topic: Topic) => {
	if (isRawTopic(topic)) {
		return [
			...topic.factors.filter(factor => {
				return factor.flatten === true;
			}).map(factor => {
				return buildColumn(topic, asFactorName(factor), MSSQLFactorTypeMap[factor.type](factor.precision));
			}),
			buildColumn(topic, getRawTopicDataColumnName(), 'NVARCHAR(MAX)')
		].join('\n');
	} else {
		return topic.factors.filter(factor => factor.name.indexOf('.') === -1).map(factor => {
			return buildColumn(topic, asFactorName(factor), MSSQLFactorTypeMap[factor.type](factor.precision));
		}).join('\n');
	}
};

const buildAggregateAssist = (topic: Topic) => {
	if (isNotAggregationTopic(topic)) {
		return '';
	}

	return buildColumn(topic, getAggregateAssistColumnName(), 'NVARCHAR(1024)');
};
const buildVersionAssist = (topic: Topic) => {
	if (isNotAggregationTopic(topic)) {
		return '';
	}

	return buildColumn(topic, getVersionColumnName(), 'DECIMAL(8)');
};
const buildTenantIdColumn = (topic: Topic) => {
	return buildColumn(topic, getTenantIdColumnName(), 'NVARCHAR(50)');
};
const buildAuditTimeColumn = (topic: Topic, columnName: string) => {
	return buildColumn(topic, columnName, 'DATETIME');
};

const createSQL = (topic: Topic): string => {
	const uniqueIndexes = gatherUniqueIndexes(topic);
	const indexes = gatherIndexes(topic);
	const tableName = asFullTopicName(topic);
	const uniqueIndexName = asUniqueIndexName(topic);
	const indexName = asIndexName(topic);

	return `-- procedure for topic[id=${topic.topicId}, name=${topic.name}]
CREATE OR ALTER PROCEDURE SCHEMA_CHANGE
AS
BEGIN 
	DECLARE @topic_name NVARCHAR(128) = '${tableName}';
	-- will not drop any column even it is not in definition, just keep it
	DECLARE @count INT;
${buildFactors(topic)}
${buildAggregateAssist(topic)}
${buildVersionAssist(topic)}
${buildTenantIdColumn(topic)}
${buildAuditTimeColumn(topic, getInsertTimeColumnName())}
${buildAuditTimeColumn(topic, getUpdateTimeColumnName())}

	-- drop existed indexes
	-- simply uncomment the following loop to drop all exists indexes
	-- considering performance of rebuild indexes, manually drop useless indexes accurate is recommended.
	-- according to duplication check of index names, following create scripts need to be adjusted manually as well.
	-- DECLARE @qry NVARCHAR(MAX);
	-- SELECT @qry =
	--		(SELECT 'DROP INDEX ' + QUOTENAME(IX.NAME) + ' ON ' + QUOTENAME(OBJECT_SCHEMA_NAME(IX.OBJECT_ID)) + '.' + QUOTENAME(OBJECT_NAME(IX.OBJECT_ID)) + ';'
	--		FROM SYS.INDEXES IX
	--		WHERE IX.NAME IS NOT NULL
	--		  AND IX.TYPE != 1
	--		  AND UPPER(OBJECT_NAME(IX.OBJECT_ID)) = UPPER(@topic_name)
	--		FOR XML PATH(''));
	-- EXEC SP_EXECUTESQL @qry;

	-- unique index
${Object.values(uniqueIndexes).map((factors, index) => {
		return `	EXEC SP_EXECUTESQL 'CREATE UNIQUE INDEX ${uniqueIndexName}_${index + 1} ON ${tableName} (${factors.map(factor => asFactorName(factor)).join(', ')})';`;
	}).join('\n')}

	-- index
${Object.values(indexes).map((factors, index) => {
		return `	EXEC SP_EXECUTESQL 'CREATE INDEX ${indexName}_${index + 1} ON ${tableName} (${factors.map(factor => asFactorName(factor)).join(', ')})';`;
	}).join('\n')}
	EXEC SP_EXECUTESQL N'CREATE INDEX ${indexName}_${getTenantIdColumnName()} ON ${tableName} (${getTenantIdColumnName()})';
	EXEC SP_EXECUTESQL N'CREATE INDEX ${indexName}_${getInsertTimeColumnName()} ON ${tableName} (${getInsertTimeColumnName()})';
	EXEC SP_EXECUTESQL N'CREATE INDEX ${indexName}_${getUpdateTimeColumnName()} ON ${tableName} (${getUpdateTimeColumnName()})';
END;
GO
EXEC SCHEMA_CHANGE();
DROP PROCEDURE SCHEMA_CHANGE;
`;
};

export const generateMSSQLAlterSQLScripts = (zip: ZipFiles, topics: Array<Topic>) => {
	topics.forEach(topic => {
		const filename = asTopicName(topic);
		zip[`mssql/alteration/${filename}.sql`] = createSQL(topic);
	});
};