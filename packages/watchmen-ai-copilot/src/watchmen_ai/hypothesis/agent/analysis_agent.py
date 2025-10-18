import os
from typing import List, TypedDict, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import MarkdownHeaderTextSplitter
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

# --- 1. 环境设置与模型加载 ---
# 从 .env 文件加载环境变量 (OPENAI_API_KEY)
from dotenv import load_dotenv

load_dotenv()

# 初始化 LLM，用于核心对话和决策
# 建议使用 gpt-4o 或 gpt-4-turbo 以获得最佳的工具调用和决策效果
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# --- 2. 模拟数据与 RAG 准备 ---
# 模拟已有的分析报告
mock_reports_content = """
# 2025年第一季度增长分析报告

## 摘要
本季度新用户增长率为 15%，主要由市场推广活动A驱动。DAU (日活跃用户) 环比增长 10%。

## 详细数据
- **新用户**: 150,000
- **激活渠道**: 市场活动A (60%), 自然增长 (30%), 其他 (10%)
- **用户留存**: 次日留存率为 40%，七日留存率为 20%。

---

# 2025年第二季度增长分析报告

## 摘要
本季度实现了 18% 的新用户增长，超越预期。主要贡献来自产品功能B的上线。DAU 稳定增长 12%。

## 详细数据
- **新用户**: 180,000
- **激活渠道**: 产品功能B引流 (55%), 自然增长 (35%), 其他 (10%)
- **用户留存**: 次日留存率提升至 45%，七日留存率稳定在 22%。
"""

# 切分和索引报告，为 RAG 做准备
headers_to_split_on = [("#", "Header 1"), ("##", "Header 2")]
markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
splits = markdown_splitter.split_text(mock_reports_content)

# 创建向量数据库
vectorstore = FAISS.from_documents(documents=splits, embedding=OpenAIEmbeddings())
retriever = vectorstore.as_retriever(search_kwargs={'k': 2})  # 检索最相关的2个片段

print("--- 向量数据库已准备就绪 ---")


# --- 3. 工具定义 ---
@tool
def get_mcp_metric(metric_name: str, quarter: Literal["Q1", "Q2", "Q3", "Q4"]) -> dict:
    """
    用于从MCP获取指定季度和名称的指标数据。
    例如: get_mcp_metric(metric_name='user_growth_rate', quarter='Q1')
    """
    print(f"--- 外部工具: 调用 MCP API, 指标: {metric_name}, 季度: {quarter} ---")
    # 模拟 API 返回
    mock_api_data = {
        "user_growth_rate": {"Q1": "15%", "Q2": "18%"},
        "dau_growth": {"Q1": "10%", "Q2": "12%"},
        "retention_7day": {"Q1": "20%", "Q2": "22%"}
    }
    return {"metric": metric_name, "quarter": quarter,
            "value": mock_api_data.get(metric_name, {}).get(quarter, "数据未找到")}


tools = [get_mcp_metric]
llm_with_tools = llm.bind_tools(tools)


# --- 4. 定义图的状态 (Graph State) ---
class AgentState(TypedDict):
    initial_query: str
    messages: List[BaseMessage]
    similar_reports: List[str]
    assessment: str  # 用于存储路由决策: 'generate_report' 或 'continue_chat'


# --- 5. 定义图的节点 (Nodes) ---

def retrieve_similar_reports(state: AgentState):
    """节点：检索与初始问题相关的报告片段"""
    print("--- 节点: 检索相似报告 ---")
    query = state['initial_query']
    retrieved_docs = retriever.invoke(query)
    report_texts = [doc.page_content for doc in retrieved_docs]

    # 初始化消息列表，并将检索到的内容作为第一条系统消息
    initial_message = SystemMessage(
        f"""你是一个智能分析报告助手。
        这是系统为你找到的可能相关的历史报告内容，请在对话中参考它们：
        ---
        {"\n---\n".join(report_texts)}
        ---
        请开始与用户对话，深入了解他的需求。如果需要具体指标，请使用 get_mcp_metric 工具。
        """
    )
    return {"similar_reports": report_texts, "messages": [initial_message]}


def chat_with_user(state: AgentState):
    """节点：与用户进行对话，可能会决定调用工具"""
    print("--- 节点: 与用户进行对话 ---")
    response = llm_with_tools.invoke(state['messages'])
    return {"messages": state['messages'] + [response]}


def generate_final_report(state: AgentState):
    """节点：综合所有信息，生成最终报告"""
    print("--- 节点: 生成最终分析报告 ---")
    report_generation_prompt = f"""请根据以下全部信息，为用户生成一份详细、结构化的分析报告。

    **1. 用户的初始需求:**
    {state['initial_query']}

    **2. 检索到的相关历史报告:**
    {"\n---\n".join(state['similar_reports'])}

    **3. 完整的对话历史 (包含工具调用结果):**
    {state['messages']}

    请输出最终报告。
    """
    response = llm.invoke(report_generation_prompt)
    return {"messages": state['messages'] + [response]}


# --- 6. 定义路由逻辑 (Conditional Edge) ---

class ReadinessAssessment(BaseModel):
    """评估是否已收集到足够信息来生成报告。"""
    decision: Literal['generate_report', 'continue_chat'] = Field(
        description="如果信息充足，则回答 'generate_report'；否则回答 'continue_chat'。")
    reasoning: str = Field(description="做出该决策的简要理由。")


assessment_llm = llm.with_structured_output(ReadinessAssessment)


def router(state: AgentState):
    """节点：路由决策，判断下一步是调用工具、继续聊天还是生成报告"""
    print("--- 路由: 判断下一步 ---")
    last_message = state['messages'][-1]

    # 优先处理工具调用
    if last_message.tool_calls:
        # 在这里直接返回，让人类参与循环来处理
        return "call_tool"

    # 如果对话轮次太少，则继续聊天
    if len(state['messages']) < 4:
        return "continue_chat"

    # 让 LLM 判断是否可以生成报告
    assessment_prompt = f"""
    分析以下对话，判断我们是否已经收集到了足够的信息来撰写一份满足用户初始需求的完整报告。

    用户初始需求: {state['initial_query']}
    对话历史: {state['messages']}

    如果信息已经足够，请回答 'generate_report'。如果还需要向用户澄清或获取更多信息，请回答 'continue_chat'。
    """
    assessment = assessment_llm.invoke(assessment_prompt)
    print(f"路由评估结果: {assessment.decision} (理由: {assessment.reasoning})")
    return assessment.decision


# --- 7. 构建图 (Workflow) ---
workflow = StateGraph(AgentState)

workflow.add_node("retriever", retrieve_similar_reports)
workflow.add_node("chat", chat_with_user)
workflow.add_node("tool_node", tools=[get_mcp_metric])  # 使用预置的 ToolNode
workflow.add_node("generator", generate_final_report)

workflow.set_entry_point("retriever")

workflow.add_edge("retriever", "chat")
workflow.add_edge("tool_node", "chat")
workflow.add_edge("generator", END)

workflow.add_conditional_edges(
    "chat",
    router,
    {
        "call_tool": "tool_node",
        "continue_chat": "chat",
        "generate_report": "generator"
    }
)

# print workflow graph
print("--- Agent 图已构建 ---")
# --- 8. 编译图并设置断点 ---
# MemorySaver 用于在图执行过程中保存状态


# 编译图，并设置断点以实现人类参与
# 在调用工具节点之前暂停
memory = MemorySaver()
app = workflow.compile(checkpointer=memory, interrupt_before=["tool_node"])

print("--- Agent 图已编译完成 ---")

# --- 8. 运行 Agent 并处理人类参与循环 ---
if __name__ == "__main__":
    initial_query = "对比一下Q1和Q2的用户增长率和留存情况，分析一下Q2增长更好的原因是什么？"

    # 为每个对话创建一个唯一的 thread_id
    config = {"configurable": {"thread_id": "user-thread-1"}}

    # 初始输入
    inputs = {"initial_query": initial_query, "messages": [HumanMessage(content=initial_query)]}

    # 启动 Agent
    thread_state = app.invoke(inputs, config)

    while thread_state.next:
        # 检查是否需要人类干预
        if "tool_node" in thread_state.next:
            last_message = thread_state.values['messages'][-1]
            tool_call = last_message.tool_calls[0]

            print("\n" + "=" * 50)
            print("--- ❗ 人类审核请求 (Human-in-the-Loop) ❗ ---")
            print(f"Agent 准备调用工具: {tool_call['name']}")
            print(f"参数: {tool_call['args']}")

            user_approval = input("是否批准本次调用? (y/n): ").strip().lower()

            if user_approval == 'y':
                print("--- 用户已批准，继续执行... ---")
                # 批准，继续执行图
                thread_state = app.invoke(None, config)
            else:
                print("--- 用户已拒绝，向 Agent 反馈... ---")
                # 拒绝，向图中注入一条 ToolMessage 然后继续
                rejection_message = ToolMessage(
                    content="用户拒绝了本次工具调用。",
                    tool_call_id=tool_call['id']
                )
                thread_state = app.invoke({"messages": [rejection_message]}, config)
            print("=" * 50 + "\n")
        else:
            # 如果没有中断，正常继续
            thread_state = app.invoke(None, config)

    # 对话结束，打印最终结果
    final_answer = thread_state.values['messages'][-1]
    print("\n" + "#" * 60)
    print("### ✅ Agent 任务完成 ###")
    print("#" * 60)
    print("\n**最终报告:**\n")
    print(final_answer.content)