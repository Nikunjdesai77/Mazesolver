from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from typing import Any, Dict
import os
from maze import generate_random_maze, bfs_solve, dfs_solve, astar_solve  # add dfs_solve, astar_solve

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

app = Flask(__name__, static_folder=None)
CORS(app)


@app.get("/")
def root() -> Any:
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.get("/style.css")
def style() -> Any:
    return send_from_directory(FRONTEND_DIR, "style.css")

@app.get("/app.js")
def script() -> Any:
    return send_from_directory(FRONTEND_DIR, "app.js")

@app.get("/api/health")
def health() -> Any:
    return {"status": "ok"}


@app.post("/api/generate")
def generate() -> Any:
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    rows = int(data.get("rows", 20))
    cols = int(data.get("cols", 20))
    wall_probability = float(data.get("wallProbability", 0.3))
    seed = data.get("seed")
    try:
        grid = generate_random_maze(rows, cols, wall_probability, seed)
        return jsonify({"grid": grid, "start": [0, 0], "end": [rows - 1, cols - 1]})
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 400


@app.post("/api/solve")
def solve():
    data = request.get_json(force=True) or {}
    grid = data.get("grid")
    start = data.get("start")
    end = data.get("end")
    algo = (data.get("algorithm") or "bfs").lower()
    if not isinstance(grid, list) or start is None or end is None:
        return jsonify({"error": "grid, start, end are required"}), 400
    s = (int(start[0]), int(start[1]))
    t = (int(end[0]), int(end[1]))
    if algo == "dfs":
        result = dfs_solve(grid, s, t)
    elif algo in ("a*", "astar", "a-star"):
        result = astar_solve(grid, s, t)
    else:
        result = bfs_solve(grid, s, t)
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


