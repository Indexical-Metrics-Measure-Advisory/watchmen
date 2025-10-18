from typing import Any, Dict

from watchmen_utilities import ExtendedBaseModel


class ConversationStageClassifier(ExtendedBaseModel):
    """Conversation stage classifier for multi-turn report-focused dialogue"""

    def __init__(self):
        super().__init__()
        # Enhanced stage keyword mapping for multi-turn interaction
        self.stage_keywords = {
            "business_problem_input": [
                "问题", "挑战", "困难", "issue", "problem", "challenge", "difficulty", "concern"
            ],
            "document_search": [
                "find", "search", "look for", "previous", "historical", "past", "earlier", "before",
                "查找", "搜索", "寻找", "历史", "以前", "之前", "过去"
            ],
            "deep_conversation": [
                "explain", "tell me about", "what does", "why", "how", "discuss", "elaborate", "detail",
                "解释", "告诉我", "什么是", "为什么", "如何", "讨论", "详细说明", "深入"
            ],
            "metrics_inquiry": [
                "data", "number", "statistics", "current", "latest", "trend", "performance",
                "指标", "数据", "数字", "统计", "当前", "最新", "趋势", "表现"
            ],
            "confirmation_for_analysis": [
                "confirm", "yes", "proceed", "generate", "create", "ready", "go ahead",
                "确认", "是的", "继续", "生成", "创建", "准备好", "开始"
            ],
            "new_analysis_generation": [
                "generate", "create", "new", "analysis", "based on", "considering", "combine",
                "生成", "创建", "新的", "分析", "报告", "基于", "考虑", "结合"
            ]
        }

    async def classify_stage(self, user_input: str, conversation_context: Dict[str, Any]) -> str:
        """Classify conversation stage based on multi-turn interaction logic"""
        user_input_lower = user_input.lower()

        # Multi-turn logic based on conversation state
        conversation_state = conversation_context.get("conversation_state", "initial")

        # Initial state: classify as business problem input or document search
        if conversation_state == "initial":
            # Check if it's a business problem/challenge
            problem_score = sum(1 for keyword in self.stage_keywords["business_problem_input"]
                                if keyword in user_input_lower)
            if problem_score > 0:
                return "business_problem_input"
            else:
                return "document_search"

        # After document search: move to deep conversation
        elif conversation_state == "documents_found":
            return "deep_conversation"

        # During deep conversation: check for metrics inquiry or analysis confirmation
        elif conversation_state == "in_conversation":
            # Check for metrics inquiry
            metrics_score = sum(1 for keyword in self.stage_keywords["metrics_inquiry"]
                                if keyword in user_input_lower)

            # Check for analysis confirmation
            confirm_score = sum(1 for keyword in self.stage_keywords["confirmation_for_analysis"]
                                if keyword in user_input_lower)

            if metrics_score > 0:
                return "metrics_inquiry"
            elif confirm_score > 0:
                return "confirmation_for_analysis"
            else:
                return "deep_conversation"  # Continue conversation

        # After metrics: check for analysis confirmation
        elif conversation_state == "metrics_obtained":
            confirm_score = sum(1 for keyword in self.stage_keywords["confirmation_for_analysis"]
                                if keyword in user_input_lower)
            if confirm_score > 0:
                return "confirmation_for_analysis"
            else:
                return "deep_conversation"  # Continue conversation with metrics

        # Fallback: calculate scores for all stages
        stage_scores = {}
        for stage, keywords in self.stage_keywords.items():
            score = sum(1 for keyword in keywords if keyword in user_input_lower)
            stage_scores[stage] = score

        best_stage = max(stage_scores, key=stage_scores.get)

        # If no clear match, continue conversation
        if stage_scores[best_stage] == 0:
            return "deep_conversation"

        return best_stage


