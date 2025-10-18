from watchmen_model.common import UserBasedTuple, OptimisticLock, Auditable
from watchmen_utilities import ExtendedBaseModel


class MCPConf(ExtendedBaseModel, UserBasedTuple, OptimisticLock,Auditable):
    """
    Model for MCP (Minimum Viable Product) configuration.
    """
    id: str
    mcpName: str
    mcp_json: str
