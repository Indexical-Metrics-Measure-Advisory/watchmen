import os

import dspy
from dspy.retrieve.lancedb_rm import LancedbRM
from lancedb.pydantic import LanceModel, Vector

from watchmen_ai.dspy.azure_openai_register import azure_openai_registry

clip = azure_openai_registry.create(azure_deployment="text-embedding-ada-002",
                                    azure_endpoint="https://azure-insuremo-openai.openai.azure.com/",
                                    azure_api_key="e115304f78534afa84ce909c0882bcd5", azure_api_version="2022-12-01")

GRAPH_TABLE = "graph_table"

persist_directory = "./knowledge_vector"


class ObjectiveVector(LanceModel):
    vector: Vector(clip.ndims()) = clip.VectorField()
    text: str = clip.SourceField()
    node_id: str = None
    node_label: str = None


# find current path in this file and path /knowledge_vector
path = os.path.join(os.path.dirname(__file__), persist_directory)

# lancedb_retriever = LancedbRM(
#     table_name=GRAPH_TABLE,
#     persist_directory=path
# )
#
# dspy.settings.configure(rm=lancedb_retriever)

# lancedb_retriever("Sale manager")
# print("test")
