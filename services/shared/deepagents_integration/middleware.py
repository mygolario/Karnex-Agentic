import logging
from typing import Any, Callable, Awaitable
from langchain.agents.middleware import AgentMiddleware, AgentState
from langchain.agents.middleware.types import ModelRequest, ModelResponse
from langgraph.runtime import Runtime
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import AIMessage, ToolMessage
from shared.agent_run_logging import advance_step, append_run_log

logger = logging.getLogger(__name__)


def _extract_ai_message(response: Any) -> Any:
    """Helper to extract AIMessage from ModelResponse or ExtendedModelResponse."""
    if hasattr(response, "model_response"):
        response = response.model_response

    if hasattr(response, "result") and response.result:
        return response.result[0]

    return response


class KarnexLoggingMiddleware(AgentMiddleware[AgentState, Any, Any]):
    """Middleware that hooks into Deep Agent execution to push live logs/steps to Supabase."""

    def __init__(self, run_id: str, founder_id: str) -> None:
        self.run_id = run_id
        self.founder_id = founder_id
        self._step_counter = 0

    def before_agent(self, state: AgentState, runtime: Runtime, config: RunnableConfig) -> dict[str, Any] | None:
        logger.info(f"Agent execution started for run_id={self.run_id}")
        append_run_log(self.run_id, "system", "Deep Agent execution started.")
        return None

    async def abefore_agent(self, state: AgentState, runtime: Runtime, config: RunnableConfig) -> dict[str, Any] | None:
        logger.info(f"Agent execution started (async) for run_id={self.run_id}")
        append_run_log(self.run_id, "system", "Deep Agent execution started.")
        return None

    def wrap_model_call(
        self,
        request: ModelRequest[Any],
        handler: Callable[[ModelRequest[Any]], ModelResponse[Any]],
    ) -> ModelResponse[Any]:
        # Intercept input messages to log tool completion
        messages = request.messages
        if messages:
            last_msg = messages[-1]
            if isinstance(last_msg, ToolMessage):
                snippet = str(last_msg.content)[:200]
                append_run_log(
                    self.run_id,
                    "system",
                    f"Tool '{last_msg.name}' completed. Result: {snippet}..."
                )

        response = handler(request)

        # Intercept output response to log tool calls or text content
        ai_msg = _extract_ai_message(response)
        if ai_msg and isinstance(ai_msg, AIMessage):
            if ai_msg.tool_calls:
                for tc in ai_msg.tool_calls:
                    self._step_counter += 1
                    advance_step(
                        self.run_id,
                        self._step_counter,
                        step_label=f"Spawning tool: {tc['name']}",
                        tool_name=tc['name'],
                    )
            elif ai_msg.content:
                append_run_log(self.run_id, "agent", str(ai_msg.content)[:1000])

        return response

    async def awrap_model_call(
        self,
        request: ModelRequest[Any],
        handler: Callable[[ModelRequest[Any]], Awaitable[ModelResponse[Any]]],
    ) -> ModelResponse[Any]:
        messages = request.messages
        if messages:
            last_msg = messages[-1]
            if isinstance(last_msg, ToolMessage):
                snippet = str(last_msg.content)[:200]
                append_run_log(
                    self.run_id,
                    "system",
                    f"Tool '{last_msg.name}' completed. Result: {snippet}..."
                )

        response = await handler(request)

        ai_msg = _extract_ai_message(response)
        if ai_msg and isinstance(ai_msg, AIMessage):
            if ai_msg.tool_calls:
                for tc in ai_msg.tool_calls:
                    self._step_counter += 1
                    advance_step(
                        self.run_id,
                        self._step_counter,
                        step_label=f"Spawning tool: {tc['name']}",
                        tool_name=tc['name'],
                    )
            elif ai_msg.content:
                append_run_log(self.run_id, "agent", str(ai_msg.content)[:1000])

        return response
