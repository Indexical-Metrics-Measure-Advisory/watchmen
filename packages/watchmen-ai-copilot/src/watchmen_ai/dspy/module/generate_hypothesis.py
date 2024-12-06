from typing import List

import dspy

from watchmen_ai.dspy.model.data_story import HypothesisForDspy

dataset = """
Name	Type	Label	Enumeration	Default Value	Encryption & Mask	Description
AFYC	NUMBER	AFYC (HKD)			None	
AFYP	NUMBER	AFYP (HKD)			None	
application_date	DATETIME	Application Date			None	
bank_code	ENUM	Bank Code			None	
branch_code	ENUM	Branch Code			None	
incentive_programs	ENUM	Incentive Programs			None	
issue_date	DATETIME	Issue Date			None	
plan_code	ENUM	Basic Plan Code			None	
policy_no	TEXT	Policy No.			None	
policy_status	ENUM	Policy Status			None	
product_group	ENUM	Product Group			None	
submission_date	DATETIME	Submission Date			None	
tr_code	ENUM	TR Code			None	

"""

analysis_method = """
Trend Analysis,Distribution Analysis,Comparison Analysis,Relationship Analysis,Composition Analysis,t-test,ANOVA,Regression Analysis,Correlation Analysis
"""


class HypothesisSignature(dspy.Signature):
    """generate hypothesis (pls ref analysis_method for generate evidence and result) for business question base on context ,dataset and sub question """

    sub_question = dspy.InputField(desc="sub business question for insurance business  analysis")
    context = dspy.InputField(desc="main business question for this insurance analysis story")
    dataset = dspy.InputField(desc="column name of dataset which will be used to generate hypothesis")
    analysis_method = dspy.InputField(desc="analysis method for this insurance analysis")
    response: List[HypothesisForDspy] = dspy.OutputField(
        desc="this response will contain the hypothesis, and the number of  hypothesis should be 3-5")


class GenerateHypothesisModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(HypothesisSignature)

    def forward(self, question, context):
        return self.model(sub_question=question, dataset=dataset, context=context, analysis_method=analysis_method)
