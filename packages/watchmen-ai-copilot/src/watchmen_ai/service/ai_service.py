from langchain_core.exceptions import OutputParserException
from retry import retry
from watchmen_model.admin import Topic

from watchmen_ai.service.ai_engine import AIEngine
from watchmen_ai.task.generate_topic_factors import GenerateTopicFactorsAction, AdminGenerateContext


def get_ai_engine():
    return AIEngine()


@retry(exceptions=OutputParserException, tries=2, delay=1)
def generate_topic_factors(ai_model, data: Topic) -> Topic:
    ai_engine = get_ai_engine()

    action = GenerateTopicFactorsAction()

    context = AdminGenerateContext(nlp="domain name is {} and description is {}".format(data.name, data.description))

    result = ai_engine.run_action(action, ai_model,
                                  context)
    print(result)
    data.factors = result
    return data


def generate_factor_label_and_desc(ai_model, data: Topic):
    pass


def pii_identify(ai_model, data: Topic):
    pass
