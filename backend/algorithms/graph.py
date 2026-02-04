from typing import Dict, List, Tuple
import heapq

class CityGraph:
    def __init__(self):
        # adjacency_list format: {node: [(neighbor, distance), ...]}
        self.adjacency_list: Dict[str, List[Tuple[str, float]]] = {}
    
    def add_edge(self, u: str, v: str, weight: float, bidirectional: bool = True):
        if u not in self.adjacency_list:
            self.adjacency_list[u] = []
        if v not in self.adjacency_list:
            self.adjacency_list[v] = []
            
        self.adjacency_list[u].append((v, weight))
        if bidirectional:
            self.adjacency_list[v].append((u, weight))
            
    def find_shortest_path(self, start: str, end: str) -> Tuple[float, List[str]]:
        """
        Implements Dijkstra's Algorithm to find the shortest path.
        Returns tuple of (distance, path_of_nodes).
        """
        # Priority queue stores (distance, current_node)
        pq = [(0, start)]
        
        # Distances to all nodes, initialized to infinity
        distances = {node: float('infinity') for node in self.adjacency_list}
        distances[start] = 0
        
        # To reconstruct the path
        predecessors = {node: None for node in self.adjacency_list}
        
        while pq:
            current_distance, current_node = heapq.heappop(pq)
            
            if current_node == end:
                break
                
            if current_distance > distances[current_node]:
                continue
                
            for neighbor, weight in self.adjacency_list.get(current_node, []):
                distance = current_distance + weight
                
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    predecessors[neighbor] = current_node
                    heapq.heappush(pq, (distance, neighbor))
                    
        # Path Reconstruction
        path = []
        current = end
        if distances[end] == float('infinity'):
            return float('infinity'), []
            
        while current is not None:
            path.insert(0, current)
            current = predecessors[current]
            
        return distances[end], path
