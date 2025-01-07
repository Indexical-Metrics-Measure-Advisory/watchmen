import base64

import plotly.graph_objects as go
from pandas import DataFrame


def generate_chart_for_metric(df: DataFrame):
    fig = go.Figure(
        data=[go.Bar(y=[2, 1, 3])],
        layout_title_text=""
    )

    fig_bytes = fig.to_image(format="png")
    encoded_string = base64.b64encode(fig_bytes).decode('utf-8')
    # buf = io.BytesIO(fig_bytes)
    print(encoded_string)

    return encoded_string


if __name__ == "__main__":
    metric_dict = {
        "name": "sales",
        "values": [200, 320, 330]
    }
    generate_chart_for_metric(metric_dict)
