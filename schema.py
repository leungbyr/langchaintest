from pydantic import BaseModel
from typing import Literal

class PdbCommandInput(BaseModel):
    """Input for PDB command"""
    command: Literal["n", "s", "c", "p", "b", "r", "u", "d", "f", "w"]
