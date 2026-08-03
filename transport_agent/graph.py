from langgraph.graph import StateGraph, START, END
from .state import TransportState
from .node import generate_transport_plan

def build_transport_graph():
    builder = StateGraph(TransportState)
    builder.add_node("planner", generate_transport_plan)
    builder.add_edge(START, "planner")
    builder.add_edge("planner", END)
    return builder.compile()

transport_graph = build_transport_graph()