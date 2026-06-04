import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.builder.agent import run_builder
from agents.builder.schemas import BuilderInput, TechStack
from shared.supabase_client import get_supabase_admin


async def test():
    print("Testing run_builder...")
    supabase = get_supabase_admin()

    # 1. Create a dummy run ID in agent_runs
    run_id = str(uuid.uuid4())
    # Fetch a valid founder ID from the database
    founders_res = supabase.table("founders").select("id").limit(1).execute()
    if not founders_res.data:
        raise RuntimeError("No founders found in the database. Please register a user first.")
    founder_id = founders_res.data[0]["id"]

    print(f"Creating run {run_id} in database...")
    supabase.table("agent_runs").insert({
        "id": run_id,
        "founder_id": founder_id,
        "agent_id": "builder-v1",
        "agent_version": "v1.0.0",
        "status": "queued",
        "input": {
            "specification": "Create a simple landing page.",
            "task_type": "landing_page"
        },
        "triggered_by": "user",
        "started_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    print("Successfully created agent_run!")

    # 2. Invoke run_builder
    input_data = BuilderInput(
        founder_id=founder_id,
        task_type="landing_page",
        specification="Create a simple landing page.",
        tech_stack=TechStack(framework="nextjs", styling="tailwind", database="supabase")
    )

    try:
        print("Invoking run_builder function...")
        result = await run_builder(input_data, run_id)
        print("run_builder completed successfully!")
        print("Files generated:", len(result.files))

        # Verify run_status in db
        db_run = supabase.table("agent_runs").select("status").eq("id", run_id).single().execute()
        print("DB Run Status:", db_run.data)

    except Exception:
        print("run_builder failed with error:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
