# FleetFlow: Route Optimization Dashboard

## Project Description
FleetFlow is a modern, interactive web platform for optimizing and visualizing logistics routes and transport networks. It enables users to add cities and routes, visualize the network, and compare the performance of multiple pathfinding algorithms. Designed for logistics professionals, students, and anyone interested in route optimization, network analysis, and graph algorithms.

## Features
- Interactive, full-width map visualization of cities and routes
- Add, edit, and manage cities and routes dynamically
- Compare multiple pathfinding algorithms side-by-side:
  - Dijkstra
  - A*
  - Depth-First Search (DFS)
  - Breadth-First Search (BFS)
  - Bellman-Ford
  - Floyd-Warshall
  - Bidirectional Dijkstra
  - Bidirectional A*
  - ALT (Landmark-based A*)
- Route optimization based on cost or time
- Modern UI/UX with animations, color-coded results, and a responsive design
- Visual legend for map color coding (min cost, min time, default routes)
- Algorithm timing and performance comparison
- Error handling for invalid inputs and missing routes
- Caching and efficient computations for scalability

## Technical Details
- Data Storage & Setup: Maintains a route graph, city positions, and caches
- UI Initialization: Event listeners on page load; displays an empty graph message if no cities exist
- Form Handling: Validates user input for cities, cost, and time before adding routes
- Route Management: Bi-directional graph structure for city connections
- Position Calculation: Optimal placement of new cities within predefined bounds
- Graph Visualization: Interactive SVG with scaling functions for positioning
- Pathfinding Algorithms: Implements Dijkstra, A*, DFS, BFS, Bellman-Ford, Floyd-Warshall, Bidirectional, and ALT
- Route Finding Functions: Computes optimal routes based on user input
- Error Handling: Alerts for missing cities/routes and displays network status
- Scalability & Optimization: Uses caching and efficient computations for dynamic route management

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/fleetflow-route-dashboard.git
   ```
2. Open the project folder:
   ```bash
   cd fleetflow-route-dashboard
   ```
3. Open `index.html` in your web browser. No additional setup is required.

## Usage
- Add cities and routes using the provided form.
- Select start and end cities to compute the optimal route based on cost or time.
- Click "Compare All Algorithms" to see a side-by-side comparison of all supported algorithms, including timing.
- Visualize the network and explore different algorithms for route optimization.
- Use the map legend to interpret color coding for min cost (black), min time (red), and other routes (blue).

## Technologies Used
- HTML, CSS (modern, responsive, animated), JavaScript (Vanilla)
- SVG for graph visualization

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request. For major changes, open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License.