from dataclasses import dataclass

import pexpect

@dataclass
class CLIContext:
    child: pexpect.spawn
