from datetime import datetime

from watchmen_ai.hypothesis.model.data_story import DataExplain
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, BusinessProblemWithHypotheses, \
    AnalysisMetric, HypothesisWithMetrics
from watchmen_ai.hypothesis.model.common import SimulationResult, ChallengeAnalysisResult
from watchmen_ai.markdown.document import MarkdownDocument


def build_analysis_report_md(simulation_result: SimulationResult):
    """
    基于SimulationResult动态生成分析报告的Markdown内容
    增强版本：包含更多数据展示和分析详情
    """
    md = MarkdownDocument()

    # 获取挑战和结果数据
    challenge = BusinessChallengeWithProblems.model_validate(simulation_result.challenge)
    result = ChallengeAnalysisResult.model_validate(simulation_result.result)

    # 添加报告生成时间
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    md.append_text(f"*Report generated on: {current_time}*")
    md.append_text("---")

    # 1. 报告标题和挑战描述
    md.append_heading(f"📌 Analysis Report: {challenge.title}", level=1)
    md.append_heading("🎯 Challenge Topic", level=2)
    md.append_text(f"### **{challenge.description}**")

    # 2. 分析概览统计
    md.append_heading("📊 Analysis Overview", level=2)
    _add_analysis_overview(md, challenge, result, simulation_result)

    # 3. 执行摘要 - 基于challengeInsightResult
    md.append_heading("✅ 1️⃣ Executive Summary", level=2)
    if result and result.challengeInsightResult:
        insight = result.challengeInsightResult
        if insight.answerForConclusion:
            md.append_text("> ### **🎯 Key Conclusion:**")
            md.append_text(f"**{insight.answerForConclusion}**")

        if insight.summaryForQuestions:
            md.append_text("### **📋 Summary of Key Findings:**")
            md.append_text(f"*{insight.summaryForQuestions}*")
    else:
        md.append_text("> ### **⏳ Analysis in progress...** Key conclusions will be available upon completion.")

    # 3. 关键洞察 - 基于问题分析结果
    md.append_heading("✅ 2️⃣ Key Insights", level=2)
    _add_key_insights(md, challenge, result)

    # 4. 假设分析详情
    md.append_heading("🧪 3️⃣ Hypothesis Analysis Details", level=2)
    _add_hypothesis_analysis(md, challenge, result)

    # 5. 推荐的进一步分析
    md.append_heading("✅ 4️⃣ Recommended Further Analysis", level=2)
    _add_further_analysis(md, challenge, result)

    # 6. 下一步业务行动
    md.append_heading("✅ 5️⃣ Next Business Actions", level=2)
    _add_business_actions(md, challenge, result)

    # 7. 评估结果
    md.append_heading("📋 6️⃣ Evaluation Results", level=2)
    _add_evaluation_results(md, result)

    # 8. 一句话总结
    md.append_heading("✅ 7️⃣ One-Sentence Summary", level=2)
    _add_summary(md, challenge, result)

    # 9. 关键数据点
    md.append_heading("🔗 8️⃣ Key Data Points", level=2)
    _add_key_data_points(md, challenge, result, simulation_result)

    # 添加指标明细数据部分（放在最后）
    md.append_text("\n\n---\n")
    md.append_heading("📋 Detailed Metrics Data", level=2)
    md.append_text("\n*This section contains detailed dataset information and statistical analysis for all metrics.*\n")

    # 添加详细的数据集信息
    if result and result.hypothesisResultDict:
        datasets_added = False
        for hypothesis_id, hypothesis_result in result.hypothesisResultDict.items():
            if hypothesis_result and hasattr(hypothesis_result,
                                             'analysis_metrics') and hypothesis_result.analysis_metrics:
                for i, metric in enumerate(hypothesis_result.analysis_metrics, 1):
                    try:
                        if isinstance(metric, dict):
                            metric = AnalysisMetric.model_validate(metric)

                        # 检查是否有数据集信息
                        if hasattr(metric, 'dataset') and metric.dataset:
                            dataset_info = metric.dataset
                            if hasattr(dataset_info, 'dataset') and dataset_info.dataset:
                                dataset_obj = dataset_info.dataset
                                if hasattr(dataset_obj, '__dict__'):
                                    # 转换为字典以便处理
                                    dataset_dict = dataset_obj.__dict__ if hasattr(dataset_obj,
                                                                                   '__dict__') else dataset_obj
                                    if not datasets_added:
                                        md.append_text("\n### 📊 Dataset Details and Statistics")
                                        datasets_added = True
                                    _add_detailed_dataset_table(md, dataset_dict, metric.name or f"Metric {i}")
                                elif isinstance(dataset_obj, dict):
                                    if not datasets_added:
                                        md.append_text("\n### 📊 Dataset Details and Statistics")
                                        datasets_added = True
                                    _add_detailed_dataset_table(md, dataset_obj, metric.name or f"Metric {i}")
                    except Exception as e:
                        continue

        if not datasets_added:
            md.append_text("\n*No detailed dataset information available for metrics analysis.*")
    else:
        md.append_text("\n*No metrics data available for detailed analysis.*")

    return md.contents()


def _add_analysis_overview(md: MarkdownDocument, challenge: BusinessChallengeWithProblems,
                           result: ChallengeAnalysisResult, simulation_result: SimulationResult):
    """添加分析概览统计"""
    total_problems = len(challenge.problems) if challenge.problems else 0
    completed_problems = 0
    total_hypotheses = 0
    completed_hypotheses = 0

    # 统计已完成的问题分析
    if result and result.questionResultDict:
        for problem in challenge.problems or []:
            problem = BusinessProblemWithHypotheses.model_validate(problem)
            question_result = result.questionResultDict.get(problem.id)
            if question_result and hasattr(question_result,
                                           'answerForConclusion') and question_result.answerForConclusion:
                completed_problems += 1

    # 统计假设分析
    if result and result.hypothesisResultDict:
        total_hypotheses = len(result.hypothesisResultDict)
        for hypothesis_result in result.hypothesisResultDict.values():
            if hypothesis_result and hasattr(hypothesis_result,
                                             'answerForConclusion') and hypothesis_result.answerForConclusion:
                completed_hypotheses += 1

    # 创建概览表格
    overview_headers = ["Metric", "Count", "Status"]
    overview_rows = [
        ["Total Problems", str(total_problems), f"{completed_problems}/{total_problems} Analyzed"],
        ["Total Hypotheses", str(total_hypotheses), f"{completed_hypotheses}/{total_hypotheses} Analyzed"],
        ["Challenge Title", challenge.title, "📋 Active"],
        ["Analysis Status", getattr(simulation_result, 'environmentStatus', 'In Progress'), "🔄 Processing"]
    ]

    md.append_table(overview_headers, overview_rows)


def _add_key_insights(md: MarkdownDocument, challenge: BusinessChallengeWithProblems, result: ChallengeAnalysisResult):
    """添加关键洞察"""
    if result and result.questionResultDict:
        insights_found = False
        
        for problem in challenge.problems or []:
            problem = BusinessProblemWithHypotheses.model_validate(problem)
            question_result = result.questionResultDict.get(problem.id)
            
            if question_result and hasattr(question_result, 'answerForConclusion') and question_result.answerForConclusion:
                insights_found = True
                md.append_text(f"**📋 {problem.title}**")
                md.append_text(f"> ✅ **Status:** Completed")
                md.append_text(f"> **Key Insight:** {question_result.answerForConclusion}")
                md.append_text("")
            else:
                insights_found = True
                md.append_text(f"**📋 {problem.title}**")
                md.append_text(f"> ⏳ **Status:** Pending")
                md.append_text(f"> **Key Insight:** Analysis in progress...")
                md.append_text("")

        if not insights_found:
            md.append_text("*Key insights are being generated based on question analysis results.*")
    else:
        md.append_text("*Key insights are being generated based on hypothesis analysis results.*")


def _add_hypothesis_analysis(md: MarkdownDocument, challenge: BusinessChallengeWithProblems,
                             result: ChallengeAnalysisResult):
    """添加假设分析详情"""
    if result and result.hypothesisResultDict:
        analysis_found = False
        
        for problem in challenge.problems or []:
            problem = BusinessProblemWithHypotheses.model_validate(problem)
            
            # 显示该问题下的假设分析
            for hypothesis in problem.hypotheses or []:
                hypothesis = HypothesisWithMetrics.model_validate(hypothesis)
                hypothesis_result = result.hypothesisResultDict.get(hypothesis.id)
                analysis_found = True
                
                md.append_text(f"**🧪 Problem:** {problem.title}")
                md.append_text(f"**📋 Hypothesis:** {hypothesis.description}")
                
                if hypothesis_result:
                    # 提取结论文本
                    if hasattr(hypothesis_result, 'answerForConclusion') and hypothesis_result.answerForConclusion:
                        result_text = hypothesis_result.answerForConclusion
                    else:
                        result_text = "Analysis completed"
                    
                    # 提取AnalysisData信息
                    metrics_count = "0"
                    data_points = "0"
                    
                    if hasattr(hypothesis_result, 'analysis_metrics') and hypothesis_result.analysis_metrics:
                        metrics_count = str(len(hypothesis_result.analysis_metrics))
                    
                    if hasattr(hypothesis_result, 'data_explain_dict') and hypothesis_result.data_explain_dict:
                        data_points = str(len(hypothesis_result.data_explain_dict))
                    
                    md.append_text(f"> ✅ **Status:** Completed")
                    md.append_text(f"> **Analysis Result:** {result_text}")
                    md.append_text(f"> **Metrics Count:** {metrics_count}")
                    md.append_text(f"> **Data Points:** {data_points}")
                else:
                    md.append_text(f"> ⏳ **Status:** Pending")
                    md.append_text(f"> **Analysis Result:** Analysis in progress...")
                    md.append_text(f"> **Metrics Count:** N/A")
                    md.append_text(f"> **Data Points:** N/A")
                
                md.append_text("")
        
        if analysis_found:
            # 添加详细的AnalysisData内容
            md.append_text("\n**Detailed Analysis Data:**")
            _add_detailed_analysis_data(md, result, challenge)
        else:
            md.append_text("*No hypothesis analysis data available.*")
    else:
        md.append_text("*No hypothesis analysis data available.*")


def _add_further_analysis(md: MarkdownDocument, challenge: BusinessChallengeWithProblems,
                          result: ChallengeAnalysisResult):
    """添加推荐的进一步分析"""
    if result and result.challengeInsightResult:
        # 优先使用futureAnalysisForConclusion
        future_analysis = getattr(result.challengeInsightResult, 'futureAnalysisForConclusion', None) or \
                          getattr(result.challengeInsightResult, 'futureAnalysis', None)

        if future_analysis:
            md.append_text("### **🔍 Recommended Next Steps for Analysis:**")
            # 将分析建议按行分割并格式化
            analysis_lines = future_analysis.split('\n')
            for i, line in enumerate(analysis_lines, 1):
                line = line.strip()
                if line:
                    # 移除可能的bullet point符号
                    if line.startswith('-') or line.startswith('•'):
                        line = line[1:].strip()
                    md.append_text(f"**{i}.** ***{line}***")
        else:
            md.append_text("*Further analysis recommendations will be generated upon completion.*")
    else:
        # 提供默认的推荐分析
        md.append_text("**Based on current analysis, we recommend:**")
        md.append_text("**1.** Review and validate key findings with stakeholders.")
        md.append_text("**2.** Gather additional data to support key findings.")
        md.append_text("**3.** Conduct deeper analysis on high-impact metrics.")


def _add_business_actions(md: MarkdownDocument, challenge: BusinessChallengeWithProblems,
                          result: ChallengeAnalysisResult):
    """添加下一步业务行动"""
    if result and result.challengeInsightResult:
        # 优先使用futureBusinessActionForConclusion
        business_action = getattr(result.challengeInsightResult, 'futureBusinessActionForConclusion', None) or \
                          getattr(result.challengeInsightResult, 'futureBusinessAction', None)

        if business_action:
            md.append_text("### **🚀 Recommended Business Actions:**")
            # 将业务行动按行分割并格式化
            business_actions = business_action.split('\n')
            action_count = 1
            for action in business_actions:
                action = action.strip()
                if action:
                    # 移除可能的bullet point符号
                    if action.startswith('-') or action.startswith('•'):
                        action = action[1:].strip()
                    md.append_text(f"## **{action_count}️⃣ {action}**")
                    action_count += 1
        else:
            md.append_text("*Business action recommendations will be generated upon completion.*")
    else:
        # 提供默认的业务行动
        md.append_text("### **🚀 Recommended Business Actions:**")
        md.append_text("## **1️⃣ Implement Data-Driven Strategies**")
        md.append_text("   • ***Apply insights from completed analysis to business operations.***")
        md.append_text("## **2️⃣ Monitor Key Metrics**")
        md.append_text("   • ***Establish tracking mechanisms for identified success indicators.***")
        md.append_text("## **3️⃣ Iterate and Improve**")
        md.append_text("   • ***Continuously refine strategies based on performance data.***")


def _add_evaluation_results(md: MarkdownDocument, result: ChallengeAnalysisResult):
    """添加评估结果"""
    if result and hasattr(result, 'evaluation') and result.evaluation:
        md.append_text("### **📊 Overall Analysis Evaluation:**")

        # 创建评估结果表格
        eval_headers = ["Dimension", "Score", "Comments"]
        eval_rows = []

        evaluation = result.evaluation
        if hasattr(evaluation, 'goal_alignment') and evaluation.goal_alignment:
            score = f"{evaluation.goal_alignment_score}/5" if hasattr(evaluation,
                                                                      'goal_alignment_score') and evaluation.goal_alignment_score is not None else "N/A"
            eval_rows.append(["Goal Alignment", score, evaluation.goal_alignment])

        if hasattr(evaluation, 'challenge_understanding') and evaluation.challenge_understanding:
            score = f"{evaluation.challenge_understanding_score}/5" if hasattr(evaluation,
                                                                               'challenge_understanding_score') and evaluation.challenge_understanding_score is not None else "N/A"
            eval_rows.append(["Challenge Understanding", score, evaluation.challenge_understanding])

        if hasattr(evaluation, 'hypothesis_coverage') and evaluation.hypothesis_coverage:
            score = f"{evaluation.hypothesis_coverage_score}/5" if hasattr(evaluation,
                                                                           'hypothesis_coverage_score') and evaluation.hypothesis_coverage_score is not None else "N/A"
            eval_rows.append(["Hypothesis Coverage", score, evaluation.hypothesis_coverage])

        if hasattr(evaluation, 'actionable_insights') and evaluation.actionable_insights:
            score = f"{evaluation.actionable_insights_score}/5" if hasattr(evaluation,
                                                                           'actionable_insights_score') and evaluation.actionable_insights_score is not None else "N/A"
            eval_rows.append(["Actionable Insights", score, evaluation.actionable_insights])

        if hasattr(evaluation, 'verification_reliability') and evaluation.verification_reliability:
            score = f"{evaluation.verification_reliability_score}/5" if hasattr(evaluation,
                                                                                'verification_reliability_score') and evaluation.verification_reliability_score is not None else "N/A"
            eval_rows.append(["Verification Reliability", score, evaluation.verification_reliability])

        if hasattr(evaluation, 'data_sufficiency') and evaluation.data_sufficiency:
            score = f"{evaluation.data_sufficiency_score}/5" if hasattr(evaluation,
                                                                        'data_sufficiency_score') and evaluation.data_sufficiency_score is not None else "N/A"
            eval_rows.append(["Data Sufficiency", score, evaluation.data_sufficiency])

        if eval_rows:
            md.append_table(eval_headers, eval_rows)
        else:
            md.append_text("*Evaluation data is being processed...*")
    elif result and result.hypothesisResultDict:
        evaluation_headers = ["Hypothesis ID", "Analysis Status", "Completion"]
        evaluation_rows = []

        for hypothesis_id, hypothesis_result in result.hypothesisResultDict.items():
            if hypothesis_result:
                has_conclusion = hasattr(hypothesis_result,
                                         'answerForConclusion') and hypothesis_result.answerForConclusion
                status = "✅ Completed" if has_conclusion else "⏳ In Progress"
                completion = "100%" if has_conclusion else "Pending"
                evaluation_rows.append(
                    [hypothesis_id[:20] + "..." if len(hypothesis_id) > 20 else hypothesis_id, status, completion])

        if evaluation_rows:
            md.append_table(evaluation_headers, evaluation_rows)
        else:
            md.append_text("*Evaluation results will be available upon completion of hypothesis analysis.*")
    else:
        md.append_text("*Evaluation results are being generated...*")


def _add_summary(md: MarkdownDocument, challenge: BusinessChallengeWithProblems, result: ChallengeAnalysisResult):
    """添加一句话总结"""
    if result and result.challengeInsightResult and result.challengeInsightResult.answerForConclusion:
        # 提取结论的第一句作为总结
        conclusion = result.challengeInsightResult.answerForConclusion
        summary = conclusion.split('.')[0] + '.' if '.' in conclusion else conclusion
        md.append_text(f"> ## **🎯 Key Takeaway:** ***{summary}***")
    else:
        md.append_text(
            f"> ## **🎯 Key Takeaway:** ***{challenge.title} analysis provides actionable insights for data-driven business decisions.***")


def _add_detailed_analysis_data(md: MarkdownDocument, result: ChallengeAnalysisResult,
                                challenge: BusinessChallengeWithProblems = None):
    """添加详细的AnalysisData内容"""
    if not result or not result.hypothesisResultDict:
        md.append_text("*No detailed analysis data available.*")
        return

    # Create a mapping from hypothesis_id to hypothesis title
    hypothesis_id_to_title = {}
    if challenge and challenge.problems:
        for problem in challenge.problems:
            problem = BusinessProblemWithHypotheses.model_validate(problem)
            for hypothesis in problem.hypotheses or []:
                hypothesis = HypothesisWithMetrics.model_validate(hypothesis)
                hypothesis_id_to_title[hypothesis.id] = hypothesis.title

    analysis_data_found = False

    for hypothesis_id, hypothesis_result in result.hypothesisResultDict.items():
        if hypothesis_result and (
                hasattr(hypothesis_result, 'analysis_metrics') or hasattr(hypothesis_result, 'data_explain_dict')):
            analysis_data_found = True

            # 添加假设标题作为子标题
            hypothesis_title = hypothesis_id_to_title.get(hypothesis_id, hypothesis_id)
            display_title = hypothesis_title
            md.append_text(f"\n### **🧪 Hypothesis: {display_title}**")

            

            # 显示数据解释
            if hasattr(hypothesis_result, 'data_explain_dict') and hypothesis_result.data_explain_dict:
                md.append_text("\n### 📋 Data Explanations")
                md.append_text("")

                # 如果只有一个解释，直接显示文本格式
                if len(hypothesis_result.data_explain_dict) == 1:
                    explain = hypothesis_result.data_explain_dict[0]
                    try:
                        if isinstance(explain, dict):
                            explain = DataExplain.model_validate(explain)

                        # 获取假设验证信息
                        validation = explain.hypothesisValidation
                        validation_flag = explain.hypothesisValidationFlag

                        # Build validation status display with better formatting
                        md.append_text("**🔍 Validation Status:**")
                        if validation_flag is not None:
                            status_icon = "✅" if validation_flag else "❌"
                            md.append_text(f"> {status_icon} ***{validation}***")
                        else:
                            md.append_text(f"> ⏳ ***{validation}***")
                        md.append_text("")

                        # Get key metric changes with better formatting
                        key_metric = explain.keyMetricChange
                        md.append_text("**📊 Key Metric Changes:**")
                        md.append_text(f"> ***{key_metric}***")
                        md.append_text("")

                        # Get summary findings with better formatting
                        summary = explain.summaryFinding
                        md.append_text("**📝 Summary Findings:**")
                        md.append_text(f"> ***{summary}***")
                        md.append_text("")

                    except Exception as e:
                        md.append_text(f"❌ Error parsing explanation: {str(e)}")

                # 如果有多个解释，使用改进的显示格式
                else:
                    for i, explain in enumerate(hypothesis_result.data_explain_dict, 1):
                        try:
                            if isinstance(explain, dict):
                                explain = DataExplain.model_validate(explain)

                            md.append_text(f"#### 📄 Explanation {i}")
                            md.append_text("")

                            # 获取假设验证信息
                            validation = explain.hypothesisValidation
                            validation_flag = explain.hypothesisValidationFlag

                            # 构建验证状态显示
                            md.append_text("**🔍 Validation Status:**")
                            if validation_flag is not None:
                                status_icon = "✅" if validation_flag else "❌"
                                md.append_text(f"> {status_icon} {validation}")
                            else:
                                md.append_text(f"> ⏳ {validation}")
                            md.append_text("")

                            # 获取关键指标变化
                            key_metric = explain.keyMetricChange
                            md.append_text("**📊 Key Metric Changes:**")
                            md.append_text(f"> {key_metric}")
                            md.append_text("")

                            # 获取总结发现
                            summary = explain.summaryFinding
                            md.append_text("**📝 Summary Findings:**")
                            md.append_text(f"> {summary}")

                            # 添加分隔线（除了最后一个）
                            if i < len(hypothesis_result.data_explain_dict):
                                md.append_text("")
                                md.append_text("---")
                                md.append_text("")

                        except Exception as e:
                            md.append_text(f"#### ❌ Explanation {i} - Error")
                            md.append_text(f"> Error parsing explanation: {str(e)}")
                            md.append_text("")

            # 显示分析指标
            if hasattr(hypothesis_result, 'analysis_metrics') and hypothesis_result.analysis_metrics:
                md.append_text("\n#### **📊 Analysis Metrics:**")
                metrics_headers = ["Metric Name", "Dimensions", "Dataset"]
                metrics_rows = []

                for metric in hypothesis_result.analysis_metrics:
                    try:
                        # 验证并转换metric对象
                        if isinstance(metric, dict):
                            metric = AnalysisMetric.model_validate(metric)

                        metric_name = getattr(metric, 'name', 'Unknown Metric') or 'Unknown Metric'
                        metric_category = getattr(metric, 'category', 'General') or 'General'

                        # 构建显示名称
                        display_name = f"{metric_name} ({metric_category})" if metric_name != 'Unknown Metric' else metric_category

                        # 提取数据集信息
                        dataset_info = "No dataset"
                        if hasattr(metric, 'dataset') and metric.dataset:
                            dataset = metric.dataset
                            if hasattr(dataset, 'dataset') and dataset.dataset:
                                # 检查数据集结构
                                dataset_obj = dataset.dataset
                                if isinstance(dataset_obj, dict):
                                    # 如果有数据，显示数据行数和列信息
                                    if 'data' in dataset_obj and 'column_names' in dataset_obj:
                                        data_rows = len(dataset_obj['data']) if dataset_obj['data'] else 0
                                        columns = len(dataset_obj['column_names']) if dataset_obj['column_names'] else 0
                                        dataset_info = f"{data_rows} rows, {columns} cols"
                                    else:
                                        dataset_info = "Dataset structure available"
                                else:
                                    # 尝试获取数据集名称或ID
                                    dataset_name = getattr(dataset_obj, 'name', None) or getattr(dataset_obj, 'id',
                                                                                                 'Dataset available')
                                    dataset_info = str(dataset_name)[:30] + "..." if len(
                                        str(dataset_name)) > 30 else str(dataset_name)
                            else:
                                dataset_info = "Dataset configured"

                        # 提取维度信息
                        dimensions_info = "No dimensions"
                        if hasattr(metric, 'dimensions') and metric.dimensions:
                            dim_names = []
                            for dim in metric.dimensions:
                                if isinstance(dim, dict):
                                    dim_name = dim.get('name', 'Unknown')
                                    dim_type = dim.get('dimensionType', '')
                                    if dim_type:
                                        dim_names.append(f"{dim_name}({dim_type})")
                                    else:
                                        dim_names.append(dim_name)
                                else:
                                    dim_name = getattr(dim, 'name', 'Unknown')
                                    dim_type = getattr(dim, 'dimensionType', '')
                                    if dim_type:
                                        dim_names.append(f"{dim_name}({dim_type})")
                                    else:
                                        dim_names.append(dim_name)

                            if dim_names:
                                dimensions_info = ", ".join(dim_names[:3])  # 限制显示前3个维度
                                if len(metric.dimensions) > 3:
                                    dimensions_info += f" (+{len(metric.dimensions) - 3} more)"
                            else:
                                dimensions_info = f"{len(metric.dimensions)} dimension(s)"

                        metrics_rows.append([display_name, dimensions_info, dataset_info])
                    except Exception as e:
                        # 处理异常情况
                        metrics_rows.append(["Error parsing metric", "N/A", str(e)[:30] + "..."])

                if metrics_rows:
                    md.append_table(metrics_headers, metrics_rows)
                else:
                    md.append_text("  • No detailed metrics available")
            # 添加分隔线
            md.append_text("---")

    if not analysis_data_found:
        md.append_text("*No detailed analysis metrics or data explanations found in hypothesis results.*")


# ===== 数据详情和统计函数 =====

# ===== 指标明细数据函数 =====

def _add_detailed_dataset_table(md: MarkdownDocument, dataset_obj: dict, metric_name: str):
    """添加详细的数据集表格和统计摘要"""
    if not dataset_obj or 'data' not in dataset_obj or 'column_names' not in dataset_obj:
        return

    data = dataset_obj['data']
    column_names = dataset_obj['column_names']

    if not data or not column_names:
        return

    md.append_text(f"\n**📊 Dataset Details for {metric_name}:**")

    # 显示数据表格（限制显示前20行以避免过长）
    display_rows = data[:20] if len(data) > 20 else data
    md.append_table(column_names, display_rows)

    if len(data) > 20:
        md.append_text(f"*Showing first 20 rows of {len(data)} total rows...*")

    # 生成统计摘要
    md.append_text("\n**📈 Statistical Summary:**")
    stats_headers = ["Column", "Data Type", "Unique Values", "Sample Values"]
    stats_rows = []

    for i, col_name in enumerate(column_names):
        # 提取该列的所有值
        col_values = [row[i] if i < len(row) else None for row in data if row]
        col_values = [v for v in col_values if v is not None]  # 过滤None值

        if not col_values:
            stats_rows.append([col_name, "No Data", "0", "N/A"])
            continue

        # 判断数据类型
        sample_value = col_values[0]
        if isinstance(sample_value, (int, float)):
            data_type = "Numeric"
            unique_count = len(set(col_values))
            # 对于数值型数据，显示统计信息
            try:
                min_val = min(col_values)
                max_val = max(col_values)
                avg_val = sum(col_values) / len(col_values)
                sample_info = f"Min: {min_val}, Max: {max_val}, Avg: {avg_val:.2f}"
            except:
                sample_info = str(col_values[:3])[:30] + "..."
        elif isinstance(sample_value, str) and 'T' in sample_value and ':' in sample_value:
            data_type = "DateTime"
            unique_count = len(set(col_values))
            # 对于日期时间，显示范围
            try:
                sorted_dates = sorted(set(col_values))
                sample_info = f"From: {sorted_dates[0][:10]} To: {sorted_dates[-1][:10]}"
            except:
                sample_info = str(col_values[:2])[:30] + "..."
        else:
            data_type = "Text/Other"
            unique_count = len(set(str(v) for v in col_values))
            # 显示前几个唯一值
            unique_vals = list(set(str(v) for v in col_values))[:3]
            sample_info = ", ".join(unique_vals)[:30] + ("..." if len(unique_vals) > 3 else "")

        stats_rows.append([col_name, data_type, str(unique_count), sample_info])

    md.append_table(stats_headers, stats_rows)

    # 添加总体统计
    md.append_text("\n**📋 Dataset Overview:**")
    overview_data = [
        ["Total Rows", str(len(data))],
        ["Total Columns", str(len(column_names))],
        ["Data Density",
         f"{(sum(1 for row in data for cell in row if cell is not None) / (len(data) * len(column_names)) * 100):.1f}%" if data and column_names else "0%"]
    ]
    md.append_table(["Metric", "Value"], overview_data)
    md.append_text("\n---\n")


def _add_dataset_details(md: MarkdownDocument, result: ChallengeAnalysisResult):
    """添加数据集详细信息"""
    if not result or not result.hypothesisResultDict:
        md.append_text("*No dataset information available.*")
        return

    datasets_found = False

    for hypothesis_id, hypothesis_result in result.hypothesisResultDict.items():
        if hypothesis_result and hasattr(hypothesis_result, 'analysis_metrics'):
            for metric in hypothesis_result.analysis_metrics:
                try:
                    if isinstance(metric, dict):
                        metric = AnalysisMetric.model_validate(metric)

                    if hasattr(metric, 'dataset') and metric.dataset and hasattr(metric.dataset, 'dataset'):
                        dataset = metric.dataset.dataset
                        if not datasets_found:
                            datasets_found = True

                        # 获取数据集名称
                        dataset_name = getattr(dataset, 'name', None) or getattr(dataset, 'id',
                                                                                 f"Dataset for {hypothesis_id[:20]}")
                        md.append_text(f"\n**Dataset: {dataset_name}**")

                        # 提取数据集属性
                        dataset_headers = ["Property", "Value"]
                        dataset_rows = []

                        # 常见的数据集属性
                        properties = ['source', 'rows_count', 'columns_count', 'time_range', 'description']
                        for prop in properties:
                            if hasattr(dataset, prop):
                                value = getattr(dataset, prop)
                                if value is not None:
                                    # 格式化显示值
                                    if isinstance(value, (int, float)):
                                        display_value = f"{value:,}"
                                    elif isinstance(value, str) and len(value) > 50:
                                        display_value = value[:50] + "..."
                                    else:
                                        display_value = str(value)
                                    dataset_rows.append([prop.replace('_', ' ').title(), display_value])

                        if dataset_rows:
                            md.append_table(dataset_headers, dataset_rows)
                        else:
                            md.append_text("  • No detailed dataset properties available")
                except Exception as e:
                    continue

    if not datasets_found:
        md.append_text("*No detailed dataset information found in analysis metrics.*")


def _add_key_data_points(md: MarkdownDocument, challenge: BusinessChallengeWithProblems,
                         result: ChallengeAnalysisResult, simulation_result: SimulationResult):
    """添加关键数据点"""
    # 基础统计信息
    md.append_text("**📋 Basic Information:**")
    md.append_text(f"> **Challenge Title:** {challenge.title}")
    md.append_text(f"> **Total Problems:** {len(challenge.problems) if challenge.problems else 0}")
    md.append_text(f"> **Analysis Status:** {getattr(simulation_result, 'environmentStatus', 'In Progress')}")
    md.append_text("")

    # 从hypothesis结果中提取关键指标
    if result and result.hypothesisResultDict:
        completed_hypotheses = 0
        total_metrics = 0
        total_data_points = 0

        for hypothesis_id, hypothesis_result in result.hypothesisResultDict.items():
            if hypothesis_result and hasattr(hypothesis_result,
                                             'answerForConclusion') and hypothesis_result.answerForConclusion:
                completed_hypotheses += 1

            # 统计AnalysisData内容
            if hypothesis_result:
                if hasattr(hypothesis_result, 'analysis_metrics') and hypothesis_result.analysis_metrics:
                    total_metrics += len(hypothesis_result.analysis_metrics)
                if hasattr(hypothesis_result, 'data_explain_dict') and hypothesis_result.data_explain_dict:
                    total_data_points += len(hypothesis_result.data_explain_dict)

        # 添加完成率
        completion_rate = f"{(completed_hypotheses / len(result.hypothesisResultDict) * 100):.1f}%" if result.hypothesisResultDict else "0%"
        
        md.append_text("**📊 Analysis Statistics:**")
        md.append_text(f"> **Total Hypotheses:** {len(result.hypothesisResultDict)}")
        md.append_text(f"> **Completed Hypotheses:** {completed_hypotheses}")
        md.append_text(f"> **Completion Rate:** {completion_rate}")
        md.append_text(f"> **Total Analysis Metrics:** {total_metrics}")
        md.append_text(f"> **Total Data Explanations:** {total_data_points}")
        md.append_text("")

    # 添加时间信息
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    md.append_text("**⏰ Report Information:**")
    md.append_text(f"> **Report Generated:** {current_time}")


