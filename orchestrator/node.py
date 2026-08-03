from langchain_core.messages import HumanMessage
from langchain_aws import ChatBedrock
from .state import OrchestratorState
from .prompts import SUPERVISOR_PROMPT, SYNTHESIS_PROMPT

llm = ChatBedrock(
    model_id="eu.anthropic.claude-opus-4-8",
    region_name="eu-north-1",
    max_tokens=10000
)

def supervisor_decision(state: OrchestratorState):
    prompt = SUPERVISOR_PROMPT.format(
        origin=state.get("origin"),
        destination=state.get("destination"),
        budget_limit=state.get("budget_limit"),
        transport_plan=state.get("transport_plan", "None"),
        lodging_plan=state.get("lodging_plan", "None"),
        total_estimated_cost=state.get("total_estimated_cost", 0.0)
    )
    
    response = llm.invoke([HumanMessage(content=prompt)])
    next_step = response.content.strip().upper()
    
    if next_step not in ["TRANSPORT", "LODGING", "SYNTHESIZE", "RESTART"]:
        next_step = "SYNTHESIZE" # fail-safe
        
    return {"next_agent": next_step}

def synthesize_itinerary(state: OrchestratorState):
    prompt = SYNTHESIS_PROMPT.format(
        origin=state.get("origin"),
        destination=state.get("destination"),
        budget_limit=state.get("budget_limit"),
        transport_plan=state.get("transport_plan"),
        lodging_plan=state.get("lodging_plan"),
        total_estimated_cost=state.get("total_estimated_cost")
    )
    
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"final_itinerary": response.content}