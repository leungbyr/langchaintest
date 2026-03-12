import argparse

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, AIMessageChunk, AnyMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langchain_ollama import ChatOllama
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv
from langgraph.prebuilt.tool_node import ToolRuntime
from langchain.agents.middleware import ToolCallLimitMiddleware
import pexpect

from context import CLIContext
from schema import PdbCommandInput

@tool(args_schema=PdbCommandInput)
def send_pdb_command(command: str, runtime: ToolRuntime[CLIContext]) -> str:
    """Sends a command to PDB and returns the output"""
    child = runtime.context.child
    child.sendline(command)
    child.expect_exact('(Pdb)')
    return child.before

def _render_message_chunk(token: AIMessageChunk) -> None:
    if token.text:
        print(token.text, end="|")
    if token.tool_call_chunks:
        print(token.tool_call_chunks)
    # N.B. all content is available through token.content_blocks

def _render_completed_message(message: AnyMessage) -> None:
    if isinstance(message, AIMessage) and message.tool_calls:
        print(f"Tool calls: {message.tool_calls}")
    if isinstance(message, ToolMessage):
        print(f"Tool response: {message.content_blocks}")


# Define tool to step in debugger


# Call LLM to step through code and figure out what went wrong

# Ideally we would execute a file, the LLM would automatically do it's thing and then we get a final output of at which step the code went wrong

if __name__ == "__main__":
    load_dotenv()

    parser = argparse.ArgumentParser(
        prog="ProgramName",
        description="What the program does",
        epilog="Text at the bottom of help",
    )

    parser.add_argument("filename", type=str, help="The filename to run")

    args = parser.parse_args()
    
    child = pexpect.spawn(f'python3 -m pdb {args.filename}', encoding='utf-8')

    model = init_chat_model("gpt-5.1-codex-mini")

    agent = create_agent(
        model=model,
        tools=[send_pdb_command],
        context_schema=CLIContext,
        system_prompt="You are a Python debugger assistant that steps through Python code and returns information about the program",
        middleware=[ToolCallLimitMiddleware(run_limit=10)]
    )

    for chunk in agent.stream(
        {"messages": [{"role": "user", "content": "You have been given access to a PDB session and are able to call the send_pdb_command tool to step through the code that is being debugged. Step through the code line by line and analyze the program at each step. Return a summary of what you found during the debugging. If the number of steps exceeds 5, continue the program and return."}]},
        context=CLIContext(child=child),
        stream_mode=["messages", "updates"],
        version="v2",
    ):
        if chunk["type"] == "messages":
            token, metadata = chunk["data"]
            if isinstance(token, AIMessageChunk):
                _render_message_chunk(token)
        elif chunk["type"] == "updates":
            for source, update in chunk["data"].items():
                if source in ("model", "tools"):  # `source` captures node name
                    _render_completed_message(update["messages"][-1])
