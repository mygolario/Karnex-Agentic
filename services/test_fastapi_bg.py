import asyncio
import os
import sys
import uuid

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.builder.schemas import BuilderInput, TechStack
from api.routes.agents import run_builder_async_wrapper


async def main():
    print("Testing run_builder_async_wrapper...")

    # 1. Prepare inputs
    run_id = str(uuid.uuid4())
    founder_id = "bd00f3a0-ac1a-4cad-b42f-64de9a005545" # Active founder

    input_data = BuilderInput(
        founder_id=founder_id,
        task_type="landing_page",
        specification="Create a simple landing page.",
        tech_stack=TechStack(framework="nextjs", styling="tailwind", database="supabase")
    )

    print(f"Triggering background task wrapper for run {run_id}...")

    # We schedule it as a background task to mimic FastAPI
    task = asyncio.create_task(run_builder_async_wrapper(run_id, input_data))

    # Wait for the task to finish
    await task
    print("Background task wrapper execution finished!")

if __name__ == "__main__":
    asyncio.run(main())
