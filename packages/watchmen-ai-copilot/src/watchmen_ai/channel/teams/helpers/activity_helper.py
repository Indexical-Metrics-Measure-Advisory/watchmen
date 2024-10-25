# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
import asyncio
from datetime import datetime

from adaptivecardbuilder import AdaptiveCard, TextBlock, InputChoiceSet, ActionSubmit, ActionSet
from botbuilder.schema import (
    Activity,
    ActivityTypes,
    ChannelAccount,
    ConversationAccount,
)

mock_card = """
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "text": "You have chosen to analyze AFYP (Annualized First Year Premium) by Time Period.",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "Please select the dimension and time period you'd like to analyze:",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Choose Dimension:",
      "weight": "Bolder"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "dimensionChoice",
      "style": "expanded",
      "isMultiSelect": false,
      "choices": [
        {
          "title": "Sales Channel",
          "value": "sales_channel"
        },
        {
          "title": "Product Type",
          "value": "product_type"
        },
        {
          "title": "Customer Segment",
          "value": "customer_segment"
        },
        {
          "title": "Region",
          "value": "region"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Select Time Period:",
      "weight": "Bolder"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "dimensionChoice",
      "style": "expanded",
      "isMultiSelect": false,
      "choices": [
        {
          "title": "Month",
          "value": "month"
        },
        {
          "title": "Half Year",
          "value": "half_year"
        },
        {
          "title": "Quarter",
          "value": "quarter"
        }
        ,
        {
          "title": "Year",
          "value": "year"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Submit",
      "data": {
        "action": "analyze_AFYP"
      }
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.0"
}


"""


def create_activity_reply(activity: Activity, text: str = None, locale: str = None):
    return Activity(
        type=ActivityTypes.message,
        timestamp=datetime.utcnow(),
        from_property=ChannelAccount(
            id=getattr(activity.recipient, "id", None),
            name=getattr(activity.recipient, "name", None),
        ),
        recipient=ChannelAccount(
            id=activity.from_property.id, name=activity.from_property.name
        ),
        reply_to_id=activity.id,
        service_url=activity.service_url,
        channel_id=activity.channel_id,
        conversation=ConversationAccount(
            is_group=activity.conversation.is_group,
            id=activity.conversation.id,
            name=activity.conversation.name,
        ),
        text=text or "",
        locale=locale or "",
        attachments=[],
        entities=[],
    )


async def build_metric_input_card():
    # initialize card
    card = AdaptiveCard()

    # Add a textblock
    card.add(TextBlock(text="You have chosen to analyze AFYP (Annualized First Year Premium) by Time Period.",
                       sweight="Bolder", size="Medium"))

    card.add(TextBlock(text="Please select the dimension and time period you'd like to analyze:", wrap=True))

    card.add(TextBlock(text="Choose Dimension:", weight="Bolder"))  # add column set

    card.add(InputChoiceSet(ID="dimensionChoice", style="expanded", isMultiSelect=True, choices=[
        {"title": "Sales Channel", "value": "sales_channel"},
        {"title": "Product Type", "value": "product_type"},
        {"title": "Customer Segment", "value": "customer_segment"},
        {"title": "Region", "value": "region"}
    ]))
    card.up_one_level()

    card.add(TextBlock(text="Select Time Period:", weight="Bolder"))  # add column set

    card.add(InputChoiceSet(ID="timeChoice", style="expanded", choices=[
        {"title": "Month", "value": "month"},
        {"title": "Half Year", "value": "half_year"},
        {"title": "Quarter", "value": "quarter"},
        {"title": "Year", "value": "year"}
    ]))
    card.up_one_level()

    card.add(ActionSet(actions=[ActionSubmit(title="Submit", data={"action": "submitFeedback"})]))

    # Serialize to a json payload with a one-liner
    json = await card.to_json()
    print(json)

    return json


def generate_image_card(image_encode: str):
    message = {
        "type": "AdaptiveCard",
        "version": "1.0",
        "body": [
            {
                "type": "Image",
                "url": f"data:image/png;base64,{image_encode}"
            }
        ],
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
    }

    message2 = {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
            {
                "type": "TextBlock",
                "text": "Sales Performance Rankings",
                "weight": "Bolder",
                "size": "Medium"
            },
            {
                "type": "Table",
                "columns": [
                    {
                        "header": "Employee ID",
                        "width": "auto"
                    },
                    {
                        "header": "First Name",
                        "width": "stretch"
                    },
                    {
                        "header": "Last Name",
                        "width": "stretch"
                    },
                    {
                        "header": "Sales Rank",
                        "width": "auto"
                    },
                    {
                        "header": "Total Sales ($)",
                        "width": "auto"
                    }
                ],
                "rows": [
                    {
                        "cells": [
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "3"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "Jane"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "Peacock"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "1"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "833.04"}]
                            }
                        ]
                    },
                    {
                        "cells": [
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "4"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "Margaret"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "Park"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "2"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "775.40"}]
                            }
                        ]
                    },
                    {
                        "cells": [
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "5"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "Steve"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "Johnson"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "3"}]
                            },
                            {
                                "type": "TableCell",
                                "items": [{"type": "TextBlock", "text": "720.16"}]
                            }
                        ]
                    }
                ]
            },
            {
                "type": "Image",
                "url": "https://example.com/sales-performance-chart.png",
                "altText": "Sales Performance Rankings Chart"
            },
            {
                "type": "TextBlock",
                "text": "Were the results correct?",
                "wrap": "true"
            },
            {
                "type": "ActionSet",
                "actions": [
                    {
                        "type": "Action.Submit",
                        "title": "Yes",
                        "data": {
                            "response": "yes"
                        }
                    },
                    {
                        "type": "Action.Submit",
                        "title": "No",
                        "data": {
                            "response": "no"
                        }
                    }
                ]
            },
            {
                "type": "TextBlock",
                "text": "Summarization can be enabled if you set allow_llm_to_see_data=True",
                "wrap": "true",
                "isSubtle": "true"
            },
            {
                "type": "TextBlock",
                "text": "Followup Questions can be enabled if you set allow_llm_to_see_data=True",
                "wrap": "true",
                "isSubtle": "true"
            }
        ]
    }

    return message


def find_usage_actions():
    message = {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.0",
        "body": [
            {
                "type": "TextBlock",
                "text": "**You have chosen:** Optimize Marketing Strategies",
                "weight": "Bolder",
                "size": "Medium"
            },
            {
                "type": "TextBlock",
                "text": "This analysis aims to evaluate the impact of promotional activities on key performance indicators (KPIs) such as Annualized First Year Premium (AFYP), Annualized First Year Commission (AFYC), and the average premium by comparing data across three periods: before, during, and after the promotion.",
                "wrap": "true"
            },
            {
                "type": "TextBlock",
                "text": "The segmentation includes sales channels, product types, and various plan details, allowing for a detailed breakdown of performance.",
                "wrap": "true"
            },
            {
                "type": "TextBlock",
                "text": "**Business Query Options:**",
                "weight": "Bolder",
            },
            {
                "type": "TextBlock",
                "text": "- **Promotion vs. Non-promotion Period Comparison:** Query the AFYP, AFYC, and average premium for periods before, during, and after the promotion to assess the effectiveness of the promotion.",
                "wrap": "true"
            },
            {
                "type": "TextBlock",
                "text": "- **Performance by Channel:** Compare AFYP and the number of policies sold across different channels (bank, broker) to determine which channel performed best during the promotion.",
                "wrap": "true"
            },
            {
                "type": "TextBlock",
                "text": "- **Product Type Impact:** Analyze how different product types (life, health, property) contributed to changes in KPIs, focusing on which products saw the most improvement during the promotion.",
                "wrap": "true"
            },
            {
                "type": "TextBlock",
                "text": "- **Policy Status and Incentive Plan Correlation:** Investigate policy status (active, lapsed, terminated) in relation to the incentive plan codes to evaluate the long-term sustainability of policies sold during the promotion.",
                "wrap": "true"
            }
        ],
        "actions": [
            {
                "type": "Action.Submit",
                "title": "Run Promotion vs. Non-promotion Comparison",
                "data": {
                    "action": "PromotionVsNonPromotion"
                }
            },
            {
                "type": "Action.Submit",
                "title": "Check Performance by Channel",
                "data": {
                    "action": "PerformanceByChannel"
                }
            },
            {
                "type": "Action.Submit",
                "title": "Analyze Product Type Impact",
                "data": {
                    "action": "ProductTypeImpact"
                }
            },
            {
                "type": "Action.Submit",
                "title": "Review Policy Status and Incentive Plan Correlation",
                "data": {
                    "action": "PolicyStatusIncentivePlan"
                }
            }
        ]
    }

    return message



def generate_metric_chart_card():
    pass


def generate_story_card():
    pass



if __name__ == "__main__":
    asyncio.run(build_metric_input_card())
