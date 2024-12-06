import os

import dspy

from watchmen_ai.dspy.module.metrics_finder import MetricsFinderModule
from watchmen_ai.dspy.test import lancedb_retriever

# turbo = dspy.OpenAI(model_type='chat')
# colbertv2_wiki17_abstracts = dspy.ColBERTv2(url='http://20.102.90.50:2017/wiki17_abstracts')
#
#
#
# os.environ["AZURE_API_KEY"] = "88dfc733a80a4825a46a380a5d878809"
# os.environ["AZURE_API_BASE"] = "https://azure-insuremo-gpt4-openai.openai.azure.com"
# os.environ["AZURE_API_VERSION"] = "2023-07-01-preview"

os.environ["AZURE_API_KEY"] = "88dfc733a80a4825a46a380a5d878809"
os.environ["AZURE_API_BASE"] = "https://azure-insuremo-gpt4-openai.openai.azure.com"
os.environ["AZURE_API_VERSION"] = "2024-02-15-preview"

# load markdown upload_file
lm = dspy.LM('azure/gpt_4o')
# lm = dspy.LM('azure/gpt_4o_mini')

dspy.settings.configure(rm=lancedb_retriever, lm=lm)

metrics_finder = MetricsFinderModule()

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


metrics = """
Name | Description
----|---
AFYC | Annualized First Year Commission
AFYP | Annualized First Year Premium
policies issued | Number of policies issued
"""


#
res = metrics_finder(evidence="We will compare the number of policies issued during periods with active incentive programs to periods without such programs.",
               hypothesis="Incentive programs increase the number of policies issued", dataset=dataset,metrics=metrics)


# res = metrics_finder(
#     evidence="We will perform a statistical test to compare the time taken from application date to issue date for policies with and without incentive programs.",
#     hypothesis="Incentive programs have no significant effect on the time taken from application date to issue date.",
#     dataset=dataset,metrics=metrics)

print(res.response)

# test = dspy.Predict('question: str -> response: str')
#
# test2 = dspy.ChainOfThought("question -> response")
#
# result = test(question="what is the difference between 100 and 0.1")
# print("-----------------")
# print(result.response)
#
# result2 = test2(question="what is the difference between 100 and 0.1")
#
# print("-----------------")
# print(result2.response)

# test = dspy.Predict('question: str -> response: str')


#
# with open("./doc/test.md", 'r') as fin:
#     markdown = fin.read()
#     verify = ContentVerification()
#
#     result = verify(question="check whether this document include objective ,business target , metrics for insurance domain", content=markdown)
#
#     print(result.response)
#


#
# vs = VisualizationSuggestionModule()
#
# print()
#
# metris = [
#     {
#       "metric_name": "AFYP",
#       "match_score": 1.0
#     },
#     {
#       "metric_name": "AFYC",
#       "match_score": 1.0
#     },
#     {
#       "metric_name": "policy count",
#       "match_score": 1.0
#     },
#     {
#       "metric_name": "policies sold",
#       "match_score": 1.0
#     }
#   ]
#
# vs(content=metris,context="insurance domain")


dspy.inspect_history(n=1)


#
#
# qa = dspy.Predict('question: str -> response: str')
#
#
# res = qa(question="what are high memory and low memory on linux?").response
#
#
#
# rag = RAG()
# rag(question="who is the winner for NBA 2000?")
#
# dspy.inspect_history(n=1)
