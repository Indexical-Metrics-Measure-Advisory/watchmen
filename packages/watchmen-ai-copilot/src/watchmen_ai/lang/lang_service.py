EN_ACTION_LIST = "Here are some key actions you can take:"

JP_ACTION_LIST = "実行できる重要なアクションをいくつか紹介します。"


def message_for_jp(key: str) -> str:
    if key == "action_list":
        return JP_ACTION_LIST
    elif key == "Summarize":
        return "ビジネス目標の要約"
    elif key == "query_metrics":
        return "YoY/MoM指標の分析"
    elif key == "exception_metrics":
        return "基準値から逸脱したデータの表示"
    elif key == "business_target":
        return "それでは、今日のビジネス目標は何ですか？"
    elif key == "rate":
        return "詳細な逸脱率を教えていただければ、さらにお手伝いいたします。"
    elif key == "confirm":
        return "確認"
    elif key == "time_range":
        return "それでは、ビジネス目標の分析対象期間は何になりますか？"
    elif key == "yes":
        return "はい"
    elif key == "no":
        return "いいえ"
    elif key == "node_name":
        return "{name}: 現在:{current},前回:{previous},チェーン:{chain}"

    return ""


def message_for_en(key):
    if key == "action_list":
        return EN_ACTION_LIST
    elif key == "Summarize":
        return "Summarize Business Target"
    elif key == "query_metrics":
        return "Query metrics YoY/MoM"
    elif key == "exception_metrics":
        return "View data that deviates from the baseline"
    elif key == "business_target":
        return "So, what's your business target for today?"
    elif key == "confirm":
        return "Confirm"
    elif key == "time_range":
        return "So, what time range would you like to analyze for your business target?"
    elif key == "yes":
        return "Yes"
    elif key == "no":
        return "No"
    elif key =="rate":
        return "Please let me know the specific deviation rate you'd like to explore, and I'll be happy to assist you further."
    elif key=="node_name":
        return "{name}: current:{current},previous:{previous},chain:{chain}"

    return "Hello"


def get_message_by_lang(lang: str, key: str) -> str:
    if lang == "en":
        return message_for_en(key)
    elif lang == "jp":
        return message_for_jp(key)
    elif lang == "fr":
        return "Bonjour"
    else:
        return "Hello"
