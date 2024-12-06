from typing import List

import pandas as pd

from watchmen_ai.dspy.model.data_story import MarkdownSubject
from watchmen_model.console import SubjectDatasetColumn
from watchmen_model.console.subject_ext import SubjectWithFactorType



async def convert_subject_mata_to_markdown_table_format(subject: SubjectWithFactorType)->MarkdownSubject:
    table_columns: List[SubjectDatasetColumn] = subject.dataset.columns

    table_columns_data = []
    for table_column in table_columns:
        name = table_column.alias
        column_type = table_column.columnType
        table_columns_data.append({"name": name, "type": column_type})

    ## use pandas to convert to markdown
    df = pd.DataFrame(table_columns_data)
    markdown_table = df.to_markdown(index=False)
    return MarkdownSubject(subject_name=subject.name, markdown_table=markdown_table)



