import json
import os

from botbuilder.schema import Attachment

from watchmen_ai.channel.common.suggest_actions import suggest_action_service


async def create_adaptive_card_attachment():
    relative_path = os.path.abspath(os.path.dirname(__file__))
    path = os.path.join(relative_path, "../cards/welcomeCard.json")
    with open(path) as in_file:
        card = json.load(in_file)
        actions = await suggest_action_service.suggest_actions({}, "ice_breaker")
        merge_actions_to_card(actions, card)

    return Attachment(
        content_type="application/vnd.microsoft.card.adaptive", content=card
    )


def merge_actions_to_card(actions, card: dict):
    card["actions"] = []
    for action in actions:
        card["actions"].append(
            {
                "type": "Action.Submit",
                "title": action.name,
                "data": {"action": action.action},
                "tooltip": action.tooltip
            }
        )
