from enum import Enum

from demo.storage.graphdb import kuzu_adapter


class GraphDBProvider(str, Enum):
    Kuzu = "kuzu"
    Networkx = "networkx"


def find_adapter(db_provider: GraphDBProvider):
    if db_provider == GraphDBProvider.Kuzu:
        return kuzu_adapter
    else:
        return None