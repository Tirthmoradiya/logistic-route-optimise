// Data Storage
const routeGraph = {};
const cityPositions = {};
const routeCache = new Map();
const gujaratBounds = {
    minLat: 20.1, maxLat: 24.7,
    minLng: 68.1, maxLng: 74.4
};

// Core UI Functions
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    showEmptyGraphMessage();
});

function setupEventListeners() {
    document.getElementById("addData").addEventListener("click", function() {
        const data = getFormData();
        if (!isValidData(data)) return;
        
        addNewRoute(data);
        clearForm();
        displayGraphNetwork();
    });
}

function getFormData() {
    return {
        start: document.getElementById("start").value.toUpperCase(),
        end: document.getElementById("end").value.toUpperCase(),
        cost: parseFloat(document.getElementById("cost").value),
        time: parseFloat(document.getElementById("time").value)
    };
}

function isValidData(data) {
    if (!data.start || !data.end) {
        alert("Please enter both start and end cities.");
        return false;
    }
    
    if (isNaN(data.cost) || isNaN(data.time)) {
        alert("Please enter valid cost and time values.");
        return false;
    }
    
    return true;
}

function clearForm() {
    ["start", "end", "cost", "time"].forEach(id => {
        document.getElementById(id).value = "";
    });
}

function clearMap() {
    Object.keys(routeGraph).forEach(key => delete routeGraph[key]);
    Object.keys(cityPositions).forEach(key => delete cityPositions[key]);
    document.getElementById("result").innerHTML = "";
    document.getElementById("network-visualization").innerHTML = "";
    showEmptyGraphMessage();
}

function showEmptyGraphMessage() {
    document.getElementById('network-visualization').innerHTML = 
        '<p style="text-align: center; padding: 20px; color: #666;">No cities added yet. Add cities to see the network.</p>';
}

// Route Management
function addNewRoute(data) {
    if (!routeGraph[data.start]) routeGraph[data.start] = {};
    if (!routeGraph[data.end]) routeGraph[data.end] = {};
    
    if (!cityPositions[data.start]) {
        cityPositions[data.start] = calculateOptimalPosition(cityPositions);
    }
    if (!cityPositions[data.end]) {
        cityPositions[data.end] = calculateOptimalPosition(cityPositions);
    }

    routeGraph[data.start][data.end] = { 
        cost: data.cost, 
        time: data.time 
    };
    
    routeGraph[data.end][data.start] = { 
        cost: data.cost, 
        time: data.time 
    };

    console.log(`Added route ${data.start} ↔ ${data.end}`, {
        start: cityPositions[data.start],
        end: cityPositions[data.end]
    });
}

function calculateOptimalPosition(existingLocations) {
    if (Object.keys(existingLocations).length === 0) {
        return { lat: 22.2587, lng: 71.1924 }; // Gujarat center
    }

    const idealDistance = 0.5;
    let bestPosition = null;
    let bestScore = Infinity;

    for (let lat = gujaratBounds.minLat; lat <= gujaratBounds.maxLat; lat += 0.3) {
        for (let lng = gujaratBounds.minLng; lng <= gujaratBounds.maxLng; lng += 0.3) {
            let score = calculatePositionScore(lat, lng, existingLocations, idealDistance);
            if (score < bestScore) {
                bestScore = score;
                bestPosition = { lat, lng };
            }
        }
    }
    return bestPosition;
}

function calculatePositionScore(lat, lng, existingLocations, idealDistance) {
    return Object.values(existingLocations).reduce((score, loc) => {
        const distance = Math.sqrt(
            Math.pow(lat - loc.lat, 2) + 
            Math.pow(lng - loc.lng, 2)
        );
        return score + Math.abs(distance - idealDistance);
    }, 0);
}

// Visualization
function displayGraphNetwork() {
    if (Object.keys(cityPositions).length === 0) {
        showEmptyGraphMessage();
        return;
    }

    const dimensions = { width: 1200, height: 800, padding: 70 };
    const bounds = calculateGraphBounds();
    const svgContent = generateSVGContent(dimensions, bounds);
    
    document.getElementById('network-visualization').innerHTML = svgContent;
}

function calculateGraphBounds() {
    if (Object.keys(cityPositions).length === 0) {
        return gujaratBounds;
    }
    
    const lats = Object.values(cityPositions).map(loc => loc.lat);
    const lngs = Object.values(cityPositions).map(loc => loc.lng);
    
    return {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs)
    };
}

function generateSVGContent(dimensions, bounds) {
    const { width, height, padding } = dimensions;
    
    const latPadding = (bounds.maxLat - bounds.minLat) * 0.1;
    const lngPadding = (bounds.maxLng - bounds.minLng) * 0.1;

    function scaleX(lng) {
        return padding + ((lng - (bounds.minLng - lngPadding)) / 
            ((bounds.maxLng + lngPadding) - (bounds.minLng - lngPadding))) * (width - 2 * padding);
    }
    
    function scaleY(lat) {
        return padding + ((bounds.maxLat + latPadding - lat) / 
            ((bounds.maxLat + latPadding) - (bounds.minLat - latPadding))) * (height - 2 * padding);
    }

    let svgContent = `
        <svg width="${width}" height="${height}" style="background: #f8f9fa;">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#007bff"/>
                </marker>
            </defs>
    `;

    // Draw routes
    Object.entries(routeGraph).forEach(([city, connections]) => {
        Object.entries(connections).forEach(([target, data]) => {
            if (cityPositions[city] && cityPositions[target]) {
                const x1 = scaleX(cityPositions[city].lng);
                const y1 = scaleY(cityPositions[city].lat);
                const x2 = scaleX(cityPositions[target].lng);
                const y2 = scaleY(cityPositions[target].lat);
                
                svgContent += `
                    <line 
                        x1="${x1}" y1="${y1}" 
                        x2="${x2}" y2="${y2}" 
                        stroke="#007bff" 
                        stroke-width="2" 
                        opacity="0.6"
                        marker-end="url(#arrowhead)"
                    >
                        <title>Cost: ${data.cost}, Time: ${data.time}h</title>
                    </line>
                `;
            }
        });
    });

    // Draw cities
    Object.entries(cityPositions).forEach(([city, loc]) => {
        const x = scaleX(loc.lng);
        const y = scaleY(loc.lat);
        svgContent += `
            <g class="city">
                <circle 
                    cx="${x}" cy="${y}" 
                    r="8"
                    fill="#28a745"
                    stroke="#fff"
                    stroke-width="2"
                >
                    <title>${city}\nLat: ${loc.lat.toFixed(4)}\nLng: ${loc.lng.toFixed(4)}</title>
                </circle>
                <text 
                    x="${x + 12}"
                    y="${y + 5}" 
                    font-size="14px"
                    font-weight="bold"
                    fill="#333"
                >${city}</text>
            </g>
        `;
    });

    svgContent += '</svg>';
    return svgContent;
}

// Pathfinding Algorithms
function dijkstra(graph, start, end, key) {
    if (!graph[start]) return null;

    let distances = {};
    let previous = {};
    let unvisited = new Set();
    
    for (let vertex in graph) {
        distances[vertex] = Infinity;
        previous[vertex] = null;
        unvisited.add(vertex);
    }
    distances[start] = 0;

    while (unvisited.size > 0) {
        let current = [...unvisited].reduce((min, vertex) => 
            distances[vertex] < distances[min] ? vertex : min
        );

        if (current === end) break;
        if (distances[current] === Infinity) break;

        unvisited.delete(current);

        for (let neighbor in graph[current]) {
            if (unvisited.has(neighbor)) {
                let alt = distances[current] + graph[current][neighbor][key];
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    previous[neighbor] = current;
                }
            }
        }
    }

    if (distances[end] === Infinity) return null;

    let path = [];
    let current = end;
    while (current !== null) {
        path.unshift(current);
        current = previous[current];
    }

    return {
        path: path,
        cost: distances[end]
    };
}

function astar(graph, start, end, key) {
  function heuristic(a, b) {
    if (!cityPositions[a] || !cityPositions[b]) return 0;
    
    const lat1 = cityPositions[a].lat;
    const lng1 = cityPositions[a].lng;
    const lat2 = cityPositions[b].lat;
    const lng2 = cityPositions[b].lng;
    
    const toRad = value => value * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    
    const a1 = Math.sin(dLat/2) * Math.sin(dLat/2) +
               Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
               Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1-a1));
    
    const R = 6371;
    const distance = R * c;
    
    const scaleFactor = key === 'cost' ? 20 : 0.3;
    return distance * scaleFactor;
  }

  let openSet = new Set([start]);
  let cameFrom = {};
  let gScore = {};
  let fScore = {};
  
  Object.keys(graph).forEach(node => {
    gScore[node] = Infinity;
    fScore[node] = Infinity;
  });
  
  gScore[start] = 0;
  fScore[start] = heuristic(start, end);

  while (openSet.size > 0) {
    let current = [...openSet].reduce((a, b) => 
      (fScore[a] || Infinity) < (fScore[b] || Infinity) ? a : b
    );
    
    if (current === end) {
      let path = [];
      let totalCost = gScore[end];
      while (current !== undefined) {
        path.unshift(current);
        current = cameFrom[current];
      }
      return { path, cost: totalCost };
    }
    
    openSet.delete(current);
    
    if (!graph[current]) continue;
    
    for (let neighbor in graph[current]) {
      let weight = graph[current][neighbor][key];
      let tentativeGScore = gScore[current] + weight;
      
      if (tentativeGScore < (gScore[neighbor] || Infinity)) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeGScore;
        fScore[neighbor] = tentativeGScore + heuristic(neighbor, end);
        
        if (!openSet.has(neighbor)) {
          openSet.add(neighbor);
        }
      }
    }
  }
  
  return null;
}

function dfs(graph, start, end, key) {
  let visited = new Set();
  let bestPath = null;
  let bestCost = Infinity;
  
  function dfsRecursive(node, cost, path) {
    if (node === end) {
      if (cost < bestCost) {
        bestCost = cost;
        bestPath = [...path];
      }
      return;
    }
    
    if (!graph[node]) return;
    
    const neighbors = Object.entries(graph[node])
      .map(([nbr, data]) => ({ nbr, weight: data[key] }))
      .sort((a, b) => a.weight - b.weight);
    
    for (const { nbr, weight } of neighbors) {
      if (!visited.has(nbr)) {
        visited.add(nbr);
        path.push(nbr);
        dfsRecursive(nbr, cost + weight, path);
        path.pop();
        visited.delete(nbr);
      }
    }
  }
  
  visited.add(start);
  dfsRecursive(start, 0, [start]);
  
  return bestPath ? { path: bestPath, cost: bestCost } : null;
}

function bfs(graph, start, end, key) {
  let queue = [{node: start, path: [start], cost: 0}];
  let visited = new Set([start]);
  let bestPath = null;
  let bestCost = Infinity;
  
  while (queue.length > 0) {
      queue.sort((a, b) => a.path.length - b.path.length);
      let {node, path, cost} = queue.shift();
      
      if (node === end) {
          if (cost < bestCost) {
              bestCost = cost;
              bestPath = path;
          }
          continue;
      }
      
      if (!graph[node]) continue;
      
      for (let neighbor in graph[node]) {
          if (!path.includes(neighbor)) {
              let newCost = cost + graph[node][neighbor][key];
              let newPath = [...path, neighbor];
              queue.push({node: neighbor, path: newPath, cost: newCost});
          }
      }
  }
  
  return bestPath ? { path: bestPath, cost: bestCost } : null;
}

function bellmanFord(graph, start, end, key) {
    let distances = {};
    let previous = {};
    
    Object.keys(graph).forEach(node => {
        distances[node] = Infinity;
        previous[node] = null;
    });
    distances[start] = 0;
    
    for (let i = 0; i < Object.keys(graph).length - 1; i++) {
        Object.keys(graph).forEach(node => {
            Object.keys(graph[node]).forEach(neighbor => {
                let alt = distances[node] + graph[node][neighbor][key];
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    previous[neighbor] = node;
                }
            });
        });
    }
    
    if (distances[end] === Infinity) return null;
    
    let path = [];
    let current = end;
    while (current) {
        path.unshift(current);
        current = previous[current];
    }
    
    return {
        path: path,
        cost: distances[end]
    };
}

function floydWarshall(graph, start, end, key) {
    let dist = {};
    let next = {};
    
    Object.keys(graph).forEach(i => {
        dist[i] = {};
        next[i] = {};
        Object.keys(graph).forEach(j => {
            dist[i][j] = Infinity;
            next[i][j] = null;
        });
        dist[i][i] = 0;
        Object.keys(graph[i]).forEach(j => {
            dist[i][j] = graph[i][j][key];
            next[i][j] = j;
        });
    });
    
    Object.keys(graph).forEach(k => {
        Object.keys(graph).forEach(i => {
            Object.keys(graph).forEach(j => {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];
                }
            });
        });
    });
    
    if (dist[start][end] === Infinity) return null;
    
    let path = [start];
    let current = start;
    while (current !== end) {
        current = next[current][end];
        path.push(current);
    }
    
    return {
        path: path,
        cost: dist[start][end]
    };
}

// Route Finding Functions
function findOptimalRoute(type) {
    const start = prompt("Enter start city:").toUpperCase();
    const end = prompt("Enter end city:").toUpperCase();
    
    if (!start || !end) {
        alert("Please enter both start and end cities.");
        return;
    }
    
    if (!cityPositions[start] || !cityPositions[end]) {
        alert(`One or both cities not found in the network.
Available cities: ${Object.keys(cityPositions).join(", ")}`);
        return;
    }
    
    const route = dijkstra(routeGraph, start, end, type);
    
    if (!route) {
        document.getElementById("result").innerHTML = `
            <div class="algorithm-result error">
                <h4>No valid route found between ${start} and ${end}</h4>
            </div>
        `;
        return;
    }
    
    displayRoute(route, type);
}

function findOptimalRouteAll() {
    console.log("Starting findOptimalRouteAll");
    
    if (Object.keys(cityPositions).length === 0) {
        loadGujaratMap();
    }

    const start = prompt("Enter start city:").toUpperCase();
    const end = prompt("Enter end city:").toUpperCase();
    
    console.log(`Searching route from ${start} to ${end}`);

    if (!start || !end || !cityPositions[start] || !cityPositions[end]) {
        document.getElementById("result").innerHTML = `
            <div class="algorithm-result error">
                <h4>Error: Invalid cities</h4>
                <p>Available cities: ${Object.keys(cityPositions).join(", ")}</p>
            </div>
        `;
        return;
    }

    if (!hasValidPath(routeGraph, start, end)) {
        document.getElementById("result").innerHTML = `
            <div class="algorithm-result error">
                <h4>No valid path exists between ${start} and ${end}</h4>
            </div>
        `;
        return;
    }

    const costAlgorithms = {
        "Dijkstra (Cost)": dijkstra(routeGraph, start, end, "cost"),
        "A* (Cost)": astar(routeGraph, start, end, "cost"),
        "DFS (Cost)": dfs(routeGraph, start, end, "cost"),
        "BFS (Cost)": bfs(routeGraph, start, end, "cost"),
        "Bellman-Ford (Cost)": bellmanFord(routeGraph, start, end, "cost"),
        "Floyd-Warshall (Cost)": floydWarshall(routeGraph, start, end, "cost")
    };

    const timeAlgorithms = {
        "Dijkstra (Time)": dijkstra(routeGraph, start, end, "time"),
        "A* (Time)": astar(routeGraph, start, end, "time"),
        "DFS (Time)": dfs(routeGraph, start, end, "time"),
        "BFS (Time)": bfs(routeGraph, start, end, "time"),
        "Bellman-Ford (Time)": bellmanFord(routeGraph, start, end, "time"),
        "Floyd-Warshall (Time)": floydWarshall(routeGraph, start, end, "time")
    };

    displayResults(start, end, costAlgorithms, timeAlgorithms);
}

function displayResults(start, end, costAlgorithms, timeAlgorithms) {
    const resultDiv = document.getElementById("result");
    
    const bestCost = Object.values(costAlgorithms)
        .filter(result => result !== null)
        .reduce((min, curr) => (!min || curr.cost < min.cost) ? curr : min, null);
    
    const bestTime = Object.values(timeAlgorithms)
        .filter(result => result !== null)
        .reduce((min, curr) => (!min || curr.cost < min.cost) ? curr : min, null);

    let html = `
        <div class="algorithm-comparison">
            <h4>Route Comparison: ${start} to ${end}</h4>
            
            <div class="best-routes">
                <div class="best-cost">
                    <h5>Best Cost Route:</h5>
                    <p class="path">Path: ${bestCost ? bestCost.path.join(" → ") : "Not found"}</p>
                    <p class="details">
                        Cost: ₹${bestCost ? bestCost.cost.toFixed(2) : "N/A"}
                        Time: ${bestCost ? Math.floor(getRouteTime(bestCost.path)) : "N/A"}h 
                              ${bestCost ? Math.round((getRouteTime(bestCost.path) % 1) * 60) : "0"}m
                    </p>
                </div>
                <div class="best-time">
                    <h5>Best Time Route:</h5>
                    <p class="path">Path: ${bestTime ? bestTime.path.join(" → ") : "Not found"}</p>
                    <p class="details">
                        Time: ${bestTime ? Math.floor(bestTime.cost) : "N/A"}h 
                              ${bestTime ? Math.round((bestTime.cost % 1) * 60) : "0"}m
                        Cost: ₹${bestTime ? getRouteCost(bestTime.path).toFixed(2) : "N/A"}
                    </p>
                </div>
            </div>

            <h5>Cost-Optimized Paths:</h5>
    `;

    Object.entries(costAlgorithms).forEach(([name, result]) => {
        if (result && result.path) {
            const timeForCostPath = getRouteTime(result.path);
            html += `
                <div class="algorithm-result">
                    <h6>${name}</h6>
                    <p class="path">Path: ${result.path.join(" → ")}</p>
                    <p class="cost">Cost: ₹${result.cost.toFixed(2)}</p>
                    <p class="time">Time: ${Math.floor(timeForCostPath)}h ${Math.round((timeForCostPath % 1) * 60)}m</p>
                </div>
            `;
        }
    });

    html += `<h5>Time-Optimized Paths:</h5>`;

    Object.entries(timeAlgorithms).forEach(([name, result]) => {
        if (result && result.path) {
            const costForTimePath = getRouteCost(result.path);
            html += `
                <div class="algorithm-result">
                    <h6>${name}</h6>
                    <p class="path">Path: ${result.path.join(" → ")}</p>
                    <p class="time">Time: ${Math.floor(result.cost)}h ${Math.round((result.cost % 1) * 60)}m</p>
                    <p class="cost">Cost: ₹${costForTimePath.toFixed(2)}</p>
                </div>
            `;
        }
    });

    html += '</div>';
    resultDiv.innerHTML = html;
}

function displayRoute(route, type) {
    const resultDiv = document.getElementById("result");
    const formattedValue = type === 'time' ? 
        `${Math.floor(route.cost)}h ${Math.round((route.cost % 1) * 60)}m` : 
        `₹${route.cost.toFixed(2)}`;
    
    resultDiv.innerHTML = `
        <div class="route-result">
            <h4>Optimal ${type.charAt(0).toUpperCase() + type.slice(1)} Route:</h4>
            <p class="route-path">Path: ${route.path.join(" → ")}</p>
            <p class="route-detail">Total ${type}: ${formattedValue}</p>
        </div>
    `;
}

// Helper Functions
function getRouteCost(path) {
    let totalCost = 0;
    for (let i = 0; i < path.length - 1; i++) {
        totalCost += routeGraph[path[i]][path[i + 1]].cost;
    }
    return totalCost;
}

function getRouteTime(path) {
    let totalTime = 0;
    for (let i = 0; i < path.length - 1; i++) {
        totalTime += routeGraph[path[i]][path[i + 1]].time;
    }
    return totalTime;
}

function hasValidPath(graph, start, end) {
  let visited = new Set();
  let queue = [start];
  
  while (queue.length > 0) {
      let current = queue.shift();
      if (current === end) return true;
      
      if (graph[current]) {
          for (let neighbor in graph[current]) {
              if (!visited.has(neighbor)) {
                  visited.add(neighbor);
                  queue.push(neighbor);
              }
          }
      }
  }
  
  return false;
}

// Data Loading
function loadGujaratMap() {
    clearMap();
    loadPredefinedCities();
    loadPredefinedRoutes();

    console.log("Loaded Cities:", cityPositions);
    console.log("Loaded Routes:", routeGraph);

    displayGraphNetwork();
}

function loadPredefinedCities() {
    const cities = {
        // Major Cities
        "AHMEDABAD": { lat: 23.0225, lng: 72.5714 },
        "SURAT": { lat: 21.1702, lng: 72.8311 },
        "VADODARA": { lat: 22.3072, lng: 73.1812 },
        "RAJKOT": { lat: 22.3039, lng: 70.8022 },
        "GANDHINAGAR": { lat: 23.2156, lng: 72.6369 },
        
        // Secondary Cities
        "BHAVNAGAR": { lat: 21.7645, lng: 72.1519 },
        "JAMNAGAR": { lat: 22.4707, lng: 70.0577 },
        "JUNAGADH": { lat: 21.5222, lng: 70.4579 },
        "ANAND": { lat: 22.5645, lng: 72.9289 },
        "BHARUCH": { lat: 21.7051, lng: 72.9959 },
        "NADIAD": { lat: 22.6916, lng: 72.8634 },
        "MEHSANA": { lat: 23.5880, lng: 72.3693 },
        "BHUJ": { lat: 23.2419, lng: 69.6695 },
        "PORBANDAR": { lat: 21.6417, lng: 69.6293 },
        "VAPI": { lat: 20.3893, lng: 72.9106 },
        
        // Additional Cities
        "NAVSARI": { lat: 20.9467, lng: 72.9520 },
        "MORBI": { lat: 22.8371, lng: 70.8380 },
        "SURENDRANAGAR": { lat: 22.7469, lng: 71.6479 },
        "AMRELI": { lat: 21.6015, lng: 71.2203 },
        "PATAN": { lat: 23.8493, lng: 72.1266 },
        "DAHOD": { lat: 22.8344, lng: 74.2633 },
        "GODHRA": { lat: 22.7788, lng: 73.6143 },
        "VERAVAL": { lat: 20.9159, lng: 70.3629 },
        "ANKLESHWAR": { lat: 21.6266, lng: 73.0020 },
        "VALSAD": { lat: 20.5992, lng: 72.9342 },
        "BOTAD": { lat: 22.1704, lng: 71.6684 },
        "PALANPUR": { lat: 24.1747, lng: 72.4320 },
        "GANDHIDHAM": { lat: 23.0753, lng: 70.1337 },
        "JETPUR": { lat: 21.7549, lng: 70.6241 },
        "DEESA": { lat: 24.2541, lng: 72.1060 },
        
        // Industrial Towns
        "MUNDRA": { lat: 22.8387, lng: 69.7218 },
        "HAZIRA": { lat: 21.1163, lng: 72.6491 },
        "SANAND": { lat: 22.9922, lng: 72.3819 },
        "HALOL": { lat: 22.5027, lng: 73.4705 },
        "KALOL": { lat: 23.2489, lng: 72.4916 },
        
        // Cultural/Historical Cities
        "DWARKA": { lat: 22.2442, lng: 68.9685 },
        "PALITANA": { lat: 21.5262, lng: 71.8337 },
        "SOMNATH": { lat: 20.9060, lng: 70.3844 },
        "CHAMPANER": { lat: 22.4862, lng: 73.5373 },
        "DIU": { lat: 20.7144, lng: 70.9874 }
    };

    Object.entries(cities).forEach(([city, location]) => {
        cityLocations[city] = location;
    });
}

function loadPredefinedRoutes() {
    const routes = {
        // Major Highway Routes
        "AHMEDABAD": {
            "GANDHINAGAR": { cost: 30, time: 0.7 },
            "SANAND": { cost: 35, time: 0.8 },
            "NADIAD": { cost: 60, time: 1.0 },
            "MEHSANA": { cost: 75, time: 1.5 },
            "SURENDRANAGAR": { cost: 130, time: 2.2 },
                "RAJKOT": { cost: 350, time: 3.5 }, // Express highway (expensive but fast)
                "SURAT": { cost: 500, time: 3.0 }   // Express route
            
        },
        
        // Central Gujarat Routes
        "VADODARA": {
            "SURAT": {
                // Regular highway (balanced)
                cost: 150,
                time: 2.5
            },
            "AHMEDABAD": {
                // Regular route
                cost: 120,
                time: 2.0
            },
            "ANAND": { cost: 40, time: 0.7 },
            "NADIAD": { cost: 50, time: 0.8 },
            "GODHRA": { cost: 70, time: 1.2 },
            "HALOL": { cost: 45, time: 0.8 },
            "BHARUCH": { cost: 80, time: 1.3 }
        },
        
        // South Gujarat Routes
        "SURAT": {
            "BHARUCH": { cost: 70, time: 1.2 },
            "NAVSARI": { cost: 40, time: 0.7 },
            "VAPI": { cost: 120, time: 2.0 },
            "HAZIRA": { cost: 25, time: 0.4 },
            "AHMEDABAD": {
                cost: 500,
                time: 3.0
            }
        },
        
        // Saurashtra Routes
        "RAJKOT": {
            "MORBI": { cost: 65, time: 1.1 },
            "JAMNAGAR": { cost: 90, time: 1.5 },
            "JUNAGADH": { cost: 110, time: 1.8 },
            "BHAVNAGAR": { cost: 180, time: 3.0 },
            "SURENDRANAGAR": { cost: 110, time: 1.8 }
        },
        
        // Kutch Region
        "BHUJ": {
            "GANDHIDHAM": { cost: 55, time: 0.9 },
            "MUNDRA": { cost: 80, time: 1.3 },
            "MORBI": { cost: 200, time: 3.3 }
        },
        
        // North Gujarat
        "MEHSANA": {
            "PALANPUR": { cost: 70, time: 1.2 },
            "DEESA": { cost: 90, time: 1.5 },
            "PATAN": { cost: 55, time: 0.9 }
        },
        
        // Coastal Routes
        "PORBANDAR": {
            "DWARKA": { cost: 120, time: 2.0 },
            "VERAVAL": { cost: 110, time: 1.8 },
            "JUNAGADH": { cost: 120, time: 2.0 }
        },
        
        // Additional Important Connections
        "BHAVNAGAR": {
            "PALITANA": { cost: 55, time: 0.9 },
            "BOTAD": { cost: 65, time: 1.1 },
            "AMRELI": { cost: 130, time: 2.2 }
        },
        
        "JUNAGADH": {
            "VERAVAL": { cost: 80, time: 1.3 },
            "SOMNATH": { cost: 95, time: 1.6 },
            "JETPUR": { cost: 70, time: 1.2 }
        },
        
        // Eastern Routes
        "GODHRA": {
            "DAHOD": { cost: 90, time: 1.5 },
            "CHAMPANER": { cost: 45, time: 0.8 }
        },
        
        // South Gujarat Extended
        "NAVSARI": {
            "VALSAD": { cost: 40, time: 0.7 },
            "VAPI": { cost: 60, time: 1.0 }
        },
        
        // Industrial Corridor
        "ANKLESHWAR": {
            "BHARUCH": { cost: 30, time: 0.5 },
            "SURAT": { cost: 60, time: 1.0 }
        },
        
        // Additional Regional Connections
        "MORBI": {
            "SURENDRANAGAR": { cost: 85, time: 1.4 },
            "JAMNAGAR": { cost: 100, time: 1.7 }
        },
        
        "KALOL": {
            "GANDHINAGAR": { cost: 35, time: 0.6 },
            "MEHSANA": { cost: 50, time: 0.9 }
        },
        
        "DEESA": {
            "PALANPUR": { cost: 45, time: 0.8 },
            "PATAN": { cost: 85, time: 1.4 }
        },
        
        "ANAND": {
            "NADIAD": { cost: 30, time: 0.5 },
            "ANAND": {
            "AHMEDABAD": {
                // Local route (cheaper but slower)
                cost: 80,
                time: 2.0
            },
            "VADODARA": {
                // Short local route
                cost: 40,
                time: 1.0
            }
        },
        },
        
        "VERAVAL": {
            "SOMNATH": { cost: 40, time: 0.7 }
        },
        
        "GANDHIDHAM": {
            "MUNDRA": { cost: 35, time: 0.6 }
        },

        "NADIAD": {
            "ANAND": { cost: 30, time: 0.5 },
            "VADODARA": { cost: 50, time: 0.8 },
            "AHMEDABAD": {
                // Alternative local route
                cost: 60,
                time: 1.5
            },
            "ANAND": {
                // Village route (cheapest but slowest)
                cost: 30,
                time: 1.0
            }
        },
        "BHARUCH": {
            "ANKLESHWAR": { cost: 30, time: 0.5 },
            "VADODARA": { cost: 80, time: 1.3 },
            "SURAT": {
                // Coastal highway
                cost: 70,
                time: 1.2
            },
            "VADODARA": {
                // Inland route
                cost: 80,
                time: 1.3
            },
            "ANKLESHWAR": {
                // Local bridge route
                cost: 30,
                time: 0.5
            }
        },
        "GANDHINAGAR": {
            "KALOL": { cost: 35, time: 0.6 },
            "MEHSANA": { cost: 50, time: 0.9 }
        },
        "SURENDRANAGAR": {
            "AHMEDABAD": { cost: 130, time: 2.2 },
            "RAJKOT": { cost: 110, time: 1.8 }
        }
    };

    // Add bidirectional routes
    Object.entries(routes).forEach(([city, connections]) => {
        if (!graph[city]) graph[city] = {};
        
        Object.entries(connections).forEach(([target, data]) => {
            if (!graph[target]) graph[target] = {};
            
            // Add route in both directions
            graph[city][target] = data;
            graph[target][city] = data;
        });
    });

    if (graph["SURAT"] && graph["VADODARA"]) {
        graph["SURAT"]["VADODARA"].cost = 150;  // Going up costs more
        graph["VADODARA"]["SURAT"].cost = 130;  // Going down costs less
    }

    if (graph["VADODARA"] && graph["AHMEDABAD"]) {
        graph["VADODARA"]["AHMEDABAD"].time = 2.0;  // Going up takes longer
        graph["AHMEDABAD"]["VADODARA"].time = 1.8;  // Going down is faster
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    showEmptyGraphMessage();
});

function addTestRoutes() {
  // These routes create a scenario where the algorithms will find different paths
  // For testing purposes only
  
  // Create a diamond-shaped network with different weights
  if (!graph["AHMEDABAD"]) graph["AHMEDABAD"] = {};
  if (!graph["GANDHINAGAR"]) graph["GANDHINAGAR"] = {};
  if (!graph["VADODARA"]) graph["VADODARA"] = {};
  if (!graph["ANAND"]) graph["ANAND"] = {};
  
  // Direct route (expensive but short)
  graph["AHMEDABAD"]["VADODARA"] = { cost: 120, time: 1.8 };
  graph["VADODARA"]["AHMEDABAD"] = { cost: 120, time: 1.8 };
  
  // Indirect route via Gandhinagar (medium cost)
  graph["AHMEDABAD"]["GANDHINAGAR"] = { cost: 35, time: 0.7 };
  graph["GANDHINAGAR"]["AHMEDABAD"] = { cost: 35, time: 0.7 };
  graph["GANDHINAGAR"]["VADODARA"] = { cost: 95, time: 1.6 };
  graph["VADODARA"]["GANDHINAGAR"] = { cost: 95, time: 1.6 };
  
  // Longer route via Anand (cheaper but longer)
  graph["AHMEDABAD"]["ANAND"] = { cost: 80, time: 1.3 };
  graph["ANAND"]["AHMEDABAD"] = { cost: 80, time: 1.3 };
  graph["ANAND"]["VADODARA"] = { cost: 30, time: 0.6 };
  graph["VADODARA"]["ANAND"] = { cost: 30, time: 0.6 };
  
  // Create a denser network around Rajkot
  if (!graph["RAJKOT"]) graph["RAJKOT"] = {};
  if (!graph["MORBI"]) graph["MORBI"] = {};
  if (!graph["JAMNAGAR"]) graph["JAMNAGAR"] = {};
  if (!graph["JUNAGADH"]) graph["JUNAGADH"] = {};
  
  // Direct route
  graph["RAJKOT"]["JUNAGADH"] = { cost: 110, time: 1.8 };
  graph["JUNAGADH"]["RAJKOT"] = { cost: 110, time: 1.8 };
  
  // Via Morbi (longer)
  graph["RAJKOT"]["MORBI"] = { cost: 65, time: 1.1 };
  graph["MORBI"]["RAJKOT"] = { cost: 65, time: 1.1 };
  graph["MORBI"]["JUNAGADH"] = { cost: 130, time: 2.0 };
  graph["JUNAGADH"]["MORBI"] = { cost: 130, time: 2.0 };
  
  // Via Jamnagar (more expensive)
  graph["RAJKOT"]["JAMNAGAR"] = { cost: 90, time: 1.5 };
  graph["JAMNAGAR"]["RAJKOT"] = { cost: 90, time: 1.5 };
  graph["JAMNAGAR"]["JUNAGADH"] = { cost: 105, time: 1.7 };
  graph["JUNAGADH"]["JAMNAGAR"] = { cost: 105, time: 1.7 };
}