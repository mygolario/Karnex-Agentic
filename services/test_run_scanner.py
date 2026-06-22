import asyncio
import pytest
from unittest.mock import MagicMock, patch

from agents.mvp_scanner.agent import run_scanner
from agents.mvp_scanner.schemas import MvpScannerInput, SitemapPage

@pytest.mark.asyncio
@patch("agents.mvp_scanner.agent.crawl_website_with_fallback")
@patch("agents.mvp_scanner.agent.parse_github_repository")
@patch("agents.mvp_scanner.agent.create_chat_model")
@patch("agents.mvp_scanner.agent.invoke_structured_with_retry")
@patch("shared.agent_run_logging.get_supabase_admin")
async def test_run_scanner_success(
    mock_get_supabase_logging,
    mock_invoke,
    mock_create_model,
    mock_parse_github,
    mock_crawl,
):
    # Mock crawler content
    mock_crawl.return_value = "Page Title: Mock SaaS\nFeatures: Stripe payments, Login\n"
    mock_parse_github.return_value = "Mock file tree..."
    
    # Mock LLM response
    class MockOutput:
        sitemap = [
            SitemapPage(path="/", title="Home", features=["Hero section", "Stripe pricing"], copy_snippets={"headline": "Mock Startup"}),
            SitemapPage(path="/dashboard", title="Dashboard", features=["Data charts"], copy_snippets={"welcome": "Hello Founder"})
        ]
        features = ["Stripe payments", "Google OAuth", "Analytics Dashboard"]
        tech_stack = {"framework": "nextjs", "styling": "tailwind", "database": "supabase"}
        copy_bank = {"slogans": ["Moat is your pain"]}
        summary = "This is a mock SaaS startup scanned context."
        
        def model_dump(self):
            return {
                "sitemap": [p.model_dump() for p in self.sitemap],
                "features": self.features,
                "tech_stack": self.tech_stack,
                "copy_bank": self.copy_bank,
                "summary": self.summary
            }
            
    mock_invoke.return_value = MockOutput()
    
    # Supabase Client Mock
    mock_supabase = MagicMock()
    
    # Mock the execute() return values for table queries
    mock_response = MagicMock()
    mock_response.data = {"logs": []}
    
    mock_supabase.table.return_value.upsert.return_value.execute = MagicMock(return_value=mock_response)
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute = MagicMock(return_value=mock_response)
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute = MagicMock(return_value=mock_response)
    
    mock_get_supabase_logging.return_value = mock_supabase
    
    input_data = MvpScannerInput(
        founder_id="user-123",
        url="https://mock-saas.com",
        github_repo="https://github.com/user/repo",
        mvp_source_platform="lovable",
        forge_project_id="proj-123",
        startup_id="start-123"
    )
    
    output = await run_scanner(input_data, run_id="run-123", supabase=mock_supabase)
    
    assert output.summary == "This is a mock SaaS startup scanned context."
    assert "Stripe payments" in output.features
    assert output.tech_stack["framework"] == "nextjs"
    assert len(output.sitemap) == 2
    print("Test passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_run_scanner_success())
