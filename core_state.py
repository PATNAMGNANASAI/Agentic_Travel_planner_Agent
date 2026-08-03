from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
import operator

class GlobalTravelState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    origin: str
    destination: str
    budget_limit: float
    transport_plan: str
    lodging_plan: str
    total_estimated_cost: float
    next_agent: str
    final_itinerary: str