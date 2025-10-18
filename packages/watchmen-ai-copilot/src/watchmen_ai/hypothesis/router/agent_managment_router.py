from logging import getLogger

from fastapi import APIRouter, Depends

from watchmen_ai.hypothesis.meta.agent_meta_service import AgentMetaService
from watchmen_ai.hypothesis.model.a2s_spec import AgentCard
from watchmen_ai.hypothesis.model.common import SimulationResult
from watchmen_ai.hypothesis.router.analysis_router import push_to_knowledge_base
from watchmen_ai.hypothesis.service.analysis_service import load_simulation_result_by_challenge_id
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans
from watchmen_lineage.utils.utils import trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_any_principal

router = APIRouter()

logger = getLogger(__name__)



async def get_agent_service(principal_service: PrincipalService)->AgentMetaService:
    """
    Get the agent service for managing agents.
    :param principal_service: The principal service for authentication and authorization.
    :return: An instance of the agent service.
    """
    # This is a placeholder for the actual implementation
    # In a real application, you would return an instance of the agent service
    return AgentMetaService(ask_meta_storage(), ask_snowflake_generator(),principal_service)

@router.post("/agent", tags=["hypothesis"])
async  def  create_or_update_agent(agent:AgentCard,principal_service: PrincipalService = Depends(get_any_principal)):
    """
    Create a new agent.
    :param agent: The agent card containing agent details.
    :param principal_service: The principal service for authentication and authorization.
    :return: The created agent card.
    """
    agent_service =  await get_agent_service(principal_service)

    def new_agent():
        return agent_service.create(agent)

    def update_agent():
        return agent_service.update(agent)


    if agent.id.startswith("challenge"):
        agent.id =str(agent_service.snowflakeGenerator.next_id())
        agent.tenantId = principal_service.tenantId
        agent.userId = principal_service.userId
        return trans(agent_service,new_agent)
    else:
        return trans(agent_service, update_agent)


@router.get("/agent/list", tags=["hypothesis"])
async def list_agents(principal_service: PrincipalService = Depends(get_any_principal)):
    """
    List all agents.
    :param principal_service: The principal service for authentication and authorization.
    :return: A list of agent cards.
    """
    agent_service = await get_agent_service(principal_service)

    def action():
        return agent_service.find_all(principal_service.tenantId)

    return trans_readonly(agent_service, action)


@router.get("/agent/{agent_id}", tags=["hypothesis"])
async def get_agent(agent_id: str, principal_service: PrincipalService = Depends(get_any_principal)):
    """
    Get an agent by its ID.
    :param agent_id: The ID of the agent to retrieve.
    :param principal_service: The principal service for authentication and authorization.
    :return: The agent card with the specified ID.
    """
    agent_service = await get_agent_service(principal_service)

    def action():
        return agent_service.find_by_id(agent_id)

    return trans_readonly(agent_service, action)


@router.get("/agent/connect/{agent_id}", tags=["hypothesis"])
async def connect_agent(agent_id: str, principal_service: PrincipalService = Depends(get_any_principal)):
    """
    Connect an agent by its ID.
    :param agent_id: The ID of the agent to connect.
    :param principal_service: The principal service for authentication and authorization.
    :return: The connected agent card.
    """
    agent_service = await get_agent_service(principal_service)

    def action():

        return agent_service.find_by_id(agent_id)

    def update_agent():
        return agent_service.update(agent)

    agent:AgentCard = trans_readonly(agent_service,action)

    if agent is None:
        raise ValueError(f"Agent with ID {agent_id} not found.")
    if agent.isConnecting:
        raise ValueError(f"Agent with ID {agent_id} is already connected.")
    agent.isConnecting = True

    # get challenge id

    if  "businessChallengeId" in agent.metadata:
        challenge_id = agent.metadata["businessChallengeId"]
        simulation = load_simulation_result_by_challenge_id(challenge_id)
        await push_to_knowledge_base(simulation["simulation_result"])
    else:
        logger.error(f"Agent with ID {agent_id} does not have a business challenge ID in its metadata.")

    return trans(agent_service, update_agent)