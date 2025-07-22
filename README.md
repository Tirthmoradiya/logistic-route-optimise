# logistic-route-optimiser

## Project Description
A web-based tool for optimizing logistic routes between cities in Gujarat. It allows users to add cities and routes, visualize the network, and compute the most efficient paths using various algorithms. Designed for logistics companies, students, and anyone interested in route optimization and graph algorithms.

## Features
- Interactive graph visualization of cities and routes
- Add, edit, and manage cities and routes dynamically
- Supports multiple pathfinding algorithms:
  - Dijkstra
  - A*
  - Depth-First Search (DFS)
  - Breadth-First Search (BFS)
  - Bellman-Ford
  - Floyd-Warshall
- Route optimization based on cost or time
- Error handling for invalid inputs and missing routes
- Caching and efficient computations for scalability

## Technical Details
- Data Storage & Setup: Maintains a route graph, city positions, and caches within Gujarat's geographical bounds.
- UI Initialization: Event listeners on page load; displays an empty graph message if no cities exist.
- Form Handling: Validates user input for cities, cost, and time before adding routes.
- Route Management: Bi-directional graph structure for city connections.
- Position Calculation: Optimal placement of new cities within predefined bounds.
- Graph Visualization: Interactive SVG with scaling functions for positioning.
- Pathfinding Algorithms: Implements Dijkstra, A*, DFS, BFS, Bellman-Ford, and Floyd-Warshall.
- Route Finding Functions: Computes optimal routes based on user input.
- Error Handling: Alerts for missing cities/routes and displays network status.
- Scalability & Optimization: Uses caching and efficient computations for dynamic route management.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/logistic-route-optimise.git
   ```
2. Open the project folder:
   ```bash
   cd logistic-route-optimise
   ```

## How to Run

### Method 1: Double-click (All Platforms)
- Locate the `index.html` file in the project folder.
- Double-click `index.html` to open it in your default web browser.

### Method 2: Open in Browser (All Platforms)
- Open your preferred web browser.
- Use `File > Open` (or press `Ctrl+O`/`Cmd+O`) and select the `index.html` file from the project folder.

### Method 3: Command Line (Windows, Linux, Mac)
- Open a terminal or command prompt.
- Navigate to the project directory:
  ```bash
  cd path/to/logistic-route-optimise
  ```
- Use the following command to open `index.html` in your default browser:
  - **Windows:**
    ```cmd
    start index.html
    ```
  - **Mac:**
    ```bash
    open index.html
    ```
  - **Linux:**
    ```bash
    xdg-open index.html
    ```

## Usage
- Add cities and routes using the provided form.
- Select start and end cities to compute the optimal route based on cost or time.
- Visualize the network and explore different algorithms for route optimization.

## Technologies Used
- HTML, CSS, JavaScript (Vanilla)
- SVG for graph visualization

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request. For major changes, open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License.