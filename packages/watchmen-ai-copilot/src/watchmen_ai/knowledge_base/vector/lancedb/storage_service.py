# import os
#
# import lancedb
# from lancedb.pydantic import LanceModel, Vector
#
# from watchmen_ai.utils.graph_utils import GraphNodeType
#
# LIMIT = 2  # TODO move to config
#
# GRAPH_TABLE = "graph_table"
#
# # TODO change to config
#
#
# db_path = os.path.abspath(__file__)
# father_path = os.path.abspath(os.path.dirname(db_path) + os.path.sep + ".")
#
#
# class ObjectiveVector(LanceModel):
#     vector: Vector(clip.ndims()) = clip.VectorField()
#     text: str = clip.SourceField()
#     node_id: str = None
#     node_label: str = None
#
#
# class LanceDBService:
#
#     def __init__(self, db_path: str):
#         self.db = lancedb.connect(db_path)
#
#     def init_table(self):
#         self.create_graph_table()
#
#     def create_graph_table(self):
#         table = self.db.create_table(GRAPH_TABLE, schema=ObjectiveVector, mode="overwrite")
#
#         return table
#
#     def add_data_to_objective_table(self, data: ObjectiveVector):
#         pass
#
#     def find_exist(self, node_id, table):
#         return table.search().where(f"node_id = '{node_id}'", prefilter=True).to_pydantic(ObjectiveVector)
#
#     async def search_by_label(self, query: str, label: str) -> ObjectiveVector:
#         where = f"node_label=='{label}'"
#
#         return self.open_graph_table().search(query).where(where).limit(LIMIT).to_pydantic(ObjectiveVector)
#
#     def open_graph_table(self):
#         return self.db.open_table(GRAPH_TABLE)
#
#     def get_db(self):
#         return self.db
#
#     def sync_graph_to_db(self, watchmen_graph_wrapper):
#         for graph_node in watchmen_graph_wrapper.nodes:
#             if graph_node.nodeLabel == GraphNodeType.BusinessTarget or graph_node.nodeLabel == GraphNodeType.Objective:
#                 table = self.db.open_table(GRAPH_TABLE)
#                 result = self.find_exist(graph_node.nodeId, table)
#                 if result:
#                     table.update(f"node_id = '{graph_node.nodeId}'",
#                                  values={"text": graph_node.nodeName, "node_id": graph_node.nodeId,
#                                          "node_label": graph_node.nodeLabel})
#                 else:
#                     table.add([{"text": graph_node.nodeName, "node_id": graph_node.nodeId,
#                                 "node_label": graph_node.nodeLabel}])
#
#
# lancedb_service = LanceDBService(father_path + "/knowledge_vector")
#
# #
# if __name__ == "__main__":
#     lancedb_service.search_by_label("sales trend of the last 3 months", "Objective")
# #     # lancedb_service.init_table()
# #
# #     actuals = lancedb_service.search_("Why are the sales of specific products declining")
# #     #
# #     # # table.add([{"text":"go to product","node_id":3}])
# #     # #
# #     # # text = "Activity Targets: These targets measure the level of activity and effort put forth by agents. They may include goalsfor the number of client meetings, calls made, proposals sent, or follow-up actions taken."
# #     # # table.add([{"text":text,"node_id":4}])
# #     #
# #     #
# #
# #     # actuals = lancedb_service.find_exist("90b45ca56eba4b469056371a1feba45d")
# #     for actual in actuals:
# #         print(actual)
# #
# # # table = LanceDBService("db").create_objective_table()
# # # text = "Sales Targets: These targets specify the number of policies, premium volume, or revenue that each agent or the agency as a whole is expected to achieve within a given time period."
# # # text2 = "New Business Acquisition Targets: These targets focus on acquiring new customers or policies. They may include goals for prospecting, lead generation, and conversion rates."
# # # table.add([{"text": text,"node_id":12}, {"text": text2,"node_id":20}])
# #
# # # table =  LanceDBService("db").open_objective_table()
# # #
# # # # table.add([{"text":"go to product","node_id":3}])
# # # #
# # # # text = "Activity Targets: These targets measure the level of activity and effort put forth by agents. They may include goalsfor the number of client meetings, calls made, proposals sent, or follow-up actions taken."
# # # # table.add([{"text":text,"node_id":4}])
# # # query = "sales trend of the last 3 months"
# # # actuals = table.search(query).to_pydantic(ObjectiveVector)
# # #
# # # for actual in actuals:
# # #     print(actual.text)
# # #
