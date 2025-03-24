# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from botbuilder.core import MessageFactory, TurnContext
from botbuilder.dialogs import (
    ComponentDialog,
    WaterfallDialog,
    WaterfallStepContext,
    DialogTurnResult, ChoicePrompt,
)
from botbuilder.dialogs.prompts import TextPrompt, PromptOptions

from .objective_dialog import ObjectiveDialog
from .report_dialog import ReportDialog
from ..helpers.intent_recognizer import IntentRecognizer
from ..model.objective_analysis_details import ObjectiveAnalysisDetails
from ...common.chat_intent import MainIntent


class MainDialog(ComponentDialog):
    def __init__(
            self, intent_recognizer: IntentRecognizer, objective_dialog: ObjectiveDialog, report_dialog: ReportDialog
    ):
        super(MainDialog, self).__init__(MainDialog.__name__)

        self._intent_recognizer = intent_recognizer
        self._objective_dialog_id = objective_dialog.id
        self._report_dialog_id = report_dialog.id

        self.add_dialog(TextPrompt(TextPrompt.__name__))
        self.add_dialog(ChoicePrompt(ChoicePrompt.__name__))
        # self.add_dialog()
        self.add_dialog(objective_dialog)
        self.add_dialog(report_dialog)
        self.add_dialog(
            WaterfallDialog(
                "WFDialog", [self.intro_step, self.prompt_step, self.final_step]
            )
        )



        self.initial_dialog_id = "WFDialog"

    async def recognize_input(self, turn_context: TurnContext):
        if turn_context.activity.value and "action" in turn_context.activity.value:
            return turn_context.activity.value["action"]
        elif turn_context.activity.text:
            # return await self.search_intent(turn_context.activity.text)

            return None

    def search_intent(self, text):
        return self._intent_recognizer.recognize_intent(text)

    async def find_action_intent(self, action: str):
        if action == "connect_space":
            return MainIntent.analysis_dataset
        else:
            return MainIntent.analysis_objective

    async def welcome_step(self, step_context: WaterfallStepContext):

        # if first time user, send welcome message

        # if not first time user, send welcome back message

        pass

    async def intro_step(self, step_context: WaterfallStepContext) -> DialogTurnResult:

        print("intro_step")

        print("step_context", step_context.context.activity)

        intent = await self.recognize_input(step_context.context)

        print("intent", intent)

        if intent == MainIntent.analysis_objective:
            return await step_context.begin_dialog(self._objective_dialog_id, ObjectiveAnalysisDetails())

        elif intent == MainIntent.customize_report:
            return await step_context.begin_dialog(self._report_dialog_id)

        else:

            # await step_context.context.send_activity(prompt_message)
            return await step_context.prompt(
                TextPrompt.__name__,  # Using TextPrompt to capture the user's choice
                PromptOptions(prompt=MessageFactory.text("What can I help you with today?")),
            )

        return await step_context.next(None)

    async def prompt_step(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        print("prompt_step")
        user_response = step_context.result  # Capture the user input (e.g., option1, option2)
        print(user_response)
        return await step_context.next(None)

    async def final_step(self, step_context: WaterfallStepContext) -> DialogTurnResult:

        print("final_step")

        message = """
        Thank you for using the Data Insights Assistant! Feel free to return anytime for more insights.
        Have a great day!
        """

        await step_context.context.send_activity(MessageFactory.text(message))
        # if step_context.result is not None:
        #     result = step_context.result
        #
        #     # Now we have all the booking details call the booking service.
        #
        #     # If the call to the booking service was successful tell the user.
        #     # time_property = Timex(result.travel_date)
        #     # travel_date_msg = time_property.to_natural_language(datetime.now())
        #
        #     print("result", result)
        #     # msg_txt = f"I have you booked to {result.destination} from {result.origin} on {result.travel_date}"
        #     message = MessageFactory.text(result, result, InputHints.ignoring_input)
        #     await step_context.context.send_activity(message)

        # prompt_message = "What else can I do for you?"
        return await step_context.end_dialog()
