from blinker import signal

from watchmen_ai.knowledge_base.graphdb.kuzu_adapter import kuzu_adapter
from watchmen_ai.knowledge_base.vector.vector_factory import vector_db

knowledge_graph_inserted = signal("knowledge_graph_inserted")

# knowledge_graph_inserted.connect(kuzu_adapter.sync_to_graph_db)
knowledge_graph_inserted.connect(vector_db.sync_graph_to_db)
