from typing import List

import pandas as pd
from pandas import DataFrame

from watchmen_ai.hypothesis.model.metrics import MetricType
from watchmen_auth import PrincipalService


async def process_dataset_for_trend_analysis(
        dataset: DataFrame,
        metric: MetricType, dimensions: List[str],
        principal_service: PrincipalService) -> DataFrame:
    """
    process dataset for trend analysis
    :param dimensions:
    :param dataset:
    :param metric:
    :param principal_service:
    :return:
    """

    # Convert the 'date' column to datetime if it's not already
    metric_name = metric.name
    if metric_name not in dataset.columns:
        # If metric not found in dataset, return original dataset
        return dataset

        # Identify time-related dimensions in the dataset
    time_dimensions = []
    for col in dataset.columns:
        # Check if column is in provided dimensions list and appears to be time-related
        if col in dimensions and any(time_keyword in col.lower() for time_keyword in
                                     ['date', 'time', 'year', 'month', 'day', 'week', 'quarter']):
            time_dimensions.append(col)

    # If no time dimensions found, try to infer from column types
    if not time_dimensions:
        # Look for datetime columns
        for col in dataset.columns:
            if col in dimensions and pd.api.types.is_datetime64_any_dtype(dataset[col]):
                time_dimensions.append(col)

    # If still no time dimensions, return original dataset
    if not time_dimensions:
        return dataset

    # Select primary time dimension (first one found)
    primary_time_dim = time_dimensions[0]

    # Determine appropriate time grouping based on the data
    # Convert to datetime if not already
    if not pd.api.types.is_datetime64_any_dtype(dataset[primary_time_dim]):
        try:
            dataset[primary_time_dim] = pd.to_datetime(dataset[primary_time_dim])
        except:
            # If conversion fails, use the column as-is
            pass

    # Group by time dimension and calculate aggregates
    if pd.api.types.is_datetime64_any_dtype(dataset[primary_time_dim]):
        # For datetime columns, resample by appropriate time period
        # Determine date range to choose appropriate frequency
        if len(dataset) > 0:
            date_range = dataset[primary_time_dim].max() - dataset[primary_time_dim].min()

            # Choose frequency based on date range
            if date_range.days > 365 * 2:  # More than 2 years
                freq = 'M'  # Monthly
                dataset['period'] = dataset[primary_time_dim].dt.to_period('M')
            elif date_range.days > 90:  # More than 3 months
                freq = 'W'  # Weekly
                dataset['period'] = dataset[primary_time_dim].dt.to_period('W')
            else:  # Less than 3 months
                freq = 'D'  # Daily
                dataset['period'] = dataset[primary_time_dim].dt.to_period('D')

            # Group by period and calculate aggregate
            result = dataset.groupby('period')[metric_name].agg(['mean', 'sum', 'count']).reset_index()
            # Convert period back to datetime for easier plotting
            result['period'] = result['period'].dt.to_timestamp()
            return result.rename(columns={'period': primary_time_dim})

    # For non-datetime columns or if conversion failed
    # Group by the time dimension directly
    result = dataset.groupby(primary_time_dim)[metric_name].agg(['mean', 'sum', 'count']).reset_index()
    return result


async def process_dataset_for_composition_analysis(
        dataset: DataFrame,
        metric: MetricType, dimensions: List[str],
        principal_service: PrincipalService) -> DataFrame:
    """
    process_dataset_for_composition_analysis
    :param dimensions:
    :param dataset:
    :param metric:
    :param principal_service:
    :return:
    """
    metric_name = metric.name
    if metric_name not in dataset.columns:
        # If metric not found in dataset, return original dataset
        return dataset

    # Identify categorical dimensions for comparison
    comparison_dimensions = []
    for col in dataset.columns:
        # Check if column is in provided dimensions list and is categorical
        if col in dimensions and col != metric_name:
            # Prioritize categorical columns with fewer unique values for better comparisons
            if dataset[col].nunique() < len(dataset) * 0.5:  # Less than 50% unique values
                comparison_dimensions.append(col)

    # If no suitable comparison dimensions found, return original dataset
    if not comparison_dimensions:
        return dataset

    # Select primary comparison dimension (first one found)
    primary_dim = comparison_dimensions[0]

    # Group by the primary dimension and calculate statistics for the metric
    result = dataset.groupby(primary_dim)[metric_name].agg([
        'mean',  # Average value
        'median',  # Middle value
        'std',  # Standard deviation
        'min',  # Minimum value
        'max',  # Maximum value
        'count'  # Count of records
    ]).reset_index()

    # Sort by mean value to highlight differences between groups
    result = result.sort_values('mean', ascending=False)

    # Calculate additional comparison metrics
    if len(result) > 1:
        # Calculate overall mean for reference
        overall_mean = dataset[metric_name].mean()
        # Add percent difference from overall mean
        result['pct_diff_from_mean'] = ((result['mean'] - overall_mean) / overall_mean * 100).round(2)

        # Add rank column
        result['rank'] = range(1, len(result) + 1)

    return result


async def process_dataset_for_distribution_analysis(
        dataset: DataFrame,
        metric: MetricType, dimensions: List[str],
        principal_service: PrincipalService) -> DataFrame:
    """
    process dataset for distribution analysis
    :param dataset:
    :param metric:
    :param principal_service:
    :return:
    """
    metric_name = metric.name
    if metric_name not in dataset.columns:
        # If metric not found in dataset, return original dataset
        return dataset

    # Remove NaN values for the metric column
    clean_dataset = dataset.dropna(subset=[metric_name])
    if clean_dataset.empty:
        return dataset

    # Get basic statistics for the distribution
    metric_values = clean_dataset[metric_name]

    # Create a result dataframe with distribution statistics
    stats = {
        'count': len(metric_values),
        'mean': metric_values.mean(),
        'median': metric_values.median(),
        'std': metric_values.std(),
        'min': metric_values.min(),
        'max': metric_values.max(),
        'range': metric_values.max() - metric_values.min(),
        '25%': metric_values.quantile(0.25),
        '50%': metric_values.quantile(0.50),
        '75%': metric_values.quantile(0.75),
        'skew': metric_values.skew(),
        'kurtosis': metric_values.kurtosis()
    }

    # Create a stats dataframe
    stats_df = pd.DataFrame([stats])

    # Determine if we need to bin the data for histogram representation
    # For continuous data with many unique values, create bins
    if metric_values.nunique() > 10:
        # Determine optimal number of bins using Sturges' rule
        import numpy as np
        num_bins = int(np.ceil(np.log2(len(metric_values))) + 1)
        num_bins = min(num_bins, 20)  # Cap at 20 bins for readability

        # Create histogram bins
        bins = pd.cut(metric_values, bins=num_bins)
        # Count values in each bin
        bin_counts = bins.value_counts().sort_index()

        # Create histogram dataframe
        hist_df = pd.DataFrame({
            'bin': [str(b) for b in bin_counts.index],
            'count': bin_counts.values,
            'percentage': (bin_counts.values / len(metric_values) * 100).round(2)
        })

        # Add bin edges as separate columns for easier plotting
        # Extract bin edges safely handling different bracket formats
        def extract_bin_edge(bin_str, is_start=True):
            try:
                # Handle different bracket formats from pd.cut
                parts = bin_str.split(',')
                if is_start:
                    # Extract the first part and remove brackets
                    val = parts[0].strip('()[]')
                else:
                    # Extract the second part and remove brackets
                    val = parts[1].strip('()[]')
                return float(val)
            except (ValueError, IndexError):
                # Return NaN for any parsing errors
                return np.nan

        hist_df['bin_start'] = hist_df['bin'].apply(lambda x: extract_bin_edge(x, True))
        hist_df['bin_end'] = hist_df['bin'].apply(lambda x: extract_bin_edge(x, False))
        hist_df['bin_center'] = (hist_df['bin_start'] + hist_df['bin_end']) / 2

        # Combine stats and histogram data
        result = {'stats': stats_df, 'histogram': hist_df}
        return pd.concat([stats_df, hist_df], keys=['stats', 'histogram'])
    else:
        # For categorical or discrete data with few unique values
        # Create frequency distribution
        value_counts = metric_values.value_counts().sort_index()
        freq_df = pd.DataFrame({
            'value': value_counts.index,
            'count': value_counts.values,
            'percentage': (value_counts.values / len(metric_values) * 100).round(2)
        })

        # Combine stats and frequency data
        return pd.concat([stats_df, freq_df], keys=['stats', 'frequency'])


async def process_dataset_for_correlation_analysis(
        dataset: DataFrame,
        metric: MetricType, dimensions: List[str],
        principal_service: PrincipalService) -> DataFrame:
    """
    process dataset for correlation analysis
    :param dataset:
    :param metric:
    :param principal_service:
    :return:
    """
    metric_name = metric.name
    if metric_name not in dataset.columns:
        # If metric not found in dataset, return original dataset
        return dataset

    # Identify numeric dimensions for correlation analysis
    numeric_dimensions = []
    for col in dataset.columns:
        # Check if column is in provided dimensions list and is numeric
        if col in dimensions and col != metric_name and pd.api.types.is_numeric_dtype(dataset[col]):
            numeric_dimensions.append(col)

    # If no suitable numeric dimensions found, return original dataset
    if not numeric_dimensions:
        return dataset

    # Calculate correlations between the metric and each numeric dimension
    correlations = []
    p_values = []

    # Drop rows with NaN values in the metric column
    clean_dataset = dataset.dropna(subset=[metric_name])
    if clean_dataset.empty:
        return dataset

    # Import scipy for p-value calculation
    from scipy import stats

    for dim in numeric_dimensions:
        # Drop rows with NaN values in the dimension column
        dim_dataset = clean_dataset.dropna(subset=[dim])
        if len(dim_dataset) < 2:  # Need at least 2 points for correlation
            continue

        # Calculate Pearson correlation coefficient and p-value
        corr, p_value = stats.pearsonr(dim_dataset[metric_name], dim_dataset[dim])

        correlations.append({
            'dimension': dim,
            'correlation': corr,
            'p_value': p_value,
            'correlation_type': 'pearson',
            'sample_size': len(dim_dataset)
        })

        # If data is not normally distributed, also calculate Spearman rank correlation
        # Check for normality using Shapiro-Wilk test
        if len(dim_dataset) >= 3 and len(dim_dataset) <= 5000:  # Shapiro-Wilk has sample size limitations
            try:
                _, p_metric = stats.shapiro(dim_dataset[metric_name])
                _, p_dim = stats.shapiro(dim_dataset[dim])

                # If either variable is not normally distributed (p < 0.05)
                if p_metric < 0.05 or p_dim < 0.05:
                    # Calculate Spearman correlation
                    spearman_corr, spearman_p = stats.spearmanr(dim_dataset[metric_name], dim_dataset[dim])

                    correlations.append({
                        'dimension': dim,
                        'correlation': spearman_corr,
                        'p_value': spearman_p,
                        'correlation_type': 'spearman',
                        'sample_size': len(dim_dataset)
                    })
            except:
                # Skip if Shapiro-Wilk test fails
                pass

    # Create a DataFrame from the correlations list
    if not correlations:
        return dataset

    result = pd.DataFrame(correlations)

    # Add correlation strength categorization
    def categorize_correlation(corr):
        abs_corr = abs(corr)
        if abs_corr < 0.3:
            return 'weak'
        elif abs_corr < 0.7:
            return 'moderate'
        else:
            return 'strong'

    result['strength'] = result['correlation'].apply(categorize_correlation)

    # Add significance flag (p < 0.05 is typically considered statistically significant)
    result['significant'] = result['p_value'] < 0.05

    # Sort by absolute correlation value (strongest correlations first)
    result['abs_correlation'] = result['correlation'].abs()
    result = result.sort_values('abs_correlation', ascending=False)
    result = result.drop('abs_correlation', axis=1)

    return result


async def process_dataset_for_comparison_analysis(
        dataset: DataFrame,
        metric: MetricType, dimensions: List[str],
        principal_service: PrincipalService) -> DataFrame:
    """
    process dataset for trend analysis
    :param dataset:
    :param metric:
    :param principal_service:
    :return:
    """
    metric_name = metric.name
    if metric_name not in dataset.columns:
        # If metric not found in dataset, return original dataset
        return dataset

    # Identify categorical dimensions for composition analysis
    categorical_dimensions = []
    for col in dataset.columns:
        # Check if column is in provided dimensions list and is categorical
        if col in dimensions and col != metric_name:
            # Look for columns with relatively few unique values compared to dataset size
            if dataset[col].nunique() < len(dataset) * 0.5:  # Less than 50% unique values
                categorical_dimensions.append(col)

    # If no suitable categorical dimensions found, return original dataset
    if not categorical_dimensions:
        return dataset

    # Select primary categorical dimension (first one found)
    primary_dim = categorical_dimensions[0]

    # Group by the primary dimension and calculate sum and count for the metric
    result = dataset.groupby(primary_dim)[metric_name].agg([
        'sum',  # Total value for each category
        'count',  # Count of records in each category
        'mean'  # Average value in each category
    ]).reset_index()

    # Calculate the total sum across all categories
    total_sum = result['sum'].sum()

    # Calculate percentage of total for each category
    if total_sum > 0:  # Avoid division by zero
        result['percentage'] = (result['sum'] / total_sum * 100).round(2)
    else:
        result['percentage'] = 0

    # Calculate cumulative percentage
    result = result.sort_values('sum', ascending=False)
    result['cumulative_percentage'] = result['percentage'].cumsum().round(2)

    # Add rank column
    result['rank'] = range(1, len(result) + 1)

    # Identify top categories (e.g., those that make up 80% of the total)
    result['is_top_category'] = result['cumulative_percentage'] <= 80

    # Calculate additional metrics
    if len(result) > 0:
        # Add category contribution ratio (compared to average category)
        avg_category_sum = total_sum / len(result)
        if avg_category_sum > 0:  # Avoid division by zero
            result['contribution_ratio'] = (result['sum'] / avg_category_sum).round(2)
        else:
            result['contribution_ratio'] = 0

    return result


async def process_dataset_for_feature_importance_analysis(
        dataset: DataFrame,
        metric: MetricType, dimensions: List[str],
        principal_service: PrincipalService) -> DataFrame:
    """
    process dataset for feature importance analysis
    :param dataset:
    :param metric:
    :param principal_service:
    :return:
    """
    # Placeholder for feature importance analysis
    # This could involve using machine learning models to determine feature importance
    # For now, just return the original dataset
    metric_name = metric.name
    if metric_name not in dataset.columns:
        return dataset

    # Identify potential feature dimensions
    feature_dimensions = []
    for col in dimensions:
        if col != metric_name and col in dataset.columns:
            feature_dimensions.append(col)

    if not feature_dimensions:
        return dataset

    # Prepare clean dataset
    clean_dataset = dataset.dropna(subset=[metric_name] + feature_dimensions)
    if clean_dataset.empty:
        return dataset

    # Initialize feature importance scores dictionary
    importance_scores = []

    # Calculate mutual information scores for all dimensions
    from sklearn.feature_selection import mutual_info_regression
    from sklearn.preprocessing import LabelEncoder

    X = pd.DataFrame()
    y = clean_dataset[metric_name]

    # Process each feature dimension
    for dim in feature_dimensions:
        if pd.api.types.is_numeric_dtype(clean_dataset[dim]):
            # For numeric features, use as is
            X[dim] = clean_dataset[dim]
        else:
            # For categorical features, use label encoding
            le = LabelEncoder()
            X[dim] = le.fit_transform(clean_dataset[dim])

    # Calculate mutual information scores
    mi_scores = mutual_info_regression(X, y)

    # Add mutual information scores
    for dim, mi_score in zip(feature_dimensions, mi_scores):
        importance_scores.append({
            'dimension': dim,
            'importance_score': mi_score,
            'method': 'mutual_information'
        })

    # For numeric features, also calculate correlation-based importance
    numeric_dimensions = [dim for dim in feature_dimensions
                          if pd.api.types.is_numeric_dtype(clean_dataset[dim])]

    if numeric_dimensions:
        correlations = clean_dataset[numeric_dimensions + [metric_name]].corr()[metric_name]
        for dim in numeric_dimensions:
            importance_scores.append({
                'dimension': dim,
                'importance_score': abs(correlations[dim]),
                'method': 'correlation'
            })

    # If we have enough samples and features, add decision tree-based importance
    if len(clean_dataset) >= 10 and len(feature_dimensions) >= 2:
        from sklearn.ensemble import RandomForestRegressor

        # Train a random forest model
        rf = RandomForestRegressor(n_estimators=100, random_state=42)
        rf.fit(X, y)

        # Get feature importance scores
        for dim, importance in zip(feature_dimensions, rf.feature_importances_):
            importance_scores.append({
                'dimension': dim,
                'importance_score': importance,
                'method': 'random_forest'
            })

    # Create DataFrame with importance scores
    result = pd.DataFrame(importance_scores)

    # Normalize scores within each method
    def normalize_scores(group):
        max_score = group['importance_score'].max()
        if max_score > 0:
            group['normalized_score'] = (group['importance_score'] / max_score * 100).round(2)
        else:
            group['normalized_score'] = 0
        return group

    result = result.groupby('method').apply(normalize_scores).reset_index(drop=True)

    # Add importance level categorization
    def categorize_importance(score):
        if score >= 70:
            return 'high'
        elif score >= 30:
            return 'medium'
        else:
            return 'low'

    result['importance_level'] = result['normalized_score'].apply(categorize_importance)

    # Sort by normalized score (highest first)
    result = result.sort_values('normalized_score', ascending=False)

    # Calculate aggregate importance across methods
    agg_importance = result.groupby('dimension')['normalized_score'].agg([
        'mean',
        'max',
        'min',
        'count'
    ]).round(2).reset_index()

    # Add overall importance level
    agg_importance['overall_importance_level'] = agg_importance['mean'].apply(categorize_importance)

    # Sort by mean importance score
    agg_importance = agg_importance.sort_values('mean', ascending=False)

    # Combine detailed and aggregate results
    return pd.concat([result, agg_importance], keys=['detailed', 'aggregate'])

