# Data Story: How Incentive Programs Improve Business Performance

description: This data story aims to explore the impact of incentive programs on business performance, focusing on the
insurance industry. By analyzing key financial metrics, sales team performance, and customer behavior, we aim to uncover
the effectiveness of incentive programs in driving growth and enhancing sales channels.

---

## Sub-Question 1:Which financial metrics show the most improvement during incentive programs?

description: This sub-question focuses on the financial impact of incentive programs, specifically on key metrics such
as Annualized First Year Premium (AFYP) and Annualized First Year Commission (AFYC). By comparing these metrics during
incentive and non-incentive periods, we aim to determine the effectiveness of incentive programs in driving revenue
growth and agent/broker performance.

---

### Hypothesis 1.1:Incentive programs lead to a significant increase in AFYP (Annualized First Year Premium).

description: This hypothesis suggests that incentive programs result in higher AFYP, indicating increased premium income
from new policies sold during incentive periods. By analyzing historical AFYP data and comparing it across incentive and
non-incentive periods, we can validate the impact of incentives on premium generation.

- Metrics to Validate
    - Average **AFYP** during incentive vs. non-incentive periods.
    - Percentage increase in **AFYP** after launching incentive programs.

- Validation:
    - Analyze historical AFYP data split into incentive and non-incentive periods.
    - Perform a t-test or ANOVA to determine if the increase in AFYP is statistically significant.
    - Visualize trends using line charts showing the impact of incentives over time.

---

### Hypothesis 1.2:Incentive programs result in higher AFYC (Annualized First Year Commission) for participating agents/brokers.

description: This hypothesis posits that incentive programs motivate agents and brokers to sell higher-value policies,
leading to increased commission income. By comparing AFYC data for agents/brokers participating in incentive programs
with those who do not, we can assess the impact of incentives on commission earnings.

- Metrics to Validate:
    - **Average AFYC** during incentive vs. non-incentive periods.
    - Proportion of policies contributing to AFYC growth.

- Validation:
    - Compare AFYC trends across periods.
    - Segment AFYC data by agents or branches that participated in incentive programs.
    - Use bar charts or stacked area charts to show growth patterns.

---

## Sub-Question 2:How do incentive programs impact sales team performance and customer behavior?

description: This sub-question explores the relationship between incentive programs, sales team performance, and
customer behavior. By analyzing policy issuance rates, premium values, and customer preferences during incentive
periods, we aim to understand how incentives influence sales outcomes and customer choices.

---

### Hypothesis 2.1:Sales teams participating in incentive programs demonstrate higher policy issuance rates.

- Metrics to Validate:
    - **Number of policies issued** during incentive vs. non-incentive periods.
    - **Policy issuance growth rate** by team or branch.

- Validation:
    - Use a before-and-after analysis to evaluate policy issuance trends.
    - Compare issuance growth rates for participating teams vs. non-participating teams.
    - Visualize results with a grouped bar chart showing policy issuance by team.

---

### Hypothesis 2.2:Customers are more likely to select higher-value products during incentive periods, increasing the average premium per

policy.

- Metrics to Validate:
    - **Average premium per policy** (total premium / number of policies).
    - **Percentage of high-value policies** (e.g., policies exceeding a threshold premium).

- **Validation:**
    - Segment policy data into high-value and regular policies.
    - Compare average premium trends across periods using boxplots.
    - Test for statistical significance in the premium increase using a Wilcoxon test or t-test.

---

## Sub-Question 3:Which sales channels are most influenced by incentive programs?

description: This sub-question aims to identify the impact of incentive programs on different sales channels, such as
agency, bancassurance, and direct sales. By analyzing channel-specific metrics, we can determine which channels exhibit
the most significant growth during incentive periods.

---

### Hypothesis 3.1:The agency channel exhibits the largest production increase in response to incentive programs.

- Metrics to Validate:
    - **Channel-wise AFYP and AFYC growth
      **[Empty-MD-Topic.md](..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2FDownloads%2FEmpty-MD-Topic.md) during incentive
      periods.
    - **Policy issuance** rate by channel.

- Validation:
    - Analyze AFYP and AFYC data segmented by channel (e.g., agency, bancassurance, direct sales).
    - Calculate and compare growth rates for each channel.
    - Use a stacked bar chart or heatmap to highlight channel performance during incentives.

---

### Hypothesis 3.2:The bancassurance channel achieves higher customer conversion rates due to streamlined sales processes during

incentive periods.

- Metrics to Validate:
    - **Conversion rates** (number of policies issued / leads generated) by channel.
    - **Time taken from lead generation to policy issuance**.

- Validation:
    - Compare conversion rates across channels during incentive vs. non-incentive periods.
    - Visualize differences using funnel charts or conversion rate line charts.
    - Perform a chi-square test to validate statistical significance.

---

## Observations Dimensions

| Dimension         | Type           | Description                                                                                          |
|-------------------|----------------|------------------------------------------------------------------------------------------------------|
| Bank              | classification | The bank channel through which insurance products are sold                                           |
| BR                | classification | Branch                                                                                               |
| TR                | classification | Treasure representative                                                                              |
| Product  group    | classification | The category of insurance products sold, such as life, health, or property insurance                 |
| product           | classification | The specific insurance product sold, such as term life, whole life, or universal life insurance      |
| Plan Code         | classification | The unique code assigned to the incentive plan launched by the company                               |
| Application Date  | time           | The date when the incentive plan was launched by the company                                         |
| submission Date   | time           | The date when the incentive plan was submitted to the bank for approval                              |
| Issue Date        | time           | The date when the incentive plan was approved and implemented by the bank                            |
| Policy Status     | classification | The status of the insurance policy, such as active, lapsed, or terminated                            |
| incentive program | classification | The program designed to motivate bank channel sales personnel or partners to sell insurance products |

--- 


