# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
import json

from botbuilder.core import MessageFactory, CardFactory, MemoryStorage, ConversationState
from botbuilder.dialogs import (
    ComponentDialog,
    WaterfallDialog,
    WaterfallStepContext,
    DialogTurnResult, Choice, ChoicePrompt, DialogTurnStatus,
)
from botbuilder.dialogs.prompts import TextPrompt, PromptOptions
from botbuilder.schema import HeroCard, Attachment, Activity

from watchmen_ai.channel.common.chart.chart_service import generate_chart_for_metric
from watchmen_ai.channel.common.suggest_actions import suggest_action_service
from watchmen_ai.channel.teams.helpers.activity_helper import build_metric_input_card, generate_image_card, \
    find_usage_actions

CHOICE_PROMPT = "CHOICE_PROMPT_METRIC"

memory_storage = MemoryStorage()
conversation_state = ConversationState(memory_storage)

# Define a property accessor
state_property_accessor = conversation_state.create_property("ConversationData")


class MetricsDialog(ComponentDialog):
    def __init__(self):
        super(MetricsDialog, self).__init__(MetricsDialog.__name__)

        self.add_dialog(TextPrompt(TextPrompt.__name__))

        self.add_dialog(ChoicePrompt(CHOICE_PROMPT))
        # self.add_dialog(booking_dialog)
        self.add_dialog(
            WaterfallDialog(
                "WFDialog",
                [self.ask_for_analysis_type, self.generate_form_for_business_target, self.perform_analysis_step]
            )
        )

        self.initial_dialog_id = "WFDialog"

    async def ask_for_analysis_type(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        business_target = step_context.options

        print("show_analysis_options_step", business_target)

        conversation_data = await state_property_accessor.get(step_context.context, dict)

        repeat = conversation_data.get("repeat", False)

        conversation_data["business_target"] = business_target




        # if repeat:
        #     message = MessageFactory.text(f"Please select one of the following options to proceed:")
        # else:
        #     message = MessageFactory.text(
        #         f'You have chosen: "{business_target.text}". '
        #         f'\n\nThis analysis aims to evaluate the impact of promotional activities on key performance indicators (KPIs) such as Annualized First Year Premium (AFYP), Annualized First Year Commission (AFYC), and the average premium by comparing data across three periods: before, during, and after the promotion. The segmentation includes sales channels, product types, and various plan details, allowing for a detailed breakdown of performance.'
        #         f'\n\nTip: Simply reply with the number to make your selection.')

        print("ask_for_analysis_type")

        card_json =  find_usage_actions()

        card_attachment = Attachment(
            content_type="application/vnd.microsoft.card.adaptive",
            content=card_json
        )

        await step_context.context.send_activity(
            Activity(
                attachments=[card_attachment]
            )
        )


        return DialogTurnResult(status=DialogTurnStatus.Waiting)



        # ## todo generate base on graph content and business target
        #
        # actions = suggest_action_service.suggested_metric_actions(business_target.text)
        # choices = []
        # for action in actions:
        #     choice = Choice(action.name)
        #     choices.append(choice)
        #
        # # Provide analysis options
        # return await step_context.prompt(
        #     CHOICE_PROMPT,
        #     PromptOptions(
        #         prompt=message,
        #         choices=choices
        #     )
        # )

    async def generate_form_for_business_target(self, step_context: WaterfallStepContext) -> DialogTurnResult:

        print("generate_form_for_business_target")

        action  = step_context.context.activity.value

        print("action", action)

        card_json = await build_metric_input_card()

        card_attachment = Attachment(
            content_type="application/vnd.microsoft.card.adaptive",
            content=json.loads(card_json)
        )

        # Send the adaptive card as a message
        await step_context.context.send_activity(
            Activity(
                attachments=[card_attachment]
            )
        )

        return DialogTurnResult(status=DialogTurnStatus.Waiting)


    async def perform_analysis_step(self, step_context: WaterfallStepContext) -> DialogTurnResult:
        turn_context = step_context.context



        if turn_context.activity.value and 'action' in turn_context.activity.value:
            if turn_context.activity.value['action'] == 'submitFeedback':
                # Extract form values
                name = turn_context.activity.value.get('name')
                email = turn_context.activity.value.get('email')
                rating = turn_context.activity.value.get('rating')
                feedback = turn_context.activity.value.get('feedback')

                # Process the form data (e.g., store it, log it, etc.)
                response = f"Thanks, {name}! We received your feedback:\n" \
                           f"Email: {email}\n" \
                           f"Rating: {rating}\n" \
                           f"Feedback: {feedback}"



                encode_image = generate_chart_for_metric(turn_context.activity.value)

                card_attachment = Attachment(
                    content_type="application/vnd.microsoft.card.adaptive",
                    content=generate_image_card(encode_image)
                )

                await step_context.context.send_activity(
                    Activity(
                        attachments=[card_attachment]
                    )
                )

        # TODO add end of analysis button

        print("perform_analysis_step")
        # selected_option = step_context.result.value

        # if selected_option == "View summary report":
        #     await step_context.context.send_activity("Here is your summary report:")
        #     await step_context.context.send_activity(self.generate_summary_report_card())
        # elif selected_option == "View detailed breakdown by product":
        #     await step_context.context.send_activity("Here is the product performance breakdown:")
        #     await step_context.context.send_activity(self.generate_product_breakdown_card())
        # elif selected_option == "Check sales by channel":
        #     await step_context.context.send_activity("Here are the sales numbers by channel:")
        #     await step_context.context.send_activity(self.generate_sales_by_channel_card())
        # elif selected_option == "Request AI-powered insights":
        #     await step_context.context.send_activity("Let me generate AI-powered insights based on your data.")
        #     await step_context.context.send_activity(self.generate_ai_insights())
        # elif selected_option == "End Of Analysis":
        #     await step_context.context.send_activity("End of analysis.")
        #     return await step_context.end_dialog()
        # else:
        #     await step_context.context.send_activity("I did not understand your choice. Please try again.")

        conversation_data = await state_property_accessor.get(step_context.context, dict)

        conversation_data["repeat"] = True

        return await step_context.replace_dialog(MetricsDialog.__name__, conversation_data["business_target"])




    # Helper: Generate a summary report card
    def generate_summary_report_card(self):
        card = HeroCard(
            title="Sales Summary Report",
            text="Total Sales: $10,500,000\nTotal Policies Sold: 3,250\nAverage Premium: $3,230"
        )
        return MessageFactory.attachment(CardFactory.hero_card(card))

    # Helper: Generate product breakdown card
    def generate_product_breakdown_card(self):
        card = HeroCard(
            title="Product Breakdown",
            text="1. Product A: $4,500,000, Policies Sold: 1,200\n2. Product B: $2,300,000, Policies Sold: 850\n3. Product C: $1,800,000, Policies Sold: 500"
        )
        return MessageFactory.attachment(CardFactory.hero_card(card))

    # Helper: Generate sales by channel card
    def generate_sales_by_channel_card(self):
        card = HeroCard(
            title="Sales by Channel",
            text="Bank Channel: $6,200,000\nAgent Channel: $4,300,000\nOnline Channel: $500,000"
        )
        return MessageFactory.attachment(CardFactory.hero_card(card))

    # Helper: Generate AI insights
    def generate_ai_insights(self):
        markdown_str = f"""
        # My Markdown Document

        **Hello!** This is a sample markdown document.

        ## List of Items
        - Item 1
        - Item 2
        - Item 3

        ## Numbered List
        1. First item
        2. Second item

        ## Link
        [Click here](https://example.com)

        ## Image
        ![Alt text](https://via.placeholder.com/150)

        ## Conclusion
        This concludes the example of Markdown formatting in Python.
        """
        return MessageFactory.text(markdown_str)
