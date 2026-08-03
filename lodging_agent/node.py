import re
from langchain_core.messages import HumanMessage
from langchain_aws import ChatBedrock
from .state import LodgingState
from .prompts import LODGING_SYSTEM_PROMPT

llm = ChatBedrock(
    model_id="eu.anthropic.claude-opus-4-8",
    region_name="eu-north-1",
    max_tokens=10000
)

def generate_lodging_plan(state: LodgingState):
    budget = state.get("budget_limit", 0.0)
    spent = state.get("total_estimated_cost", 0.0)
    
    prompt = LODGING_SYSTEM_PROMPT.format(
        destination=state.get("destination", "Unknown"),
        transport_plan=state.get("transport_plan", "None"),
        budget_limit=budget,
        total_estimated_cost=spent,
        remaining_budget=budget - spent
    )
    
    response = llm.invoke([HumanMessage(content=prompt)])
    content = response.content
    
    plan_match = re.search(r"<plan>(.*?)</plan>", content, re.DOTALL)
    cost_match = re.search(r"<cost>(.*?)</cost>", content)
    
    plan = plan_match.group(1).strip() if plan_match else "Lodging plan could not be generated."
    cost = float(cost_match.group(1).strip()) if cost_match else 0.0
    
    return {
        "lodging_plan": plan,
        "total_estimated_cost": spent + cost
    }