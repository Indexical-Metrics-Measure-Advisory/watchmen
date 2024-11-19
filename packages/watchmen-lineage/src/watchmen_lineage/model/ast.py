from enum import Enum
from typing import List, Optional
from watchmen_utilities import ExtendedBaseModel


class MethodType(str, Enum):
	Function = "Function"
	Factor = "factor"


class AstMethod(ExtendedBaseModel):
	type: Optional[MethodType] = None
	value: Optional[str] = None


class ConstantType(str, Enum):
	TEXT = "text"
	FUNC = "function"


class FuncParameter(ExtendedBaseModel):
	paramType: Optional[str] = None
	value: Optional[List] = []
	method: Optional[str] = None


class FuncAst(ExtendedBaseModel):
	name: Optional[str] = None
	params: List = []
	method: Optional[str] = None


class ConstantAST(ExtendedBaseModel):
	constantType: Optional[ConstantType] = None
	params: Optional[List] = []
	funcAst: Optional[FuncAst] = None


class ASTObject(str, Enum):
	function = "Function"
	param = "Parameter"
	method = "Method"
