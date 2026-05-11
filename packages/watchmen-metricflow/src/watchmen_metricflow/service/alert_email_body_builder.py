from html import escape
from typing import List, Optional

from watchmen_metricflow.model.alert_rule import (
    AlertConditionResult,
    AlertStatus,
    GlobalAlertRule
)


def build_alert_detail_html(alert_statuses: List[AlertStatus]) -> str:
    if not alert_statuses:
        return ''

    triggered_count = sum(1 for s in alert_statuses if s.triggered)
    normal_count = len(alert_statuses) - triggered_count

    if triggered_count > 0:
        banner_bg = '#fce8e6'
        banner_border = '#d93025'
        banner_text = f'{triggered_count} alert(s) triggered'
    else:
        banner_bg = '#e6f4ea'
        banner_border = '#1e8e3e'
        banner_text = f'All {normal_count} alert rule(s) are normal'

    banner = (
        f'<div style="background:{banner_bg};border-left:4px solid {banner_border};'
        f'border-radius:6px;padding:14px 18px;margin:0 0 20px 0;">'
        f'<span style="font-weight:600;color:#202124;">{banner_text}</span>'
        f'</div>'
    )

    alert_cards = []
    for status in alert_statuses:
        if status.triggered:
            status_bg = '#fce8e6'
            status_border = '#d93025'
            status_label = 'Triggered'
            status_badge_bg = '#d93025'
        else:
            status_bg = '#e6f4ea'
            status_border = '#1e8e3e'
            status_label = 'Normal'
            status_badge_bg = '#1e8e3e'

        condition_details = ''
        if status.conditionResults:
            cond_lines = []
            for cr in status.conditionResults:
                metric_name = escape(str(cr.metricName or cr.metricId or ''))
                op = escape(str(cr.operator or ''))
                threshold = escape(str(cr.value if cr.value is not None else ''))
                current = escape(str(cr.currentValue if cr.currentValue is not None else 'N/A'))
                cond_lines.append(
                    f'<div style="margin:4px 0;padding:4px 0;font-size:13px;color:#202124;">'
                    f'- {metric_name}: current value <strong>{current}</strong> '
                    f'{op} threshold <strong>{threshold}</strong>'
                    f'</div>'
                )
            condition_details = (
                f'<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e0e0;">'
                f'{"".join(cond_lines)}'
                f'</div>'
            )

        alert_cards.append(
            f'<div style="background:{status_bg};border:1px solid {status_border};'
            f'border-radius:8px;padding:14px 16px;margin:0 0 10px 0;">'
            f'<div style="display:flex;align-items:center;justify-content:space-between;">'
            f'<span style="font-weight:600;color:#202124;font-size:14px;">{escape(status.ruleName)}</span>'
            f'<span style="background:{status_badge_bg};color:#ffffff;padding:2px 10px;'
            f'border-radius:12px;font-size:12px;font-weight:600;">{status_label}</span>'
            f'</div>'
            f'<p style="margin:6px 0 0 0;color:#5f6368;font-size:13px;">{escape(str(status.message or ""))}</p>'
            f'{condition_details}'
            f'</div>'
        )

    return (
        f'<div style="margin:0 0 28px 0;">'
        f'<h2 style="margin:0 0 14px 0;color:#1a73e8;font-size:18px;font-weight:700;">Alert Status</h2>'
        f'{banner}'
        f'{"".join(alert_cards)}'
        f'</div>'
    )


def build_alert_body_from_rule(rule: GlobalAlertRule, message: str, condition_results: Optional[list]) -> str:
    normalized_results: List[AlertConditionResult] = []
    for item in (condition_results or []):
        if isinstance(item, AlertConditionResult):
            normalized_results.append(item)
            continue
        if isinstance(item, dict):
            try:
                normalized_results.append(AlertConditionResult.model_validate(item))
                continue
            except Exception:
                pass

    status = AlertStatus(
        id=str(rule.id),
        ruleId=str(rule.id),
        ruleName=rule.name or 'Alert',
        triggered=True,
        acknowledged=False,
        message=message or f'Rule {rule.name} triggered.',
        conditionResults=normalized_results
    )

    detail = build_alert_detail_html([status])
    return (
        f'<html><body style="margin:0;padding:0;background:#f4f6f9;'
        f'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;">'
        f'<div style="max-width:720px;margin:0 auto;padding:24px 16px;">'
        f'<div style="background:#ffffff;border-left:4px solid #1a73e8;'
        f'border-radius:0 10px 10px 0;padding:20px 24px;margin:0 0 20px 0;">'
        f'<h1 style="margin:0;color:#1a202c;font-size:20px;font-weight:700;">Alert Notification</h1>'
        f'</div>'
        f'{detail}'
        f'</div>'
        f'</body></html>'
    )
