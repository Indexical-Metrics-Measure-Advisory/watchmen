import os.path

import kuzu

from watchmen_ai.knowledge_base.graphdb.kuzu_cypher_utils import build_create_edge_table, build_insert_node, \
    build_insert_edge, build_create_node_table
from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.utils.graph_utils import WatchmenGraphWrapper

db_path = os.path.abspath(__file__)
father_path = os.path.abspath(os.path.dirname(db_path) + os.path.sep + ".")

objective_graphs = [{
    "table": "Objective",
    "columns": [
        {
            "name": "name",
            "type": "STRING"

        },
        {
            "name": "node_id",
            "type": "STRING",
            "primary_key": True
        },
    ]
},
    {
        "table": "Metric",
        "columns": [
            {
                "name": "name",
                "type": "STRING"
            },
            {
                "name": "node_id",
                "type": "STRING",
                "primary_key": True
            },
        ]
    },
    {
        "table": "Audience",
        "columns": [
            {
                "name": "name",
                "type": "STRING"
            },
            {
                "name": "node_id",
                "type": "STRING",
                "primary_key": True
            },
        ]
    },
    {
        "table": "BusinessTarget",
        "columns": [
            {
                "name": "name",
                "type": "STRING"
            },
            {
                "name": "node_id",
                "type": "STRING",
                "primary_key": True
            },
        ]
    }
]

objective_graphs_rel = [
    {
        "table": "measured_metric",
        "source": "BusinessTarget",
        "target": "Metric",
        "columns": [
            {
                "name": "name",
                "type": "STRING"
            }
        ]
    },
    {
        "table": "key_objective",
        "source": "BusinessTarget",
        "target": "Objective",
        "columns": [
            {
                "name": "name",
                "type": "STRING"
            }
        ]
    },
    {
        "table": "has_audience",
        "source": "BusinessTarget",
        "target": "Audience",
        "columns": [
            {
                "name": "name",
                "type": "STRING"
            }
        ]
    }
    # ,
    # {
    #     "table": "metric_structure",
    #     "source": "Objective",
    #     "target": "MetricStructure",
    #     "columns": [
    #         {
    #             "name": "name",
    #             "type": "STRING"
    #         }
    #     ]
    # }

]


def find_source_and_target(edgeLabel):
    print(edgeLabel)
    rel_dict = {}
    for ref in objective_graphs_rel:
        table_name = ref["table"]
        rel_dict[table_name] = ref

    if edgeLabel in rel_dict:
        return rel_dict[edgeLabel]["source"], rel_dict[edgeLabel]["target"]


class KuzuAdapter:

    def init_objective_graph(self):
        for graph in objective_graphs:
            table_name = graph["table"]
            columns = graph["columns"]
            create_table_query = build_create_node_table(table_name, columns)
            self.connect.execute(create_table_query)

    def init_objective_graph_rel(self):
        for graph in objective_graphs_rel:
            table_name = graph["table"]
            source = graph["source"]
            target = graph["target"]
            columns = graph["columns"]
            create_table_query = build_create_edge_table(table_name, source, target, columns)
            self.connect.execute(create_table_query)

    def init_table(self):
        self.init_objective_graph()
        self.init_objective_graph_rel()

    def __init__(self):
        self.db = kuzu.Database(father_path + "/knowledge_graph", read_only=False)
        self.connect = kuzu.Connection(self.db)
        # self.init_table()

    def insert_node_and_properties_data(self, nodes, properties):
        for node in nodes:
            insert_or_merge_sql = build_insert_node(node.nodeLabel, {"name": node.nodeName, "node_id": node.nodeId})
            self.connect.execute(insert_or_merge_sql)

    def query_data(self, query):
        return self.connect.execute(query)

    def get_db(self):
        return self.db

    def insert_edge_data(self, edges):

        for edge in edges:
            source, target = find_source_and_target(edge.edgeLabel)
            insert_or_merge_sql = build_insert_edge(edge.edgeLabel, source, target, edge.sourceNodeID,
                                                    edge.targetNodeID, {"name": edge.edgeName})
            print(insert_or_merge_sql)
            self.connect.execute(insert_or_merge_sql)

    def sync_to_graph_db(self, watchmen_graph_wrapper: WatchmenGraphWrapper):

        self.insert_node_and_properties_data(watchmen_graph_wrapper.nodes, watchmen_graph_wrapper.properties)

        self.insert_edge_data(watchmen_graph_wrapper.edges)

    def query_data_by_objective(self, objective):
        query_sql = f"MATCH (u:BusinessTarget)-[r]->(m:Metric) WHERE u.name = '{objective}' RETURN m.name"

        return self.connect.execute(query_sql)


kuzu_adapter = KuzuAdapter()


def query_by_langchain(kuzu_adapter: KuzuAdapter, query: str):
    graph = KuzuGraph(kuzu_adapter.get_db())

    print(graph.get_schema)

    chain = KuzuQAChain.from_llm(
        llm=AzureModelLoader().get_llm_model(),
        graph=graph,
        verbose=True,
    )

    return chain.invoke(query)


if __name__ == "__main__":
    # kuzu_adapter.init_table()

    tst = "MATCH (n:BusinessTarget)-[r]->(m:Metric) return Label(m),m.name"

    ref = "MATCH ()-[e]->() RETURN Label(e)"

    # query_by_langchain(kuzu_adapter,"list all the objective")

    # "MATCH (u1:BusinessTarget), (u2:Metric) WHERE u1.node_id = '13' AND u2.node_id = 'dada' CREATE (u1)-[:measured_metric {since: 2011}]->(u2)"

    # rel = "MATCH (u1:BusinessTarget), (u2:Audience) WHERE u1.node_id = '8da1fa37e55a4805877d645ef0145c21' AND u2.node_id = 'eebf6427339e47479166d32d57f0b67b' RETURN u1.*"
    # # connect = kuzu.Connection(kuzu.Database("./knowledge_graph",read_only=True))
    # # # init_table()
    result = kuzu_adapter.query_data(tst)
    #
    print(result.get_as_df())

# @knowledge_graph_inserted.connect
# def handle(knowledge_graph: WatchmenGraphWrapper):
#     print("dada")
#     kuzu_adapter.sync_to_graph_db(knowledge_graph)
