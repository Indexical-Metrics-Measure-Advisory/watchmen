import json
from typing import List

from botbuilder.core import MessageFactory
from botbuilder.dialogs import (
    ComponentDialog,
    WaterfallDialog,
    WaterfallStepContext,
    DialogTurnResult,
    TextPrompt,
    ChoicePrompt,
    PromptOptions, DialogTurnStatus
)
from botbuilder.schema import CardAction, ActionTypes, ActivityTypes, Activity, SuggestedActions

from watchmen_ai.channel.teams.dialog.metrics_dialog import MetricsDialog
from watchmen_ai.channel.teams.model.objective_analysis_details import ObjectiveAnalysisDetails
from watchmen_ai.knowledge_base.vector.lancedb.storage_service import lancedb_service, ObjectiveVector

FIND_MORE = "find_more"

# Define dialog ids and prompt names
ANALYSIS_DIALOG = "ANALYSIS_DIALOG"
WATERFALL_DIALOG = "WATERFALL_DIALOG"
TEXT_PROMPT = "TEXT_PROMPT"
CHOICE_PROMPT = "CHOICE_PROMPT"


class ObjectiveDialog(ComponentDialog):
    def __init__(self, dialog_id: str = ANALYSIS_DIALOG, metrics_dialog: MetricsDialog = None):
        super(ObjectiveDialog, self).__init__(dialog_id)

        # Add dialogs to the waterfall steps
        self.add_dialog(TextPrompt(TEXT_PROMPT))
        self.add_dialog(ChoicePrompt(CHOICE_PROMPT))
        self.add_dialog(metrics_dialog)
        self.add_dialog(WaterfallDialog(WATERFALL_DIALOG, [
            self.ask_business_target,
            self.confirm_business_target,
            self.show_analysis_options_step
        ]))

        self._metrics_dialog_id = metrics_dialog.id
        self.initial_dialog_id = WATERFALL_DIALOG

    async def ask_business_target(self, step_context: WaterfallStepContext):
        print("find_business_target")

        objective_details: ObjectiveAnalysisDetails = step_context.options

        if objective_details.business_target is None:
            return await step_context.prompt(
                TEXT_PROMPT,
                PromptOptions(prompt=MessageFactory.text(
                    "Which analysis would you like to dive into today? You can explore options such as Sales, Product Performance, or Channel Breakdown. Feel free to specify if you have another analysis in mind!"))
            )

        return await step_context.next(objective_details.business_target)

    async def confirm_business_target(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        # TODO provide a list of options for the user to choose from

        user_objective = step_context.result

        actuals: List[ObjectiveVector] = await lancedb_service.search_by_label(user_objective, "Objective")

        suggestion_actions = []
        for actual in actuals:
            suggestion_actions.append(CardAction(
                title=actual.text,
                type=ActionTypes.post_back,
                value=actual.json()
            ))

        suggestion_actions.append(CardAction(
            title="Find More Analysis",
            type=ActionTypes.post_back,
            value=FIND_MORE
        ))

        reply = Activity(
            type=ActivityTypes.message,
            text=f'Great! Based on your request for a {user_objective}, I’ve identified a few options that might interest you:',
            suggested_actions=SuggestedActions(
                actions=suggestion_actions
            )
        )
        await step_context.context.send_activity(reply)
        return DialogTurnResult(status=DialogTurnStatus.Waiting)

    async def show_analysis_options_step(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        input_value = step_context.context.activity.text

        if type(input_value) == str and input_value.lower() == FIND_MORE:
            return await step_context.begin_dialog(self.initial_dialog_id, ObjectiveAnalysisDetails())
        else:
            objective = ObjectiveVector.parse_obj(json.loads(step_context.context.activity.text))
            return await step_context.begin_dialog(self._metrics_dialog_id, objective)
