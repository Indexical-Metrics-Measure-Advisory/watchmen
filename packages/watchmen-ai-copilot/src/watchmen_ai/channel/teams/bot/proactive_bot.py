# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from typing import Dict

from botbuilder.core import ActivityHandler, TurnContext
from botbuilder.core.teams import TeamsInfo
from botbuilder.schema import ChannelAccount, ConversationReference, Activity


class ProactiveBot(ActivityHandler):
    def __init__(self, conversation_references: Dict[str, ConversationReference]):
        self.conversation_references = conversation_references

    async def on_conversation_update_activity(self, turn_context: TurnContext):
        self._add_conversation_reference(turn_context.activity)
        return await super().on_conversation_update_activity(turn_context)

    async def _show_members(
            self, turn_context: TurnContext
    ):
        # TeamsInfo.get_member: Gets the member of a team scoped conversation.
        member = await TeamsInfo.get_member(turn_context, turn_context.activity.from_property.id)

    async def on_members_added_activity(
            self, members_added: [ChannelAccount], turn_context: TurnContext
    ):
        # await self._show_members(turn_context)
        # print(members_adde)
        for member in members_added:

            print(member)
            print(turn_context.activity.recipient.id)
            if member.id != turn_context.activity.recipient.id:
                await turn_context.send_activity(
                    "Welcome to the Proactive Bot sample.  Navigate to "
                    "http://localhost:8900/api/notify to proactively message everyone "
                    "who has previously messaged this bot."
                )

    async def on_message_activity(self, turn_context: TurnContext):
        self._add_conversation_reference(turn_context.activity)
        return await turn_context.send_activity(
            f"You sent: {turn_context.activity.text}"
        )

    def _add_conversation_reference(self, activity: Activity):
        """
        This populates the shared Dictionary that holds conversation references. In this sample,
        this dictionary is used to send a message to members when /api/notify is hit.
        :param activity:
        :return:
        """
        conversation_reference = TurnContext.get_conversation_reference(activity)
        self.conversation_references[
            conversation_reference.user.id
        ] = conversation_reference
