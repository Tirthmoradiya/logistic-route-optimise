# logistic-route-optimiser

Data Storage & Setup: The script maintains a route graph, city positions, and caches while defining Gujarat's geographical bounds.

UI Initialization: Event listeners are set up on page load, and an empty graph message is displayed if no cities exist.

Form Handling: User inputs start and end cities along with cost and time, ensuring valid data before adding routes.

Route Management: Routes are stored in a graph structure, ensuring bi-directional connections between cities.

Position Calculation: New cities are placed optimally and Gujarat’s bounds are predefined

Graph Visualization: The graph is displayed as an interactive SVG, with cities and routes positioned using scaling functions.

Pathfinding Algorithms: Implements Dijkstra, A*, DFS, BFS, Bellman-Ford, and Floyd-Warshall for shortest path calculations.

Route Finding Functions: Allows users to input start and end cities to compute optimal routes based on cost or time.

Error Handling: Alerts users if cities are missing or routes are unavailable, displaying the network status.

Scalability & Optimization: Uses caching and efficient computations to handle multiple routes dynamically.
