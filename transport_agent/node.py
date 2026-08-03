import re
from langchain_core.messages import HumanMessage
from langchain_aws import ChatBedrock
from .state import TransportState
from .prompts import TRANSPORT_SYSTEM_PROMPT

llm = ChatBedrock(
    model_id="eu.anthropic.claude-opus-4-8",
    region_name="eu-north-1",
    max_tokens=10000
)

def generate_transport_plan(state: TransportState):
    prompt = TRANSPORT_SYSTEM_PROMPT.format(
        origin=state.get("origin", "Unknown"),
        destination=state.get("destination", "Unknown"),
        budget_limit=state.get("budget_limit", 0.0),
        total_estimated_cost=state.get("total_estimated_cost", 0.0)
    )
    
    response = llm.invoke([HumanMessage(content=prompt)])
    content = response.content
    
    plan_match = re.search(r"<plan>(.*?)</plan>", content, re.DOTALL)
    cost_match = re.search(r"<cost>(.*?)</cost>", content)
    
    plan = plan_match.group(1).strip() if plan_match else "Transport plan could not be generated."
    cost = float(cost_match.group(1).strip()) if cost_match else 0.0
    
    return {
        "transport_plan": plan,
        "total_estimated_cost": state.get("total_estimated_cost", 0.0) + cost
    }