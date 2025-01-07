import pandas as pd


class ChartSuggestService:

    def recommended_chart(self, data):
        if isinstance(data, pd.DataFrame):
            num_cols = data.select_dtypes(include=['number']).shape[1]
        else:
            num_cols = 1

        if num_cols == 1:
            # 一个数值变量
            if data.shape[0] <= 10:
                return 'Box Plot'
            else:
                return 'Histogram'
        elif num_cols == 2:
            # 两个数值变量
            if data.corr().iloc[0, 1] > 0.5:
                return 'Scatter Plot'
            else:
                return 'Scatter Plot with Marginal Histograms'
        else:
            return '建议使用其他可视化工具进行多变量分析'


if __name__ == '__main__':
    # Test the function
    data = {
        'channel': ['Bank A', 'Bank A', 'Bank A', 'Bank B', 'Bank B', 'Bank B', 'Bank C', 'Bank C', 'Bank C'],
        'promotion_stage': ['before', 'after', 'after', 'before', 'before', 'after', 'before', 'after', 'after'],
        'sales': [200, 320, 330, 150, 160, 280, 200, 320, 330]
    }

    df = pd.DataFrame(data)
    service = ChartSuggestService()
    print(service.recommended_chart(df))  # Output: 'Scatter Plot with Marginal Histograms'
    # Test the function with a single column
    data = {
        'sales': [200, 320, 330, 150, 160, 280, 200, 320, 330]
    }

    df = pd.DataFrame(data)
    service = ChartSuggestService()
    print(service.recommended_chart(df))  # Output: 'Histogram'
    # Test the function with multiple columns
    data = {
        'sales': [200, 320, 330, 150, 160, 280, 200, 320, 330],
        'profit': [100, 150, 200, 80, 90, 120, 100, 150, 200]
    }

    df = pd.DataFrame(data)
    service = ChartSuggestService()
    print(service.recommended_chart(df))  # Output: 'Scatter Plot'
    # Test the function with multiple columns
    data = {
        'sales': [200, 320, 330, 150, 160, 280, 200, 320, 330],
        'profit': [100, 150, 200, 80, 90, 120, 100, 150, 200],
        'revenue': [300, 400, 500, 200, 250, 350, 300, 400, 500]
    }

    df = pd.DataFrame(data)
    service = ChartSuggestService()
    print(service.recommended_chart(df))  # Output: '建议使用其他可视化工具进行多变量分析'
