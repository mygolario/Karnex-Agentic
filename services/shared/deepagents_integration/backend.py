from __future__ import annotations
import logging
from pathlib import Path
from deepagents.backends.filesystem import FilesystemBackend
from deepagents.backends.protocol import WriteResult, EditResult
from shared.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

class KarnexMemoryBackend(FilesystemBackend):
    """Custom FilesystemBackend that synchronizes writes and edits back to Supabase founder_memory table."""

    def __init__(self, root_dir: str | Path | None = None, founder_id: str | None = None) -> None:
        super().__init__(root_dir=root_dir)
        self.founder_id = founder_id

    def write(self, file_path: str, content: str) -> WriteResult:
        result = super().write(file_path, content)
        if result.error is None and self.founder_id:
            try:
                from agents.pain_transformer.tools import karnex_memory_write
                karnex_memory_write(
                    self.founder_id,
                    namespace="deepagents_fs",
                    key=file_path.replace("\\", "/"),
                    value={"content": content},
                    tags=["filesystem", "sync"]
                )
            except Exception as e:
                logger.warning(f"Failed to sync write of {file_path} to Supabase: {e}")
        return result

    def edit(self, file_path: str, old_string: str, new_string: str, replace_all: bool = False) -> EditResult:
        result = super().edit(file_path, old_string, new_string, replace_all)
        if result.error is None and self.founder_id:
            try:
                from agents.pain_transformer.tools import karnex_memory_write
                read_res = self.read(file_path)
                if read_res.file_data and read_res.file_data.get("content"):
                    karnex_memory_write(
                        self.founder_id,
                        namespace="deepagents_fs",
                        key=file_path.replace("\\", "/"),
                        value={"content": read_res.file_data["content"]},
                        tags=["filesystem", "sync"]
                    )
            except Exception as e:
                logger.warning(f"Failed to sync edit of {file_path} to Supabase: {e}")
        return result

def sync_down_memories(founder_id: str, local_dir: str | Path):
    """Query Supabase deepagents_fs namespace for this founder_id and write them locally."""
    try:
        supabase = get_supabase_admin()
        res = (
            supabase.table("founder_memory")
            .select("key, value")
            .eq("founder_id", founder_id)
            .eq("namespace", "deepagents_fs")
            .execute()
        )
        if res and res.data:
            logger.info(f"Syncing down {len(res.data)} files from Supabase for founder={founder_id}...")
            root = Path(local_dir)
            for row in res.data:
                file_rel_path = row["key"]
                content = row["value"].get("content", "")
                dest_path = root / file_rel_path.lstrip("/")
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                dest_path.write_text(content, encoding="utf-8")
    except Exception as e:
        logger.warning(f"Could not sync down memories from Supabase: {e}")
