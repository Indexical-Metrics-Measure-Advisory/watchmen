from botbuilder.dialogs import WaterfallDialog, WaterfallStepContext, ComponentDialog, TextPrompt, DialogTurnResult, \
    DialogTurnStatus
from botbuilder.schema import Activity, ActivityTypes, SuggestedActions, CardAction, ActionTypes

from watchmen_ai.channel.common.suggest_actions import suggest_action_service

TEXT_PROMPT = "RP_TEXT_PROMPT"
WATERFALL_DIALOG = "Report_WF_dialog"


class ReportDialog(ComponentDialog):
    def __init__(self, dialog_id: str = "REPORT_DIALOG"):
        super(ReportDialog, self).__init__(dialog_id or ReportDialog.__name__)
        self.add_dialog(TextPrompt(TEXT_PROMPT))
        self.add_dialog(WaterfallDialog("WaterfallDialog", [self.suggest_action_step, self.process_action_step]))

        self.initial_dialog_id = "WaterfallDialog"

    async def suggest_action_step(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        # Create the activity with suggested actions

        mock_actions = suggest_action_service.mock_report_action()
        suggestion_actions = []
        for action in mock_actions:
            suggestion_actions.append(CardAction(
                title=action.name,
                type=ActionTypes.im_back,
                value=action.action
            ))

        reply = Activity(
            type=ActivityTypes.message,
            text="Please choose an option:",
            suggested_actions=SuggestedActions(
                actions=suggestion_actions
            )
        )

        # Send the activity with suggested actions
        await step_context.context.send_activity(reply)

        return DialogTurnResult(status=DialogTurnStatus.Waiting)

    async def process_action_step(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        # Capture the user's response
        user_choice = step_context.context.activity.text

        # Process the response based on the user's selection
        if user_choice == "Option 1":

            await step_context.context.send_activity("You selected Option 1.")
        elif user_choice == "Option 2":
            await step_context.context.send_activity("You selected Option 2.")
        else:
            await step_context.context.send_activity("Invalid option selected.")

        # End the dialog after processing
        return await step_context.end_dialog()
