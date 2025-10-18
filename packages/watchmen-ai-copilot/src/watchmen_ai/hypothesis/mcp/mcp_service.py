import logging

from langchain_mcp_tools import convert_mcp_to_langchain_tools
from langgraph.prebuilt import create_react_agent

from watchmen_ai.llm.azure_model_loader import AzureModelLoader


def init_logger() -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,  # logging.DEBUG,
        format='\x1b[90m[%(levelname)s]\x1b[0m %(message)s'
    )
    return logging.getLogger()


async def create_mcp_service(mcp_conf):
    mcp_configs = {
        'filesystem': {
            'command': 'npx',
            'args': [
                '-y',
                '@modelcontextprotocol/server-filesystem',
                '.'  # path to a directory to allow access to
            ]
        },
        'fetch': {
            'command': 'uvx',
            'args': [
                'mcp-server-fetch'
            ]
        },
        'weather': {
            'command': 'npx',
            'args': [
                '-y',
                '@h1deya/mcp-server-weather'
            ]
        },
    }

    tools, cleanup = await convert_mcp_to_langchain_tools(
        mcp_configs,
        init_logger()
    )

    # init azure open ai chat model for gpt-4o

    llm =  AzureModelLoader().get_llm_model()





    agent = create_react_agent(
        llm,
        tools
    )

    return agent

    # result = await agent.ainvoke({'messages': messages})
    # # the last message should be an AIMessage
    # response = result['messages'][-1].content
    #
    # print('\x1b[36m')  # color to cyan
    # print(response)
    # print('\x1b[0m')  # reset the color
    #
    # return response








