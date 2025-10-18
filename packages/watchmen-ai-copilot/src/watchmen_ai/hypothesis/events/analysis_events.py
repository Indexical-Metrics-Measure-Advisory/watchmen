from blinker import signal, NamedSignal


analysis_result_event: NamedSignal = signal("analysis_result_event")

# # knowledge_graph_inserted.connect(kuzu_adapter.sync_to_graph_db)
# knowledge_graph_inserted.connect(vector_db.sync_graph_to_db)



