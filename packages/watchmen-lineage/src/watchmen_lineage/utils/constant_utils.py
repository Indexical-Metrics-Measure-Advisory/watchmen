from enum import Enum
from typing import List

from watchmen_lineage.model.ast import ConstantAST, FuncParameter, ASTObject, FuncAst


class AstContext(str, Enum):
	START_PARAMETER = "start_parameter"
	START_OBJECT_FUNC = "start_object_func"
	START_FUNCTION_PARAMETER = "start_function_parameter"
	START_FUNCTION = "start_function"
	END_AST = "end_ast"
	END_PARAM = "end parameter"


CONTINUE = "continue"

grammar_dict = {
	'word': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
	         'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
	         'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', "+",
	         "-", "_"],  # list of words
	'punctuation': ['&', '{', '}', '.', '(', ')', ','],  # list of punctuation marks
}

function_dictionary = {'nextSeq', 'dateDiff', 'now', 'sum', 'length', 'old', 'count', 'monthDiff', 'yearDiff',
                       'fmtDate', 'moveDate', "dayDiff"}


def ask_function(curr_word):
	result = []
	for func in function_dictionary:
		if func == curr_word:
			result.append(func)

	if len(result) == 1:
		return result[0]
	else:
		return "continue"


def need_ask_function(context: AstContext):
	return context == AstContext.START_FUNCTION or AstContext.START_FUNCTION_PARAMETER


def find_function(func_result: str):
	return func_result != CONTINUE


def process_ast_function(context: AstContext, current_ast: ConstantAST, current_param: FuncParameter,
                         func_result: str) -> ASTObject:
	if context == AstContext.START_FUNCTION:
		current_ast.funcAst = FuncAst(name=func_result)
		return ASTObject.function
	elif context == AstContext.START_FUNCTION_PARAMETER:
		ast = ConstantAST()
		ast.funcAst = FuncAst(name=func_result)
		current_ast.funcAst.params.append(ast)
		return ASTObject.function
	elif context == AstContext.START_OBJECT_FUNC:
		ast = ConstantAST()
		ast.funcAst = FuncAst(name=func_result)
		current_param.value.append(ast)
		current_ast.params.append(current_param)
		return ASTObject.method


def parse_constant_parameter(constant: str):
	# Initialize variables
	previous_ch = None
	result: List = []
	context = None
	current: ASTObject = None
	constant_value = ''
	current_ast = None
	current_param = None
	for ch in constant:
		# Check if the character matches any of the rules in the grammar dictionary
		for key, val in grammar_dict.items():
			if ch in val:
				if is_word(key):
					constant_value += ch
					if need_ask_function(context):
						func_result = ask_function(constant_value)
						if find_function(func_result):
							current = process_ast_function(context, current_ast, current_param, func_result)



				elif is_punctuation(key):
					constant_value, context, current_ast, current_param, current = process_punctuation(ch,
					                                                                                   constant_value,
					                                                                                   context,
					                                                                                   current_ast,
					                                                                                   current_param,
					                                                                                   previous_ch,
					                                                                                   result, current)

				previous_ch = ch
	# Add the last word to the result

	return result


def process_punctuation(ch, constant_value: str, context: AstContext, current_ast: ConstantAST,
                        current_param: FuncParameter, previous_ch, result: List, current: ASTObject):
	if ch == "{":
		current_ast = ConstantAST()

	elif ch == "&":
		context = start_func_or_method(context, previous_ch)
	elif ch == "}":
		current_ast, current_param = end_ast(constant_value, context, current_ast, current_param, result, current)
		context = AstContext.END_AST
	elif ch == "(":
		## start parameter
		current_param = FuncParameter()
		context = AstContext.START_PARAMETER

	elif ch == ")":
		current_param = end_param(constant_value, context, current_ast, current_param, current)
		context = AstContext.END_PARAM
	elif "." == ch:
		current_param, current_ast = call_method(constant_value, current_ast, context, current_param)
		current = ASTObject.method
	elif "," == ch:
		current_param, context = split_param(constant_value, current_ast, current_param, current, context)
	return '', context, current_ast, current_param, current


def split_param(constant_value: str, current_ast: ConstantAST, current_param: FuncParameter, current: ASTObject,
                context: AstContext):
	if current == ASTObject.method and context == AstContext.START_PARAMETER:
		current_param.method = constant_value
	else:
		current_param.value.append(constant_value)

	current_ast.funcAst.params.append(current_param)
	current_param = None
	if context == AstContext.START_FUNCTION_PARAMETER:
		context = AstContext.START_PARAMETER

	return current_param, context


def call_method(constant_value, current_ast: ConstantAST, context: AstContext, current_param: FuncParameter):
	if context == AstContext.START_FUNCTION:
		current_ast.funcAst = FuncAst(name=constant_value)
	else:
		if current_param is None:
			current_param = FuncParameter()
		current_param.value.append(constant_value)

	return current_param, current_ast


def end_param(constant_value: str, context: AstContext, current_ast: ConstantAST, current_param: FuncParameter,
              current: ASTObject):
	if current_param:
		if context == AstContext.START_FUNCTION_PARAMETER:
			current_ast.funcAst.params.append(current_param)
		if current == ASTObject.method and context == AstContext.START_PARAMETER:
			current_param.method = constant_value
			current_ast.funcAst.params.append(current_param)
		else:
			current_param.value.append(constant_value)
	else:
		if current != ASTObject.function:
			current_ast.funcAst.params.append(constant_value)
	current_param = None

	return current_param


def empty_context(context: AstContext):
	return context is None or context == AstContext.END_AST


def end_ast(constant_value: str, context: AstContext, current_ast: ConstantAST, current_param: FuncParameter,
            result: List, current: ASTObject):
	if current_param:
		current_ast.params.append(current_param)
	if current == ASTObject.method and context == AstContext.START_FUNCTION:
		current_ast.funcAst.method = constant_value
	elif context == AstContext.START_OBJECT_FUNC and current == ASTObject.method and current_param:
		current_param.method = constant_value
	elif empty_context(context) and current == ASTObject.method and current_param:
		current_param.method = constant_value
	if constant_value and current_param is None:
		parameter = FuncParameter()
		parameter.value.append(constant_value)
		current_ast.params.append(parameter)

	current_param = None
	result.append(current_ast)
	current_ast = None
	return current_ast, current_param


def start_func_or_method(context, previous_ch):
	if context == AstContext.START_PARAMETER and previous_ch != ".":
		context = AstContext.START_FUNCTION_PARAMETER
	elif previous_ch == '.':
		context = AstContext.START_OBJECT_FUNC
	else:
		context = AstContext.START_FUNCTION
	return context


def is_punctuation(key: str):
	return key == "punctuation"


def is_word(key: str):
	return key == 'word'
#


#
# print(parse_constant_parameter("{&dayDiff(&now,eb_policy_listing.effective_dt)}"))
# # #
# print(parse_constant_parameter("{x.t}  {b.s}"))
# print(parse_constant_parameter("{da.b.c}  {b.s}"))
# print(parse_constant_parameter("{&nextSeq}"))
# print(parse_constant_parameter("{&daydiff(dataset_clm_case.settle_approve_date,dataset_clm_case.report_time)}"))

# print(parse_constant_parameter("{&x.daa}"))
# print(parse_constant_parameter("{&dateDiff(test.date,test2.date2)}"))
