# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
import traceback
import uuid
from datetime import datetime
from http import HTTPStatus
from typing import Dict

import sys
from botbuilder.core import (
    TurnContext, MemoryStorage, UserState, ConversationState,
)
from botbuilder.integration.aiohttp import CloudAdapter, ConfigurationBotFrameworkAuthentication
from botbuilder.schema import Activity, ActivityTypes, ConversationReference
from fastapi import Request, Response, APIRouter

from watchmen_ai.channel.teams.bot.dialog_and_welcome_bot import DialogAndWelcomeBot
from watchmen_ai.channel.teams.config import DefaultConfig
from watchmen_ai.channel.teams.dialog.main_dialog import MainDialog
from watchmen_ai.channel.teams.dialog.metrics_dialog import MetricsDialog
from watchmen_ai.channel.teams.dialog.objective_dialog import ObjectiveDialog
from watchmen_ai.channel.teams.dialog.report_dialog import ReportDialog
from watchmen_ai.channel.teams.helpers.intent_recognizer import IntentRecognizer

CONFIG = DefaultConfig()

router = APIRouter()

# Create adapter.
# See https://aka.ms/about-bot-adapter to learn more about how bots work.
# SETTINGS = BotFrameworkAdapterSettings(CONFIG.APP_ID, CONFIG.APP_PASSWORD)
# ADAPTER = BotFrameworkAdapter(SETTINGS)

ADAPTER = CloudAdapter(ConfigurationBotFrameworkAuthentication(CONFIG))

MEMORY = MemoryStorage()
USER_STATE = UserState(MEMORY)
CONVERSATION_STATE = ConversationState(MEMORY)

CONVERSATION_REFERENCES: Dict[str, ConversationReference] = dict()
intent_recognizer = IntentRecognizer()
metrics_dialog = MetricsDialog()

objective_dialog = ObjectiveDialog(metrics_dialog=metrics_dialog)
report_dialog = ReportDialog()
main_dialog = MainDialog(intent_recognizer, objective_dialog, report_dialog)
BOT = DialogAndWelcomeBot(CONVERSATION_STATE, USER_STATE, main_dialog)


# Catch-all for errors.
async def on_error(context: TurnContext, error: Exception):
    # This check writes out errors to console log .vs. app insights.
    # NOTE: In production environment, you should consider logging this to Azure
    #       application insights.
    print(f"\n [on_turn_error] unhandled error: {error}", file=sys.stderr)
    traceback.print_exc()

    # Send a message to the user
    await context.send_activity("The bot encountered an error or bug.")
    await context.send_activity(
        "To continue to run this bot, please fix the bot source code."
    )
    # Send a trace activity if we're talking to the Bot Framework Emulator
    if context.activity.channel_id == "emulator":
        # Create a trace activity that contains the error object
        trace_activity = Activity(
            label="TurnError",
            name="on_turn_error Trace",
            timestamp=datetime.utcnow(),
            type=ActivityTypes.trace,
            value=f"{error}",
            value_type="https://www.botframework.com/schemas/error",
        )
        # Send a trace activity, which will be displayed in Bot Framework Emulator
        await context.send_activity(trace_activity)


ADAPTER.on_turn_error = on_error
APP_ID = CONFIG.APP_ID if CONFIG.APP_ID else uuid.uuid4()


# Create the Bot


# Listen for incoming requests on /api/messages
@router.post("/api/messages", response_model=None)
async def messages(req: Request) -> Response:
    ## build welcome message

    return await ADAPTER.process(req, BOT)


@router.get("/api/notify")
async def notify(req: Request) -> Response:  # pylint: disable=unused-argument
    await _send_proactive_message()
    return Response(status_code=HTTPStatus.OK)


# Send a message to all conversation members.
# This uses the shared Dictionary that the Bot adds conversation references to.
async def _send_proactive_message():
    for conversation_reference in CONVERSATION_REFERENCES.values():
        await ADAPTER.continue_conversation(
            conversation_reference,
            lambda turn_context: turn_context.send_activity("proactive hello"),
            APP_ID,
        )
