from botbuilder.core import MessageFactory
from botbuilder.dialogs import ComponentDialog, TextPrompt, WaterfallStepContext, DialogTurnResult, WaterfallDialog
from botbuilder.schema import InputHints


class BusinessQuestionDialog(ComponentDialog):
    def __init__(self):
        super(BusinessQuestionDialog, self).__init__(BusinessQuestionDialog.__name__)

        # self.add_dialog(booking_dialog)
        self.add_dialog(
            WaterfallDialog(
                "WFDialog", [self.ask_business_question, self.ask_dimension_question, self.show_analysis_options_step,
                             self.check_continue]
            )
        )

        self.initial_dialog_id = "WFDialog"

    async def ask_business_question(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        message_text = (
            str(step_context.options)
            if step_context.options
            else "What can I help you with today?"
        )
        prompt_message = MessageFactory.text(
            message_text, message_text, InputHints.expecting_input
        )

        return await step_context.prompt(
            TextPrompt.__name__, PromptOptions(prompt=prompt_message)
        )

    async def ask_dimension_question(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        message_text = (
            str(step_context.options)
            if step_context.options
            else "What can I help you with today?"
        )
        prompt_message = MessageFactory.text(
            message_text, message_text, InputHints.expecting_input
        )

        return await step_context.prompt(
            TextPrompt.__name__, PromptOptions(prompt=prompt_message)
        )

    async def show_analysis_options_step(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        # message_text = (
        #     str(step_context.options)
        #     if step_context.options
        #     else "What can I help you with today?"
        # )
        # prompt_message = MessageFactory.text(
        #     message_text, message_text, InputHints.expecting_input
        # )
        #
        # return await step_context.prompt(
        #     TextPrompt.__name__, PromptOptions(prompt=prompt_message)
        # )
        pass
