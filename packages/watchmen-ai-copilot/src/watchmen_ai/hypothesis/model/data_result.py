from typing import List, Dict, Optional

from watchmen_utilities import ExtendedBaseModel



class HypothesisDataResult(ExtendedBaseModel):
    data: List [Dict] =  []
    description: Optional[str] = None
