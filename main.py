from dotenv import load_dotenv
load_dotenv()
#Aded a comment in main.py to test
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from orchestrator.graph import master_graph

app = FastAPI(title="Agentic Travel Orchestrator API")

class TravelRequest(BaseModel):
    origin: str
    destination: str
    budget: float

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/plan-trip")
async def plan_trip(request: TravelRequest):
    initial_state = {
        "messages": [],
        "origin": request.origin,
        "destination": request.destination,
        "budget_limit": request.budget,
        "transport_plan": "",
        "lodging_plan": "",
        "total_estimated_cost": 0.0,
        "next_agent": "",
        "final_itinerary": ""
    }
    
    try:
        # Execute the compiled master graph
        final_state = master_graph.invoke(initial_state)
        
        return {
            "status": "success",
            "origin": final_state["origin"],
            "destination": final_state["destination"],
            "total_cost": final_state["total_estimated_cost"],
            "itinerary": final_state["final_itinerary"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
