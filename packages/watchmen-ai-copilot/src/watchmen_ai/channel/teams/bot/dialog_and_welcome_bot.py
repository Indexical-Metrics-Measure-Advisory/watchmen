# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from botbuilder.core import (
    ConversationState,
    MessageFactory,
    UserState,
    TurnContext,
)
from botbuilder.dialogs import Dialog
from botbuilder.schema import ChannelAccount

from watchmen_ai.channel.teams.bot.dialog_bot import DialogBot
from watchmen_ai.channel.teams.helpers.welcome_card_helper import create_adaptive_card_attachment


class DialogAndWelcomeBot(DialogBot):
    def __init__(
            self,
            conversation_state: ConversationState,
            user_state: UserState,
            dialog: Dialog
    ):
        super(DialogAndWelcomeBot, self).__init__(
            conversation_state, user_state, dialog
        )

        # self._intent_recognizer = intent_recognizer
        self._init_dialog_id = dialog.id

    async def on_members_added_activity(
            self, members_added: [ChannelAccount], turn_context: TurnContext
    ):
        """
        Send a welcome message to the user and tell them what actions they may perform to use this bot
        """

        for member in members_added:
            if member.id != turn_context.activity.recipient.id:
                welcome_card = await create_adaptive_card_attachment()
                response = MessageFactory.attachment(welcome_card)
                await turn_context.send_activity(response)
