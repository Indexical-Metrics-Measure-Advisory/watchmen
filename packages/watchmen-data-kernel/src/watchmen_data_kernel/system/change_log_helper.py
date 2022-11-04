
class ChangelogXml:
	
	def __init__(self, version: str):
		self.version = version
		self.file_name = f"V{version}_change.xml"
		self.begin = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<databaseChangeLog ' \
		             'xmlns="http://www.liquibase.org/xml/ns/dbchangelog" ' \
		             'xmlns:ext="http://www.liquibase.org/xml/ns/dbchangelog-ext" ' \
		             'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' \
		             'xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog-ext ' \
		             'http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-ext.xsd ' \
		             'http://www.liquibase.org/xml/ns/dbchangelog ' \
		             'http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.4.xsd">\n'
		self.end = '</databaseChangeLog>\n'
		self.change_sets = []

	# noinspection PyMethodMayBeStatic
	def generate_change_set(self, id_: str, path: str, dbms: str) -> str:
		change_set = f'''
\t<changeSet author="watchmen" id="{id_}" runOnChange="true">
\t\t<sqlFile dbms="{dbms}" encoding="utf8" endDelimiter=";"
        path="{path}"
        relativeToChangelogFile="true"
        splitStatements="true"
        stripComments="false"/>
\t</changeSet>
'''
		return change_set

	def build_change_file(self, file_name: str, datasource_type: str):
		if file_name.endswith('.ddl.sql'):
			id_ = file_name.removesuffix('.ddl.sql')
		elif file_name.endswith('.dml.sql'):
			id_ = file_name.removesuffix('.dml.sql')
		elif file_name.endswith('.sql'):
			id_ = file_name.removesuffix('.sql')
		path = f"{self.version}/{file_name}"
		change_set = self.generate_change_set(id_, path, datasource_type)
		self.change_sets.append(change_set)
		return self
	
	def get_change_log_content(self) -> str:
		return f"{self.begin}{''.join(self.change_sets)}{self.end}"

