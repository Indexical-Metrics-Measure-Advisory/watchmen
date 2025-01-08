from enum import Enum

from watchmen_ai.dspy.storage.vectordb.lanchdb.storage_service import lancedb_service


class VectorDBType(str, Enum):
    lanceDB = "lanceDB"


class VectorDBFactory:

    @staticmethod
    def find_vector_db(vector_db_type: VectorDBType):
        if vector_db_type == VectorDBType.lanceDB:
            return lancedb_service
        else:
            raise Exception("vector db type not found")

vector_db_factory = VectorDBFactory()

vector_db = vector_db_factory.find_vector_db(VectorDBType.lanceDB)

