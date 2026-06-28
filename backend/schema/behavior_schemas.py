from typing import Literal

from pydantic import BaseModel, Field


class IdentifiedTrait(BaseModel):
    """A behavioral trait inferred from chat communication patterns."""

    trait: str = Field(description="The behavioral trait category name")
    confidence: int = Field(
        ge=0,
        le=100,
        description="Confidence score from 0 to 100",
    )
    evidence_level: Literal["Strong", "Moderate", "Weak"] = Field(
        description="Strength of evidence for this trait",
    )
    reasoning: str = Field(
        description=(
            "Abstract description of the person's nature explaining why this trait "
            "is present. Describe WHO they are and HOW they behave. "
            "Never quote, paraphrase, or reference any specific message."
        ),
    )


class CommunicationStyle(BaseModel):
    """How the person communicates in the group chat."""

    tone: str = Field(description="Overall tone of communication")
    formality: str = Field(description="Level of formality in messages")
    emotional_expression: str = Field(description="How emotions are expressed")
    social_behavior: str = Field(description="Social interaction patterns")
    humor: str = Field(description="Use and style of humor")
    leadership: str = Field(description="Leadership tendencies in group chat")


class BehaviorAnalysisOutput(BaseModel):
    """Structured behavioral analysis for one chat participant."""

    overall_summary: str = Field(
        description=(
            "3-4 sentence narrative of the person's nature, character, and behavioral "
            "tendencies. Abstract analytical language only. No message references."
        ),
    )
    identified_traits: list[IdentifiedTrait] = Field(
        description="Traits supported by sufficient evidence",
    )
    insufficient_evidence: list[str] = Field(
        description="Trait category names where evidence was insufficient",
    )
    communication_style: CommunicationStyle = Field(
        description="Summary of communication style dimensions",
    )
    risk_flags: list[str] = Field(
        description="Caveats such as insufficient data, sarcasm, or mostly jokes",
    )
