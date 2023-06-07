
import re


def replace(x):
  # print(x.groups())
  return {'\'%%Y': '\'%Y', '-%%m': '-%m', '-%%d': '-%d', '\'%%H': '\'%H', ' %%H': ' %H', ':%%i': ':%i', ':%%s': ':%s'}[x.group()]

def process_sql(sql:str)->str:
	return re.sub(r"'%%Y|-%%m|-%%d|\s%%H|'%%H|:%%i|:%%s", replace, sql)







