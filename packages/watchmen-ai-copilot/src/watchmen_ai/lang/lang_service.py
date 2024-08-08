EN_ACTION_LIST = "Here are some key actions you can take:"

JP_ACTION_LIST = "以下の質問をお答えできます。"


def message_for_jp(key: str) -> str:
    if key == "action_list":
        return JP_ACTION_LIST
    elif key == "summarize":
        return "主要なビジネス指標のサマリーの表示"
    elif key == "query_metrics":
        return "指標の分析"
    elif key == "exception_metrics":
        return "詳細指標の表示など"
    elif key == "business_target":
        return "どの状況をみたいですか？"
    elif key == "rate":
        return "詳細な逸脱率を教えていただければ、さらにお手伝いいたします。"
    elif key == "confirm":
        return "確認しますか？"
    elif key == "time_range":
        return "対象期間を指定してください。"
    elif key == "yes":
        return "はい"
    elif key == "no":
        return "いいえ"
    elif key == "node_name":
        return "{name}: {current}"
    elif key == "markdown_summary":
        return "ビジネス指標： "

    return ""


def message_for_en(key):
    if key == "action_list":
        return EN_ACTION_LIST
    elif key == "summarize":
        return "Summarize Business Target"
    elif key == "query_metrics":
        return "Query metrics YoY/MoM"
    elif key == "exception_metrics":
        return "View data that deviates from the baseline"
    elif key == "business_target":
        return "So, what's your business target for today?"
    elif key == "confirm":
        return "Please to Confirm?"
    elif key == "time_range":
        return "So, what time range would you like to analyze for your business target?"
    elif key == "yes":
        return "Yes"
    elif key == "no":
        return "No"
    elif key =="rate":
        return "Please let me know the specific deviation rate you'd like to explore, and I'll be happy to assist you further."
    elif key=="node_name":
        return "{name}: current:{current}"
    elif key == "markdown_summary":
        return "Here is the summary of your business target: "

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
