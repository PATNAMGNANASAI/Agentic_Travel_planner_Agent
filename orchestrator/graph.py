from langgraph.graph import StateGraph, START, END
from .state import OrchestratorState
from .node import supervisor_decision, synthesize_itinerary
from transport_agent.graph import transport_graph
from lodging_agent.graph import lodging_graph

def route_decision(state: OrchestratorState) -> str:
    agent = state.get("next_agent")
    if agent == "TRANSPORT": return "transport_agent"
    if agent == "LODGING": return "lodging_agent"
    if agent == "RESTART": return "transport_agent" # restart flow
    return "synthesizer"

def build_orchestrator():
    workflow = StateGraph(OrchestratorState)
    
    # Add nodes (integrating the sub-graphs as nodes)
    workflow.add_node("supervisor", supervisor_decision)
    workflow.add_node("transport_agent", transport_graph)
    workflow.add_node("lodging_agent", lodging_graph)
    workflow.add_node("synthesizer", synthesize_itinerary)
    
    # Build edges
    workflow.add_edge(START, "supervisor")
    
    # Conditional routing based on supervisor decision
    workflow.add_conditional_edges(
        "supervisor",
        route_decision,
        {
            "transport_agent": "transport_agent",
            "lodging_agent": "lodging_agent",
            "synthesizer": "synthesizer"
        }
    )
    
    # After a sub-agent runs, control returns to supervisor to check state
    workflow.add_edge("transport_agent", "supervisor")
    workflow.add_edge("lodging_agent", "supervisor")
    workflow.add_edge("synthesizer", END)
    
    return workflow.compile()

master_graph = build_orchestrator()