from __future__ import annotations
from collections import deque
import random
import heapq
from typing import List, Tuple, Dict, Optional, Set

Cell = Tuple[int, int]


def generate_random_maze(rows: int, cols: int, wall_probability: float = 0.3, seed: Optional[int] = None) -> List[List[int]]:
	if rows <= 1 or cols <= 1:
		raise ValueError("rows and cols must be > 1")
	if not (0.0 <= wall_probability < 1.0):
		raise ValueError("wall_probability must be in [0.0, 1.0)")
	rng = random.Random(seed)
	grid = [[1 if rng.random() < wall_probability else 0 for _ in range(cols)] for _ in range(rows)]
	# Ensure start and end are open
	grid[0][0] = 0
	grid[rows - 1][cols - 1] = 0
	return grid


def bfs_solve(grid: List[List[int]], start: Cell, end: Cell) -> Dict:
	rows = len(grid)
	cols = len(grid[0]) if rows else 0
	sr, sc = start
	er, ec = end
	if not (0 <= sr < rows and 0 <= sc < cols and 0 <= er < rows and 0 <= ec < cols):
		raise ValueError("start or end out of bounds")
	if grid[sr][sc] == 1 or grid[er][ec] == 1:
		return {"found": False, "steps": 0, "path": [], "visited_order": []}

	directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
	queue: deque[Cell] = deque([start])
	visited = [[False] * cols for _ in range(rows)]
	visited[sr][sc] = True
	parent: Dict[Cell, Optional[Cell]] = {start: None}
	visited_order: List[Cell] = []

	while queue:
		r, c = queue.popleft()
		visited_order.append((r, c))
		if (r, c) == end:
			# reconstruct path
			path: List[Cell] = []
			cur: Optional[Cell] = end
			while cur is not None:
				path.append(cur)
				cur = parent[cur]
			path.reverse()
			return {
				"found": True,
				"steps": len(path) - 1,
				"path": path,
				"visited_order": visited_order,
			}
		for dr, dc in directions:
			nr, nc = r + dr, c + dc
			if 0 <= nr < rows and 0 <= nc < cols and not visited[nr][nc] and grid[nr][nc] == 0:
				visited[nr][nc] = True
				parent[(nr, nc)] = (r, c)
				queue.append((nr, nc))

	return {"found": False, "steps": 0, "path": [], "visited_order": visited_order}


def dfs_solve(grid: List[List[int]], start: Cell, end: Cell) -> Dict:
	rows = len(grid)
	cols = len(grid[0]) if rows else 0
	sr, sc = start
	er, ec = end
	if not (0 <= sr < rows and 0 <= sc < cols and 0 <= er < rows and 0 <= ec < cols):
		raise ValueError("start or end out of bounds")
	if grid[sr][sc] == 1 or grid[er][ec] == 1:
		return {"found": False, "steps": 0, "path": [], "visited_order": []}

	directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
	stack: List[Cell] = [start]
	visited = [[False] * cols for _ in range(rows)]
	visited[sr][sc] = True
	parent: Dict[Cell, Optional[Cell]] = {start: None}
	visited_order: List[Cell] = []

	while stack:
		r, c = stack.pop()
		visited_order.append((r, c))
		if (r, c) == end:
			path: List[Cell] = []
			cur: Optional[Cell] = end
			while cur is not None:
				path.append(cur)
				cur = parent[cur]
			path.reverse()
			return {"found": True, "steps": len(path) - 1, "path": path, "visited_order": visited_order}
		for dr, dc in directions:
			nr, nc = r + dr, c + dc
			if 0 <= nr < rows and 0 <= nc < cols and not visited[nr][nc] and grid[nr][nc] == 0:
				visited[nr][nc] = True
				parent[(nr, nc)] = (r, c)
				stack.append((nr, nc))

	return {"found": False, "steps": 0, "path": [], "visited_order": visited_order}


def astar_solve(grid: List[List[int]], start: Cell, end: Cell) -> Dict:
	rows = len(grid)
	cols = len(grid[0]) if rows else 0
	sr, sc = start
	er, ec = end
	if not (0 <= sr < rows and 0 <= sc < cols and 0 <= er < rows and 0 <= ec < cols):
		raise ValueError("start or end out of bounds")
	if grid[sr][sc] == 1 or grid[er][ec] == 1:
		return {"found": False, "steps": 0, "path": [], "visited_order": []}

	def h(a: Cell, b: Cell) -> int:
		return abs(a[0] - b[0]) + abs(a[1] - b[1])

	open_heap: List[Tuple[int, int, Cell]] = []
	g_score: Dict[Cell, int] = {start: 0}
	parent: Dict[Cell, Optional[Cell]] = {start: None}
	visited_set: Set[Cell] = set()
	visited_order: List[Cell] = []
	counter = 0
	heapq.heappush(open_heap, (h(start, end), counter, start))

	directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]

	while open_heap:
		_, _, current = heapq.heappop(open_heap)
		if current in visited_set:
			continue
		visited_set.add(current)
		visited_order.append(current)
		if current == end:
			path: List[Cell] = []
			cur: Optional[Cell] = end
			while cur is not None:
				path.append(cur)
				cur = parent[cur]
			path.reverse()
			return {"found": True, "steps": len(path) - 1, "path": path, "visited_order": visited_order}

		r, c = current
		for dr, dc in directions:
			nr, nc = r + dr, c + dc
			if not (0 <= nr < rows and 0 <= nc < cols):
				continue
			if grid[nr][nc] == 1:
				continue
			tentative_g = g_score[current] + 1
			neighbor = (nr, nc)
			if tentative_g < g_score.get(neighbor, 1 << 60):
				g_score[neighbor] = tentative_g
				parent[neighbor] = current
				counter += 1
				heapq.heappush(open_heap, (tentative_g + h(neighbor, end), counter, neighbor))

	return {"found": False, "steps": 0, "path": [], "visited_order": visited_order}


