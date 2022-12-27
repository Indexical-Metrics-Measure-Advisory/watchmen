from enum import Enum
from typing import List

from pydantic import BaseModel


class MethodType(str, Enum):
	Function = "Function"
	Factor = "factor"


class AstMethod(BaseModel):
	type: MethodType = None
	value: str = None


class ConstantType(str, Enum):
	TEXT = "text"
	FUNC = "function"


class FuncParameter(BaseModel):
	paramType: str = None
	value: List = []
	method: str = None


class FuncAst(BaseModel):
	name: str = None
	params: List = []
	method: str = None


class ConstantAST(BaseModel):
	constantType: ConstantType = None
	params: List = []
	funcAst: FuncAst = None


class ASTObject(str, Enum):
	function = "Function"
	param = "Parameter"
	method = "Method"
