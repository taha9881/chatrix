from pydantic import BaseModel, Field


class MonthSummaryOutput(BaseModel):
    """AI-generated summary for a single month of chat history."""

    topics: list[str] = Field(
        description=(
            "List of 3-6 distinct topics discussed this month. "
            "Each topic MUST be exactly 1-2 words (e.g. 'Travel Plans', 'Gaming', 'Family'). "
            "No duplicates. Capitalize each word."
        ),
    )
    summary: str = Field(
        description=(
            "3-5 sentence narrative of what was going on in the conversation this month. "
            "Describe the overall mood, major themes, social dynamics, and notable shifts in tone. "
            "Write in an engaging, analytical style — as if summarizing a chapter of someone's social life. "
            "NEVER quote, paraphrase, or directly reference any specific message. "
            "NEVER use phrases like 'message #X', 'someone said', or 'one person wrote'. "
            "Pure abstract summary only."
        ),
    )
