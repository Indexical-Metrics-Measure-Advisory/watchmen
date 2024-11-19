import datetime

import calendar

def recognize_time_description(user_input):
    """
    Recognizes user-entered time descriptions and converts them to a system-recognizable format.

    Args:
      user_input: The user-entered string.

    Returns:
      A tuple representing the time range, e.g., (start_date, end_date).
    """

    # Convert user input to lowercase and strip spaces.
    normalized_input = user_input.lower().strip()

    # Define time descriptions and corresponding time ranges.
    time_descriptions = {
        "this month": (datetime.date.today().replace(day=1), datetime.date.today()),
        "last month": (get_last_month_start(), get_last_month_end()),
        "last 6 months": (get_last_n_months_start(6), datetime.date.today()),
        "this week": (get_current_week_start(), get_current_week_end()),
        "last week": (get_last_week_start(), get_last_week_end()),
        "yesterday": (datetime.date.today() - datetime.timedelta(days=1)),
        "today": datetime.date.today(),
        "tomorrow": (datetime.date.today() + datetime.timedelta(days=1)),
    }

    # Identify the user-entered time description.
    for time_description, date_range in time_descriptions.items():
        if time_description in normalized_input:
            return date_range

    # If no time description is recognized, return None.
    return None


def get_last_month_start():
    """
    Gets the start date of the last month.
    """
    today = datetime.date.today()
    last_month = today - datetime.timedelta(days=31)
    return last_month.replace(day=1)


def get_last_month_end():
  """
  Gets the end date of the last month.
  """
  today = datetime.date.today()
  last_month = today.replace(month=today.month - 1)
  _, last_day = calendar.monthrange(last_month.year, last_month.month)
  return last_month.replace(day=last_day)



def get_last_n_months_start(n):
    """
    Gets the start date of the last n months.
    """
    today = datetime.date.today()
    last_n_months_start = today - datetime.timedelta(days=31 * (n - 1))
    return last_n_months_start.replace(day=1)


def get_current_week_start():
    """
    Gets the start date of the current week.
    """
    today = datetime.date.today()
    current_week_start = today - datetime.timedelta(days=today.weekday())
    return current_week_start


def get_current_week_end():
    """
    Gets the end date of the current week.
    """
    today = datetime.date.today()
    current_week_end = today + datetime.timedelta(days=6 - today.weekday())
    return current_week_end


def get_last_week_start():
    """
    Gets the start date of the last week.
    """
    last_week_start = get_current_week_start() - datetime.timedelta(days=7)
    return last_week_start


def get_last_week_end():
    """
    Gets the end date of the last week.
    """
    last_week_end = get_current_week_end() - datetime.timedelta(days=7)
    return last_week_end


# Testing the LangChain
user_input = "last 6 months"
start_date, end_date = recognize_time_description(user_input)
print(f"Time range: {start_date} to {end_date}")
