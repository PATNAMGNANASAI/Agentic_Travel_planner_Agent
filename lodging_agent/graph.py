from langgraph.graph import StateGraph, START, END
from .state import LodgingState
from .node import generate_lodging_plan

def build_lodging_graph():
    builder = StateGraph(LodgingState)
    builder.add_node("planner", generate_lodging_plan)
    builder.add_edge(START, "planner")
    builder.add_edge("planner", END)
    return builder.compile()

lodging_graph = build_lodging_graph()