import argparse
import os
import sys
from datetime import datetime

# 这里的导入需要确保在 spark-submit 时 PYTHONPATH 包含 watchmen 的 src 目录
from watchmen_auth import fake_tenant_admin
from watchmen_dqc.monitor.rules_runner import create_monitor_rules_runner
from watchmen_model.dqc import MonitorRuleStatisticalInterval

def run_spark_dqc(tenant_id: str, topic_id: str, frequency: str, process_date_str: str):
    """
    Spark 执行器主函数
    """
    # 设置引擎为 pyspark
    os.environ["MONITOR_RULES_RUNNER_ENGINE"] = "pyspark"
    
    print(f"Starting Spark DQC Executor for Tenant[{tenant_id}], Topic[{topic_id}], Frequency[{frequency}]")
    
    # 转换参数
    process_date = datetime.strptime(process_date_str, '%Y-%m-%d').date()
    freq = MonitorRuleStatisticalInterval(frequency.lower())
    
    # 模拟租户管理员权限
    principal_service = fake_tenant_admin(tenant_id)
    
    # 创建 Spark 运行器
    runner = create_monitor_rules_runner(principal_service)
    
    # 执行规则
    runner.run(process_date, topic_id=topic_id, frequency=freq)
    
    print("Spark DQC Execution Finished Successfully.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Watchmen DQC Spark Executor')
    parser.add_argument('--tenant-id', required=True, help='Tenant ID')
    parser.add_argument('--topic-id', required=True, help='Topic ID to monitor')
    parser.add_argument('--frequency', required=True, choices=['daily', 'weekly', 'monthly'], help='Monitor frequency')
    parser.add_argument('--process-date', required=True, help='Process date in YYYY-MM-DD format')
    
    args = parser.parse_args()
    
    try:
        run_spark_dqc(args.tenant_id, args.topic_id, args.frequency, args.process_date)
    except Exception as e:
        print(f"Error during Spark DQC execution: {e}")
        sys.exit(1)
