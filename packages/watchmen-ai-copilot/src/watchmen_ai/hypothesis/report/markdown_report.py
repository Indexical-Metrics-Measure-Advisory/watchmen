from datetime import datetime

from watchmen_ai.hypothesis.model.data_story import DataExplain
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, BusinessProblemWithHypotheses, \
    AnalysisMetric, HypothesisWithMetrics
from watchmen_ai.hypothesis.model.common import SimulationResult, ChallengeAnalysisResult
from watchmen_ai.markdown.document import MarkdownDocument


def build_analysis_report_md(simulation_result: SimulationResult):
    """
    Generate Markdown analysis report based on SimulationResult.
    Enhanced version: includes more data presentation and analysis details.
    """
    md = MarkdownDocument()

    # Get challenge and result data
    challenge = BusinessChallengeWithProblems.model_validate(simulation_result.challenge)
    result = ChallengeAnalysisResult.model_validate(simulation_result.result)

    # Add report generation timestamp
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    md.append_text(f"*Report generated on: {current_time}*")
    md.append_text("---")

    # 1. Report title and challenge description
    md.append_heading(f"📌 Analysis Report: {challenge.title}", level=1)
    md.append_heading("🎯 Challenge Topic", level=2)
    md.append_text(f"### **{challenge.description}**")

    # 2. Analysis overview statistics
    md.append_heading("📊 Analysis Overview", level=2)
    _add_analysis_overview(md, challenge, result, simulation_result)

    # 3. Executive summary — based on challengeInsightResult
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

    # 3. Key insights — based on problem analysis results
    md.append_heading("✅ 2️⃣ Key Insights", level=2)
    _add_key_insights(md, challenge, result)

    # 4. Hypothesis analysis details
    md.append_heading("🧪 3️⃣ Hypothesis Analysis Details", level=2)
    _add_hypothesis_analysis(md, challenge, result)

    # 5. Recommended further analysis
    md.append_heading("✅ 4️⃣ Recommended Further Analysis", level=2)
    _add_further_analysis(md, challenge, result)

    # 6. Next business actions
    md.append_heading("✅ 5️⃣ Next Business Actions", level=2)
    _add_business_actions(md, challenge, result)

    # 7. Evaluation results
    md.append_heading("📋 6️⃣ Evaluation Results", level=2)
    _add_evaluation_results(md, result)

    # 8. One-sentence summary
    md.append_heading("✅ 7️⃣ One-Sentence Summary", level=2)
    _add_summary(md, challenge, result)

    # 9. Key data points
    md.append_heading("🔗 8️⃣ Key Data Points", level=2)
    _add_key_data_points(md, challenge, result, simulation_result)

    # Add detailed metric data section (at the end)
    md.append_text("\n\n---\n")
    md.append_heading("📋 Detailed Metrics Data", level=2)
    md.append_text("\n*This section contains detailed dataset information and statistical analysis for all metrics.*\n")

    # Add detailed dataset information
    if result and result.hypothesisResultDict:
        datasets_added = False
        for hypothesis_id, hypothesis_result in result.hypothesisResultDict.items():
            if hypothesis_result and hasattr(hypothesis_result,
                                             'analysis_metrics') and hypothesis_result.analysis_metrics:
                for i, metric in enumerate(hypothesis_result.analysis_metrics, 1):
                    try:
                        if isinstance(metric, dict):
                            metric = AnalysisMetric.model_validate(metric)

                        # Check for dataset information
                        if hasattr(metric, 'dataset') and metric.dataset:
                            dataset_info = metric.dataset
                            if hasattr(dataset_info, 'dataset') and dataset_info.dataset:
                                dataset_obj = dataset_info.dataset
                                if hasattr(dataset_obj, '__dict__'):
                                    # Convert to dict for processing
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
    """Add analysis overview statistics"""
    total_problems = len(challenge.problems) if challenge.problems else 0
    completed_problems = 0
    total_hypotheses = 0
    completed_hypotheses = 0

    # Count completed problem analyses
    if result and result.questionResultDict:
        for problem in challenge.problems or []:
            problem = BusinessProblemWithHypotheses.model_validate(problem)
            question_result = result.questionResultDict.get(problem.id)
            if question_result and hasattr(question_result,
                                           'answerForConclusion') and question_result.answerForConclusion:
                completed_problems += 1

    # Count hypothesis analyses
    if result and result.hypothesisResultDict:
        total_hypotheses = len(result.hypothesisResultDict)
        for hypothesis_result in result.hypothesisResultDict.values():
            if hypothesis_result and hasattr(hypothesis_result,
                                             'answerForConclusion') and hypothesis_result.answerForConclusion:
                completed_hypotheses += 1

    # Create overview table
    overview_headers = ["Metric", "Count", "Status"]
    overview_rows = [
        ["Total Problems", str(total_problems), f"{completed_problems}/{total_problems} Analyzed"],
        ["Total Hypotheses", str(total_hypotheses), f"{completed_hypotheses}/{total_hypotheses} Analyzed"],
        ["Challenge Title", challenge.title, "📋 Active"],
        ["Analysis Status", getattr(simulation_result, 'environmentStatus', 'In Progress'), "🔄 Processing"]
    ]

    md.append_table(overview_headers, overview_rows)


def _add_key_insights(md: MarkdownDocument, challenge: BusinessChallengeWithProblems, result: ChallengeAnalysisResult):
    """Add key insights"""
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
    """Add hypothesis analysis details"""
    if result and result.hypothesisResultDict:
        analysis_found = False
        
        for problem in challenge.problems or []:
            problem = BusinessProblemWithHypotheses.model_validate(problem)
            
            # Show hypothesis analyses under this problem
            for hypothesis in problem.hypotheses or []:
                hypothesis = HypothesisWithMetrics.model_validate(hypothesis)
                hypothesis_result = result.hypothesisResultDict.get(hypothesis.id)
                analysis_found = True
                
                md.append_text(f"**🧪 Problem:** {problem.title}")
                md.append_text(f"**📋 Hypothesis:** {hypothesis.description}")
                
                if hypothesis_result:
                    # Extract conclusion text
                    if hasattr(hypothesis_result, 'answerForConclusion') and hypothesis_result.answerForConclusion:
                        result_text = hypothesis_result.answerForConclusion
                    else:
                        result_text = "Analysis completed"
                    
                    # Extract AnalysisData information
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
            # Add detailed AnalysisData content
            md.append_text("\n**Detailed Analysis Data:**")
            _add_detailed_analysis_data(md, result, challenge)
        else:
            md.append_text("*No hypothesis analysis data available.*")
    else:
        md.append_text("*No hypothesis analysis data available.*")


def _add_further_analysis(md: MarkdownDocument, challenge: BusinessChallengeWithProblems,
                          result: ChallengeAnalysisResult):
    """Add recommended further analysis"""
    # Prefer using futureAnalysisForConclusion
    # Split and format analysis suggestions line by line
    # Remove possible bullet point symbols
    # Provide default recommended analysis
    if result and result.challengeInsightResult:
        future_analysis = getattr(result.challengeInsightResult, 'futureAnalysisForConclusion', None) or \
                          getattr(result.challengeInsightResult, 'futureAnalysis', None)

        if future_analysis:
            md.append_text("### **🔍 Recommended Next Steps for Analysis:**")
            analysis_lines = future_analysis.split('\n')
            for i, line in enumerate(analysis_lines, 1):
                line = line.strip()
                if line:
                    # Remove possible bullet point symbols
                    if line.startswith('-') or line.startswith('•'):
                        line = line[1:].strip()
                    md.append_text(f"**{i}.** ***{line}***")
        else:
            md.append_text("*Further analysis recommendations will be generated upon completion.*")
    else:
        # Provide default recommended analyses
        md.append_text("**Based on current analysis, we recommend:**")
        md.append_text("**1.** Review and validate key findings with stakeholders.")
        md.append_text("**2.** Gather additional data to support key findings.")
        md.append_text("**3.** Conduct deeper analysis on high-impact metrics.")


def _add_business_actions(md: MarkdownDocument, challenge: BusinessChallengeWithProblems,
                          result: ChallengeAnalysisResult):
    """Add next business actions"""
    # Prefer using futureBusinessActionForConclusion
    # Split and format business actions by line
    # Remove possible bullet point symbols
    # Provide default business actions
    if result and result.challengeInsightResult:
        business_action = getattr(result.challengeInsightResult, 'futureBusinessActionForConclusion', None) or \
                          getattr(result.challengeInsightResult, 'futureBusinessAction', None)

        if business_action:
            md.append_text("### **🚀 Recommended Business Actions:**")
            business_actions = business_action.split('\n')
            action_count = 1
            for action in business_actions:
                action = action.strip()
                if action:
                    # Remove possible bullet point symbols
                    if action.startswith('-') or action.startswith('•'):
                        action = action[1:].strip()
                    md.append_text(f"## **{action_count}️⃣ {action}**")
                    action_count += 1
        else:
            md.append_text("*Business action recommendations will be generated upon completion.*")
    else:
        # Provide default business actions
        md.append_text("### **🚀 Recommended Business Actions:**")
        md.append_text("## **1️⃣ Implement Data-Driven Strategies**")
        md.append_text("   • ***Apply insights from completed analysis to business operations.***")
        md.append_text("## **2️⃣ Monitor Key Metrics**")
        md.append_text("   • ***Establish tracking mechanisms for identified success indicators.***")
        md.append_text("## **3️⃣ Iterate and Improve**")
        md.append_text("   • ***Continuously refine strategies based on performance data.***")


def _add_evaluation_results(md: MarkdownDocument, result: ChallengeAnalysisResult):
    """Add evaluation results"""
    if result and hasattr(result, 'evaluation') and result.evaluation:
        md.append_text("### **📊 Overall Analysis Evaluation:**")

        # Create evaluation results table
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
    """Add one-sentence summary"""
    if result and result.challengeInsightResult and result.challengeInsightResult.answerForConclusion:
        # Extract conclusion's first sentence as summary
        conclusion = result.challengeInsightResult.answerForConclusion
        summary = conclusion.split('.')[0] + '.' if '.' in conclusion else conclusion
        md.append_text(f"> ## **🎯 Key Takeaway:** ***{summary}***")
    else:
        md.append_text(
            f"> ## **🎯 Key Takeaway:** ***{challenge.title} analysis provides actionable insights for data-driven business decisions.***")


def _add_detailed_analysis_data(md: MarkdownDocument, result: ChallengeAnalysisResult,
                                challenge: BusinessChallengeWithProblems = None):
    """Add detailed AnalysisData content"""
    # Add hypothesis title as sub-heading
    # Display data explanations
    # If only one explanation, display in text format
    # Get hypothesis validation info
    # Build validation status display
    # Get key metric changes
    # Get summary findings
    # Add separator (except the last one)
    # Display analysis metrics
    # Validate and convert metric object
    # Build display name
    # Extract dataset information
    # Check dataset structure
    # If data present, show rows and columns
    # Try to get dataset name or ID
    # Extract dimensions info
    # Limit to first 3 dimensions
    # Handle exceptions
    # Add separator
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

            # Add hypothesis title as sub-heading
            hypothesis_title = hypothesis_id_to_title.get(hypothesis_id, hypothesis_id)
            display_title = hypothesis_title
            md.append_text(f"\n### **🧪 Hypothesis: {display_title}**")

            

            # Display data explanations
            if hasattr(hypothesis_result, 'data_explain_dict') and hypothesis_result.data_explain_dict:
                md.append_text("\n### 📋 Data Explanations")
                md.append_text("")

                # If only one explanation, display in text format
                if len(hypothesis_result.data_explain_dict) == 1:
                    explain = hypothesis_result.data_explain_dict[0]
                    try:
                        if isinstance(explain, dict):
                            explain = DataExplain.model_validate(explain)

                        # Get hypothesis validation info
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

                # If multiple explanations, use improved display format
                else:
                    for i, explain in enumerate(hypothesis_result.data_explain_dict, 1):
                        try:
                            if isinstance(explain, dict):
                                explain = DataExplain.model_validate(explain)

                            md.append_text(f"#### 📄 Explanation {i}")
                            md.append_text("")

                            # Get hypothesis validation info
                            validation = explain.hypothesisValidation
                            validation_flag = explain.hypothesisValidationFlag

                            # Build validation status display
                            md.append_text("**🔍 Validation Status:**")
                            if validation_flag is not None:
                                status_icon = "✅" if validation_flag else "❌"
                                md.append_text(f"> {status_icon} {validation}")
                            else:
                                md.append_text(f"> ⏳ {validation}")
                            md.append_text("")

                            # Get key metric changes
                            key_metric = explain.keyMetricChange
                            md.append_text("**📊 Key Metric Changes:**")
                            md.append_text(f"> {key_metric}")
                            md.append_text("")

                            # Get summary findings
                            summary = explain.summaryFinding
                            md.append_text("**📝 Summary Findings:**")
                            md.append_text(f"> {summary}")

                            # Add separator (except the last one)
                            if i < len(hypothesis_result.data_explain_dict):
                                md.append_text("")
                                md.append_text("---")
                                md.append_text("")

                        except Exception as e:
                            md.append_text(f"#### ❌ Explanation {i} - Error")
                            md.append_text(f"> Error parsing explanation: {str(e)}")
                            md.append_text("")

            # Display analysis metrics
            if hasattr(hypothesis_result, 'analysis_metrics') and hypothesis_result.analysis_metrics:
                md.append_text("\n#### **📊 Analysis Metrics:**")
                metrics_headers = ["Metric Name", "Dimensions", "Dataset"]
                metrics_rows = []

                for metric in hypothesis_result.analysis_metrics:
                    try:
                        # Validate and convert metric object
                        if isinstance(metric, dict):
                            metric = AnalysisMetric.model_validate(metric)

                        metric_name = getattr(metric, 'name', 'Unknown Metric') or 'Unknown Metric'
                        metric_category = getattr(metric, 'category', 'General') or 'General'

                        # Build display name
                        display_name = f"{metric_name} ({metric_category})" if metric_name != 'Unknown Metric' else metric_category

                        # Extract dataset information
                        dataset_info = "No dataset"
                        if hasattr(metric, 'dataset') and metric.dataset:
                            dataset = metric.dataset
                            if hasattr(dataset, 'dataset') and dataset.dataset:
                                # Check dataset structure
                                dataset_obj = dataset.dataset
                                if isinstance(dataset_obj, dict):
                                    # If data, display data rows and columns
                                    if 'data' in dataset_obj and 'column_names' in dataset_obj:
                                        data_rows = len(dataset_obj['data']) if dataset_obj['data'] else 0
                                        columns = len(dataset_obj['column_names']) if dataset_obj['column_names'] else 0
                                        dataset_info = f"{data_rows} rows, {columns} cols"
                                    else:
                                        dataset_info = "Dataset structure available"
                                else:
                                    # Try to get dataset name or ID
                                    dataset_name = getattr(dataset_obj, 'name', None) or getattr(dataset_obj, 'id',
                                                                                                 'Dataset available')
                                    dataset_info = str(dataset_name)[:30] + "..." if len(
                                        str(dataset_name)) > 30 else str(dataset_name)
                            else:
                                dataset_info = "Dataset configured"

                        # Extract dimensions info
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
                                dimensions_info = ", ".join(dim_names[:3])  # Limit dimensions to first 3
                                if len(metric.dimensions) > 3:
                                    dimensions_info += f" (+{len(metric.dimensions) - 3} more)"
                            else:
                                dimensions_info = f"{len(metric.dimensions)} dimension(s)"

                        metrics_rows.append([display_name, dimensions_info, dataset_info])
                    except Exception as e:
                        # Handle exception
                        metrics_rows.append(["Error parsing metric", "N/A", str(e)[:30] + "..."])

                if metrics_rows:
                    md.append_table(metrics_headers, metrics_rows)
                else:
                    md.append_text("  • No detailed metrics available")
            # Add separator
            md.append_text("---")

    if not analysis_data_found:
        md.append_text("*No detailed analysis metrics or data explanations found in hypothesis results.*")


# ===== Data details and statistics functions =====

# ===== Detailed metrics data functions =====

def _add_detailed_dataset_table(md: MarkdownDocument, dataset_obj: dict, metric_name: str):
    """Add detailed dataset table and statistical summary"""
    if not dataset_obj or 'data' not in dataset_obj or 'column_names' not in dataset_obj:
        return

    data = dataset_obj['data']
    column_names = dataset_obj['column_names']

    if not data or not column_names:
        return

    md.append_text(f"\n**📊 Dataset Details for {metric_name}:**")

    # Show data table (limit to first 20 rows to avoid too long)
    display_rows = data[:20] if len(data) > 20 else data
    md.append_table(column_names, display_rows)

    if len(data) > 20:
        md.append_text(f"*Showing first 20 rows of {len(data)} total rows...*")

    # Generate statistical summary
    md.append_text("\n**📈 Statistical Summary:**")
    stats_headers = ["Column", "Data Type", "Unique Values", "Sample Values"]
    stats_rows = []

    for i, col_name in enumerate(column_names):
        # Extract all values of this column
        col_values = [row[i] if i < len(row) else None for row in data if row]
        col_values = [v for v in col_values if v is not None]  # Filter None values

        if not col_values:
            stats_rows.append([col_name, "No Data", "0", "N/A"])
            continue

        # Determine data type
        sample_value = col_values[0]
        if isinstance(sample_value, (int, float)):
            data_type = "Numeric"
            unique_count = len(set(col_values))
            # For numeric data, show statistics
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
            # For date time, show range
            try:
                sorted_dates = sorted(set(col_values))
                sample_info = f"From: {sorted_dates[0][:10]} To: {sorted_dates[-1][:10]}"
            except:
                sample_info = str(col_values[:2])[:30] + "..."
        else:
            data_type = "Text/Other"
            unique_count = len(set(str(v) for v in col_values))
            # Show first few unique values
            unique_vals = list(set(str(v) for v in col_values))[:3]
            sample_info = ", ".join(unique_vals)[:30] + ("..." if len(unique_vals) > 3 else "")

        stats_rows.append([col_name, data_type, str(unique_count), sample_info])

    md.append_table(stats_headers, stats_rows)

    # Add overall statistics
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
    """Add dataset details"""
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

                        # Get dataset name
                        dataset_name = getattr(dataset, 'name', None) or getattr(dataset, 'id',
                                                                                 f"Dataset for {hypothesis_id[:20]}")
                        md.append_text(f"\n**Dataset: {dataset_name}**")

                        # Extract dataset properties
                        dataset_headers = ["Property", "Value"]
                        dataset_rows = []

                        # Common dataset properties
                        properties = ['source', 'rows_count', 'columns_count', 'time_range', 'description']
                        for prop in properties:
                            if hasattr(dataset, prop):
                                value = getattr(dataset, prop)
                                if value is not None:
                                    # Format display value
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
    """Add key data points"""
    # Basic statistics
    md.append_text("**📋 Basic Information:**")
    md.append_text(f"> **Challenge Title:** {challenge.title}")
    md.append_text(f"> **Total Problems:** {len(challenge.problems) if challenge.problems else 0}")
    md.append_text(f"> **Analysis Status:** {getattr(simulation_result, 'environmentStatus', 'In Progress')}")
    md.append_text("")

    # Extract key metrics from hypothesis results
    if result and result.hypothesisResultDict:
        completed_hypotheses = 0
        total_metrics = 0
        total_data_points = 0

        for hypothesis_id, hypothesis_result in result.hypothesisResultDict.items():
            if hypothesis_result and hasattr(hypothesis_result,
                                             'answerForConclusion') and hypothesis_result.answerForConclusion:
                completed_hypotheses += 1

            # Summarize AnalysisData content
            if hypothesis_result:
                if hasattr(hypothesis_result, 'analysis_metrics') and hypothesis_result.analysis_metrics:
                    total_metrics += len(hypothesis_result.analysis_metrics)
                if hasattr(hypothesis_result, 'data_explain_dict') and hypothesis_result.data_explain_dict:
                    total_data_points += len(hypothesis_result.data_explain_dict)

        # Add completion rate
        completion_rate = f"{(completed_hypotheses / len(result.hypothesisResultDict) * 100):.1f}%" if result.hypothesisResultDict else "0%"
        
        md.append_text("**📊 Analysis Statistics:**")
        md.append_text(f"> **Total Hypotheses:** {len(result.hypothesisResultDict)}")
        md.append_text(f"> **Completed Hypotheses:** {completed_hypotheses}")
        md.append_text(f"> **Completion Rate:** {completion_rate}")
        md.append_text(f"> **Total Analysis Metrics:** {total_metrics}")
        md.append_text(f"> **Total Data Explanations:** {total_data_points}")
        md.append_text("")

    # Add time information
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    md.append_text("**⏰ Report Information:**")
    md.append_text(f"> **Report Generated:** {current_time}")


