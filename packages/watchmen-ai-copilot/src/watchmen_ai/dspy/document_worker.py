import os
from typing import Dict

import dspy
from pydantic import BaseModel

from watchmen_ai.dspy.event.knowledge_base_events import knowledge_graph_inserted
from watchmen_ai.dspy.model.objective_document import ObjectiveDocument, MetricNode
from watchmen_ai.dspy.model.watchmen_document import WatchmenDocument
from watchmen_ai.dspy.module.content_verification import ContentVerification, Verification
from watchmen_ai.dspy.module.metirc_ner import MetricNERMatch, MetricNER
from watchmen_ai.dspy.module.visualization_suggestion import VisualizationSuggestionModule
from watchmen_ai.dspy.test import lancedb_retriever
from watchmen_ai.dspy.tools.data_story_spliter import DataStorySpliter
from watchmen_ai.model.document import Document

os.environ["AZURE_API_KEY"] = "88dfc733a80a4825a46a380a5d878809"
os.environ["AZURE_API_BASE"] = "https://azure-insuremo-gpt4-openai.openai.azure.com"
os.environ["AZURE_API_VERSION"] = "2024-02-15-preview"

# load markdown upload_file
# lm = dspy.LM('azure/gpt_4o')
lm = dspy.LM('azure/gpt_4o_mini')

dspy.settings.configure(rm=lancedb_retriever, lm=lm)




check_rule = "check whether this document include objective ,business target , metrics for insurance domain"


class DocumentWorker:
    def __init__(self, document: Document, context, need_verification: bool = False):
        self.document = document
        self.need_verification = need_verification
        self.context = context

    def process(self):

        if self.need_verification:
            verify = ContentVerification()
            # Verify the content
            verification_result: Verification = verify.forward(question=check_rule, content=self.document.documentContent)
            print(verification_result.response)
            if not verification_result.response.verification_pass:
                self.document.verified = False
                return self.document

        # split the document into different parts based on the content
        split_document = self.split()

        if self.context_is_objective(split_document):
            objective_document: ObjectiveDocument = split_document
            ner = MetricNERMatch()
            vs = VisualizationSuggestionModule()

            #
            # objective_dict,all_metrics_dict = self.build_metric_dict_for_all_objective(objective_document)
            #
            # self.suggestion_visualization(all_metrics_dict, objective_document.dimensions,objective_dict.keys())

            for objective in objective_document.objectives:
                metrics_dict = self.build_metric_dict(objective.metrics)
                self.suggestion_visualization(metrics_dict, objective_document.dimensions, objective.description, vs)
                print("end suggestion")
                self.ner_metrics(metrics_dict, ner, objective)
                print("end ner")
                # objective.metrics = list(metrics_dict.values())

                # TODO if have rate metric , then add benchmark
                if self.benchmark_is_on():
                    pass
                    # benchmark = BenchmarkModule()
                    # benchmark.forward(metrics=objective.metrics)

            knowledge_graph_inserted.send(objective_document)
            return objective_document
        else:
            return split_document
        ## TODO send data and contenxt to integration signal

    def suggestion_visualization(self, metrics_dict, dimensions, context, vs):
        metric_suggestion_results = vs(content=metrics_dict.values(), dimensions=dimensions, context=context)
        for metric in metric_suggestion_results.response:
            if metric.metric_name in metrics_dict:
                metrics_dict[metric.metric_name].visualization = metric.suggestion
                metrics_dict[metric.metric_name].reason = metric.reason
                metrics_dict[metric.metric_name].dimensions = metric.suggestion_dimensions

    def ner_metrics(self, metrics_dict, ner, objective):
        if self.ner_is_on():
            ner_result: MetricNER = ner(content=objective.description, context=objective.objective_name)

            # TODO find dimension and metric from objective and suggestion how to visualize
            metric_results = ner_result.response.match_results
            for metric in metric_results:
                if metric.metric_name not in metrics_dict:
                    metrics_dict[metric.metric_name] = MetricNode(name=metric.metric_name)

    def build_metric_dict(self, metric_results):
        metric_dict = {}
        for metric in metric_results:
            metric_dict[metric.name] = metric
        return metric_dict

    def build_metric_dict_for_all_objective(self, objective_document: ObjectiveDocument) -> Dict:
        objective_dict = {}
        all_metrics_dict = {}
        for objective in objective_document.objectives:
            metric_dict = {}
            for metric in objective.metrics:
                metric_dict[metric.name] = metric
                all_metrics_dict[metric.name] = metric

            objective_dict[objective.objective_name] = metric_dict

        return objective_dict, all_metrics_dict

    def split(self):
        return DataStorySpliter(self.document.content).split()

    def save(self):
        # Save the document
        pass

    def send_signal(self, context, data):
        # Send a signal
        pass

    def ner_is_on(self):
        return True

    def benchmark_is_on(self):
        return False

    def context_is_objective(self, document: WatchmenDocument) -> bool:

        if isinstance(document, ObjectiveDocument):
            return True
        else:
            return False


if __name__ == '__main__':
    path = "./doc/How Incentive Programs Improve Business Performance.md"
    with open(path, 'r') as fin:
        markdown = fin.read()
        document = Document(name="How Incentive Programs Improve Business Performance.md", documentContent=markdown)

        worker = DocumentWorker(document=document, context="insurance domain", need_verification=False)
        objective_document = worker.process()
        print(objective_document.json())