"""Tools for the Pain-to-Product Transformer agent."""

import re
from typing import Dict, Any, List, Optional
import httpx
from services.shared.logger import logger
from services.shared.supabase_client import get_supabase_admin

# A simple in-memory fallback cache for local development when Supabase is not running
_local_memory_db: Dict[str, Dict[str, Any]] = {}


def web_search(query: str) -> str:
    """Performs a web search on the query using DuckDuckGo HTML or Instant Answer API.

    Args:
        query: The search term or phrase.

    Returns:
        str: A text summary of search findings.
    """
    logger.info(f"Executing web_search for query: {query}")
    try:
        # First, try to fetch from DuckDuckGo Instant Answer JSON API
        url = f"https://api.duckduckgo.com/?q={httpx.encode_uri(query)}&format=json&no_html=1"
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            response = client.get(url)
            if response.status_code == 200:
                data = response.json()
                abstract = data.get("AbstractText", "")
                related_topics = data.get("RelatedTopics", [])

                results = []
                if abstract:
                    results.append(f"Abstract: {abstract}")

                for topic in related_topics[:3]:
                    if "Text" in topic and "FirstURL" in topic:
                        results.append(f"- {topic['Text']} (Source: {topic['FirstURL']})")

                if results:
                    return "\n".join(results)

        # Fallback to direct HTML search and parse using simple regex to avoid beautifulsoup dependency
        html_url = f"https://html.duckduckgo.com/html/?q={httpx.encode_uri(query)}"
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            response = client.get(
                html_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            )
            if response.status_code == 200:
                # Find all links/snippets in the DDG HTML
                # Simple extraction of result snippets
                snippets = re.findall(
                    r'<a class="result__snippet"[^>]*>(.*?)</a>',
                    response.text,
                    re.DOTALL
                )
                titles = re.findall(
                    r'<a class="result__url"[^>]*>(.*?)</a>',
                    response.text,
                    re.DOTALL
                )

                extracted = []
                for i, (title, snippet) in enumerate(zip(titles[:4], snippets[:4])):
                    # Clean HTML tags
                    clean_title = re.sub('<[^<]+?>', '', title).strip()
                    clean_snippet = re.sub('<[^<]+?>', '', snippet).strip()
                    extracted.append(f"{i+1}. {clean_title}\n   {clean_snippet}")

                if extracted:
                    return "\n\n".join(extracted)

        return f"No direct search results found for: '{query}'. Proceeding with default market insights."
    except Exception as e:
        logger.warning(f"Web search failed for query '{query}': {str(e)}")
        return f"Web search currently unavailable. Fallback: proceed using core product heuristics."


def karnex_memory_read(founder_id: str, namespace: str, key: str) -> Optional[Dict[str, Any]]:
    """Reads a memory value from the database or local fallback.

    Args:
        founder_id: Unique ID of the founder.
        namespace: The namespace of the memory.
        key: The key of the memory.

    Returns:
        Optional[Dict[str, Any]]: The structured memory value if found.
    """
    logger.info(f"Reading memory for founder={founder_id}, namespace={namespace}, key={key}")
    db_key = f"{founder_id}:{namespace}:{key}"

    # Try Supabase first
    try:
        supabase = get_supabase_admin()
        response = supabase.table("founder_memory").select("value").eq("founder_id", founder_id).eq("namespace", namespace).eq("key", key).maybe_single().execute()
        if response and response.data:
            return response.data.get("value")
    except Exception as e:
        logger.warning("Supabase memory read failed, using local in-memory fallback", extra={"error": str(e)})

    # Fallback to local
    return _local_memory_db.get(db_key)


def karnex_memory_write(
    founder_id: str, namespace: str, key: str, value: Dict[str, Any], tags: Optional[List[str]] = None
) -> bool:
    """Writes a memory value to the database or local fallback.

    Args:
        founder_id: Unique ID of the founder.
        namespace: The namespace of the memory.
        key: The key of the memory.
        value: The dictionary content to store.
        tags: Optional searchable tags.

    Returns:
        bool: True if writing succeeded, False otherwise.
    """
    if tags is None:
        tags = []
    logger.info(f"Writing memory for founder={founder_id}, namespace={namespace}, key={key}")
    db_key = f"{founder_id}:{namespace}:{key}"

    # Update local memory database
    _local_memory_db[db_key] = value

    # Try Supabase
    try:
        supabase = get_supabase_admin()
        # Insert or upsert
        payload = {
            "founder_id": founder_id,
            "namespace": namespace,
            "key": key,
            "value": value,
            "tags": tags,
        }
        supabase.table("founder_memory").upsert(payload, on_conflict="founder_id,namespace,key").execute()
        return True
    except Exception as e:
        logger.warning("Supabase memory write failed, wrote to local memory cache only", extra={"error": str(e)})
        return True
