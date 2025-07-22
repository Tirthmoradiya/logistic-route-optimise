// Data Storage
const routeGraph = {};
const cityPositions = {};
const routeCache = new Map();
const gujaratBounds = {
    minLat: 20.1, maxLat: 24.7,
    minLng: 68.1, maxLng: 74.4
};
const selectedPath = {
    path: null,
    bestCost: null,
    bestTime: null,
    type: null
};

// Core UI Functions
document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    showEmptyGraphMessage();
});

function setupEventListeners() {
    const addDataBtn = document.getElementById("addData");
    if (addDataBtn) {
        addDataBtn.addEventListener("click", function() {
            const data = getFormData();
            if (!isValidData(data)) return;
            addNewRoute(data);
            clearForm();
            displayGraphNetwork();
        });
    }

    // Fix: Remove old findRoute listener and add new ones
    const findMinCostBtn = document.getElementById("findMinCost");
    if (findMinCostBtn) {
        findMinCostBtn.addEventListener("click", function() {
            findOptimalRoute('cost');
        });
    }

    const findMinTimeBtn = document.getElementById("findMinTime");
    if (findMinTimeBtn) {
        findMinTimeBtn.addEventListener("click", function() {
            findOptimalRoute('time');
        });
    }

    const findAllRoutesBtn = document.getElementById("findAllRoutes");
    if (findAllRoutesBtn) {
        findAllRoutesBtn.addEventListener("click", findOptimalRouteAll);
    }

    const clearMapBtn = document.getElementById("clearMap");
    if (clearMapBtn) {
        clearMapBtn.addEventListener("click", clearMap);
    }

    const loadGujaratMapBtn = document.getElementById("loadGujaratMap");
    if (loadGujaratMapBtn) {
        loadGujaratMapBtn.addEventListener("click", loadGujaratMap);
    }

    // Add console logs for debugging
    console.log("Event listeners setup complete");
    console.log("Buttons found:", {
        addData: !!addDataBtn,
        findMinCost: !!findMinCostBtn,
        findMinTime: !!findMinTimeBtn,
        findAllRoutes: !!findAllRoutesBtn,
        clearMap: !!clearMapBtn,
        loadGujaratMap: !!loadGujaratMapBtn
    });
}

function getFormData() {
    return {
        start: document.getElementById("startCity").value.toUpperCase(),
        end: document.getElementById("endCity").value.toUpperCase(),
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
    ["startCity", "endCity", "cost", "time"].forEach(id => {
        document.getElementById(id).value = "";
    });
}

function clearMap() {
    Object.keys(routeGraph).forEach(key => delete routeGraph[key]);
    Object.keys(cityPositions).forEach(key => delete cityPositions[key]);
    document.getElementById("result").innerHTML = "";
    document.getElementById("network-visualization").innerHTML = "";
    selectedPath.path = null;
    selectedPath.type = null;
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

function displayRoute(route, type) {
    if (!route || !route.path) {
        document.getElementById("result").innerHTML = `
            <div class="algorithm-result error">
                <h4>No valid route found</h4>
            </div>
        `;
        return;
    }

    const time = type === 'time' ? route.cost : getRouteTime(route.path);
    const cost = type === 'cost' ? route.cost : getRouteCost(route.path);

    document.getElementById("result").innerHTML = `
        <div class="algorithm-result">
            <h4>Best ${type.charAt(0).toUpperCase() + type.slice(1)} Route:</h4>
            <p class="path">Path: ${route.path.join(" → ")}</p>
            <p class="details">
                Cost: ₹${cost.toFixed(2)}<br>
                Time: ${Math.floor(time)}h ${Math.round((time % 1) * 60)}m
            </p>
        </div>
    `;

    selectedPath.path = route.path;
    selectedPath.type = type;
    displayGraphNetwork();
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
    `;

    // Draw routes
    Object.entries(routeGraph).forEach(([city, connections]) => {
        Object.entries(connections).forEach(([target, data]) => {
            if (cityPositions[city] && cityPositions[target]) {
                const x1 = scaleX(cityPositions[city].lng);
                const y1 = scaleY(cityPositions[city].lat);
                const x2 = scaleX(cityPositions[target].lng);
                const y2 = scaleY(cityPositions[target].lat);

                // Determine route color and width based on path type
                let strokeColor = '#007bff'; // default blue
                let strokeWidth = '2';
                let opacity = '0.6';

                const isBestCostRoute = (selectedPath.type === 'comparison' || selectedPath.type === 'cost') &&
                    ((selectedPath.bestCost && isRouteInPath(city, target, selectedPath.bestCost)) ||
                        (selectedPath.type === 'cost' && selectedPath.path && isRouteInPath(city, target, selectedPath.path)));

                const isBestTimeRoute = (selectedPath.type === 'comparison' || selectedPath.type === 'time') &&
                    ((selectedPath.bestTime && isRouteInPath(city, target, selectedPath.bestTime)) ||
                        (selectedPath.type === 'time' && selectedPath.path && isRouteInPath(city, target, selectedPath.path)));

                if (isBestCostRoute) {
                    strokeColor = '#000000'; // black for best cost
                    strokeWidth = '4';
                    opacity = '1';
                } else if (isBestTimeRoute) {
                    strokeColor = '#dc3545'; // red for best time
                    strokeWidth = '4';
                    opacity = '1';
                }

                svgContent += `
                    <line 
                        x1="${x1}" y1="${y1}" 
                        x2="${x2}" y2="${y2}" 
                        stroke="${strokeColor}" 
                        stroke-width="${strokeWidth}" 
                        opacity="${opacity}"
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

// Add this helper function
function isRouteInPath(city1, city2, path) {
    if (!path) return false;
    for (let i = 0; i < path.length - 1; i++) {
        if ((path[i] === city1 && path[i + 1] === city2) ||
            (path[i] === city2 && path[i + 1] === city1)) {
            return true;
        }
    }
    return false;
}

function displayResults(start, end, costAlgorithms, timeAlgorithms, timings) {
    const resultDiv = document.getElementById("result");
    const costCache = new Map();
    const timeCache = new Map();
    function cachedGetRouteCost(path) {
        if (!path) return NaN;
        const key = path.join("->");
        if (costCache.has(key)) return costCache.get(key);
        let val = getRouteCost(path);
        costCache.set(key, val);
        return val;
    }
    function cachedGetRouteTime(path) {
        if (!path) return NaN;
        const key = path.join("->");
        if (timeCache.has(key)) return timeCache.get(key);
        let val = getRouteTime(path);
        timeCache.set(key, val);
        return val;
    }
    const bestCost = Object.values(costAlgorithms)
        .filter(result => result && result.path && !isNaN(result.cost))
        .reduce((min, curr) => (!min || curr.cost < min.cost) ? curr : min, null);
    const bestTime = Object.values(timeAlgorithms)
        .filter(result => result && result.path && !isNaN(result.cost))
        .reduce((min, curr) => (!min || curr.cost < min.cost) ? curr : min, null);
    let html = `
        <div class="algorithm-comparison">
            <h4>Route Comparison: ${start} to ${end}</h4>
            <div class="best-routes">
                <div class="best-cost">
                    <h5>Best Cost Route:</h5>
                    <p class="path">Path: ${bestCost && bestCost.path ? bestCost.path.join(" → ") : "Not found"}</p>
                    <p class="details">
                        Cost: ₹${bestCost && !isNaN(bestCost.cost) ? bestCost.cost.toFixed(2) : "N/A"}
                        Time: ${bestCost && bestCost.path && !isNaN(cachedGetRouteTime(bestCost.path)) ? Math.floor(cachedGetRouteTime(bestCost.path)) : "N/A"}h 
                              ${bestCost && bestCost.path && !isNaN(cachedGetRouteTime(bestCost.path)) ? Math.round((cachedGetRouteTime(bestCost.path) % 1) * 60) : "0"}m
                    </p>
                </div>
                <div class="best-time">
                    <h5>Best Time Route:</h5>
                    <p class="path">Path: ${bestTime && bestTime.path ? bestTime.path.join(" → ") : "Not found"}</p>
                    <p class="details">
                        Time: ${bestTime && !isNaN(bestTime.cost) ? Math.floor(bestTime.cost) : "N/A"}h 
                              ${bestTime && !isNaN(bestTime.cost) ? Math.round((bestTime.cost % 1) * 60) : "0"}m
                        Cost: ₹${bestTime && bestTime.path && !isNaN(cachedGetRouteCost(bestTime.path)) ? cachedGetRouteCost(bestTime.path).toFixed(2) : "N/A"}
                    </p>
                </div>
            </div>
            <h5>Cost-Optimized Paths:</h5>
    `;
    Object.entries(costAlgorithms).forEach(([name, result]) => {
        const timing = timings && typeof timings[name] !== 'undefined' ? timings[name].toFixed(1) + ' ms' : 'N/A';
        if (!result || !result.path) {
            html += `<div class="algorithm-result error"><h6>${name}</h6><p>No path found or error</p><p class="timing">⏱️ ${timing}</p></div>`;
            console.warn(`Algorithm ${name} failed or found no path.`, result);
            return;
        }
        const timeForCostPath = cachedGetRouteTime(result.path);
        const costVal = !isNaN(result.cost) ? result.cost.toFixed(2) : "N/A";
        const timeVal = !isNaN(timeForCostPath) ? `${Math.floor(timeForCostPath)}h ${Math.round((timeForCostPath % 1) * 60)}m` : "N/A";
        if (isNaN(result.cost) || isNaN(timeForCostPath)) {
            console.warn(`Algorithm ${name} returned NaN for cost or time.`, result);
        }
        html += `
            <div class="algorithm-result">
                <h6>${name}</h6>
                <p class="path">Path: ${result.path.join(" → ")}</p>
                <p class="cost">Cost: ₹${costVal}</p>
                <p class="time">Time: ${timeVal}</p>
                <p class="timing">⏱️ ${timing}</p>
            </div>
        `;
    });
    html += `<h5>Time-Optimized Paths:</h5>`;
    Object.entries(timeAlgorithms).forEach(([name, result]) => {
        const timing = timings && typeof timings[name] !== 'undefined' ? timings[name].toFixed(1) + ' ms' : 'N/A';
        if (!result || !result.path) {
            html += `<div class="algorithm-result error"><h6>${name}</h6><p>No path found or error</p><p class="timing">⏱️ ${timing}</p></div>`;
            console.warn(`Algorithm ${name} failed or found no path.`, result);
            return;
        }
        const costForTimePath = cachedGetRouteCost(result.path);
        const timeVal = !isNaN(result.cost) ? `${Math.floor(result.cost)}h ${Math.round((result.cost % 1) * 60)}m` : "N/A";
        const costVal = !isNaN(costForTimePath) ? costForTimePath.toFixed(2) : "N/A";
        if (isNaN(result.cost) || isNaN(costForTimePath)) {
            console.warn(`Algorithm ${name} returned NaN for cost or time.`, result);
        }
        html += `
            <div class="algorithm-result">
                <h6>${name}</h6>
                <p class="path">Path: ${result.path.join(" → ")}</p>
                <p class="time">Time: ${timeVal}</p>
                <p class="cost">Cost: ₹${costVal}</p>
                <p class="timing">⏱️ ${timing}</p>
            </div>
        `;
    });
    selectedPath.bestCost = bestCost && bestCost.path ? bestCost.path : null;
    selectedPath.bestTime = bestTime && bestTime.path ? bestTime.path : null;
    selectedPath.type = 'comparison';
    displayGraphNetwork();
    html += '</div>';
    resultDiv.innerHTML = html;
}

// --- MinHeap ---
class MinHeap {
    constructor() { this.heap = []; }
    push(item) { this.heap.push(item); this._bubbleUp(this.heap.length - 1); }
    pop() {
        if (this.heap.length === 0) return undefined;
        const min = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) { this.heap[0] = end; this._sinkDown(0); }
        return min;
    }
    _bubbleUp(idx) {
        const element = this.heap[idx];
        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);
            const parent = this.heap[parentIdx];
            if (element[0] >= parent[0]) break;
            this.heap[parentIdx] = element;
            this.heap[idx] = parent;
            idx = parentIdx;
        }
    }
    _sinkDown(idx) {
        const length = this.heap.length;
        const element = this.heap[idx];
        while (true) {
            let leftIdx = 2 * idx + 1;
            let rightIdx = 2 * idx + 2;
            let swap = null;
            if (leftIdx < length) {
                if (this.heap[leftIdx][0] < element[0]) { swap = leftIdx; }
            }
            if (rightIdx < length) {
                if ((swap === null && this.heap[rightIdx][0] < element[0]) ||
                    (swap !== null && this.heap[rightIdx][0] < this.heap[leftIdx][0])) { swap = rightIdx; }
            }
            if (swap === null) break;
            this.heap[idx] = this.heap[swap];
            this.heap[swap] = element;
            idx = swap;
        }
    }
    size() { return this.heap.length; }
}
// --- Pathfinding Algorithms ---
// (Paste all algorithms and helpers from pathfinding.worker.js here if not already present)
// --- Optimized Dijkstra with MinHeap and Caching ---
function dijkstra(graph, start, end, key) {
    const cacheKey = `dijkstra_${key}_${start}_${end}`;
    if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);
    if (!graph[start]) return null;
    let distances = {};
    let previous = {};
    let visited = new Set();
    Object.keys(graph).forEach(vertex => {
        distances[vertex] = Infinity;
        previous[vertex] = null;
    });
    distances[start] = 0;
    const heap = new MinHeap();
    heap.push([0, start]);
    while (heap.size() > 0) {
        const [dist, current] = heap.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        if (current === end) break;
        for (let neighbor in graph[current]) {
            let alt = distances[current] + graph[current][neighbor][key];
            if (alt < distances[neighbor]) {
                distances[neighbor] = alt;
                previous[neighbor] = current;
                heap.push([alt, neighbor]);
            }
        }
    }
    if (distances[end] === Infinity) return null;
    let path = [];
    let curr = end;
    while (curr !== null) {
        path.unshift(curr);
        curr = previous[curr];
    }
    const result = { path: path, cost: distances[end] };
    routeCache.set(cacheKey, result);
    return result;
}

function astar(graph, start, end, key) {
    const cacheKey = `astar_${key}_${start}_${end}`;
    if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);
    function heuristic(a, b) {
        if (!cityPositions[a] || !cityPositions[b]) return 0;
        const lat1 = cityPositions[a].lat;
        const lng1 = cityPositions[a].lng;
        const lat2 = cityPositions[b].lat;
        const lng2 = cityPositions[b].lng;
        const toRad = value => value * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a1 = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1));
        const R = 6371;
        const distance = R * c;
        const scaleFactor = key === 'cost' ? 20 : 0.3;
        return distance * scaleFactor;
    }
    let gScore = {};
    let fScore = {};
    let previous = {};
    Object.keys(graph).forEach(node => {
        gScore[node] = Infinity;
        fScore[node] = Infinity;
        previous[node] = null;
    });
    gScore[start] = 0;
    fScore[start] = heuristic(start, end);
    const heap = new MinHeap();
    heap.push([fScore[start], start]);
    let visited = new Set();
    while (heap.size() > 0) {
        const [_, current] = heap.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        if (current === end) {
            let path = [];
            let curr = end;
            while (curr !== null) {
                path.unshift(curr);
                curr = previous[curr];
            }
            const result = { path, cost: gScore[end] };
            routeCache.set(cacheKey, result);
            return result;
        }
        if (!graph[current]) continue;
        for (let neighbor in graph[current]) {
            let weight = graph[current][neighbor][key];
            let tentativeGScore = gScore[current] + weight;
            if (tentativeGScore < gScore[neighbor]) {
                previous[neighbor] = current;
                gScore[neighbor] = tentativeGScore;
                fScore[neighbor] = tentativeGScore + heuristic(neighbor, end);
                heap.push([fScore[neighbor], neighbor]);
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
    let queue = [{ node: start, path: [start], cost: 0 }], visited = new Set([start]);
    while (queue.length > 0) {
        let { node, path, cost } = queue.shift();
        if (node === end) {
            return { path, cost };
        }
        if (!graph[node]) continue;
        for (let neighbor in graph[node]) {
            if (!path.includes(neighbor)) {
                let newCost = cost + graph[node][neighbor][key];
                let newPath = [...path, neighbor];
                queue.push({ node: neighbor, path: newPath, cost: newCost });
            }
        }
    }
    return null;
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

// --- Bidirectional Dijkstra ---
function bidirectionalDijkstra(graph, start, end, key) {
    if (!graph[start] || !graph[end]) return null;
    if (start === end) return { path: [start], cost: 0 };
    let forwardDist = {}, backwardDist = {};
    let forwardPrev = {}, backwardPrev = {};
    let forwardVisited = new Set(), backwardVisited = new Set();
    Object.keys(graph).forEach(v => {
        forwardDist[v] = Infinity;
        backwardDist[v] = Infinity;
        forwardPrev[v] = null;
        backwardPrev[v] = null;
    });
    forwardDist[start] = 0;
    backwardDist[end] = 0;
    let forwardHeap = new MinHeap();
    let backwardHeap = new MinHeap();
    forwardHeap.push([0, start]);
    backwardHeap.push([0, end]);
    let meetingNode = null;
    let bestCost = Infinity;
    while (forwardHeap.size() > 0 && backwardHeap.size() > 0) {
        // Forward step
        if (forwardHeap.size() > 0) {
            const [fDist, fNode] = forwardHeap.pop();
            if (forwardVisited.has(fNode)) continue;
            forwardVisited.add(fNode);
            if (backwardVisited.has(fNode)) {
                let total = forwardDist[fNode] + backwardDist[fNode];
                if (total < bestCost) {
                    bestCost = total;
                    meetingNode = fNode;
                }
            }
            for (let neighbor in graph[fNode]) {
                let alt = forwardDist[fNode] + graph[fNode][neighbor][key];
                if (alt < forwardDist[neighbor]) {
                    forwardDist[neighbor] = alt;
                    forwardPrev[neighbor] = fNode;
                    forwardHeap.push([alt, neighbor]);
                }
            }
        }
        // Backward step
        if (backwardHeap.size() > 0) {
            const [bDist, bNode] = backwardHeap.pop();
            if (backwardVisited.has(bNode)) continue;
            backwardVisited.add(bNode);
            if (forwardVisited.has(bNode)) {
                let total = forwardDist[bNode] + backwardDist[bNode];
                if (total < bestCost) {
                    bestCost = total;
                    meetingNode = bNode;
                }
            }
            for (let neighbor in graph[bNode]) {
                let alt = backwardDist[bNode] + graph[bNode][neighbor][key];
                if (alt < backwardDist[neighbor]) {
                    backwardDist[neighbor] = alt;
                    backwardPrev[neighbor] = bNode;
                    backwardHeap.push([alt, neighbor]);
                }
            }
        }
        if (meetingNode !== null) break;
    }
    if (meetingNode === null) return null;
    // Reconstruct path
    let path = [];
    let node = meetingNode;
    while (node !== null) {
        path.unshift(node);
        node = forwardPrev[node];
    }
    node = backwardPrev[meetingNode];
    while (node !== null) {
        path.push(node);
        node = backwardPrev[node];
    }
    return { path, cost: bestCost };
}

// --- Bidirectional A* ---
function bidirectionalAstar(graph, start, end, key) {
    if (!graph[start] || !graph[end]) return null;
    if (start === end) return { path: [start], cost: 0 };
    function heuristic(a, b) {
        if (!cityPositions[a] || !cityPositions[b]) return 0;
        const lat1 = cityPositions[a].lat;
        const lng1 = cityPositions[a].lng;
        const lat2 = cityPositions[b].lat;
        const lng2 = cityPositions[b].lng;
        const toRad = value => value * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a1 = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1));
        const R = 6371;
        const distance = R * c;
        const scaleFactor = key === 'cost' ? 20 : 0.3;
        return distance * scaleFactor;
    }
    let forwardG = {}, backwardG = {};
    let forwardF = {}, backwardF = {};
    let forwardPrev = {}, backwardPrev = {};
    let forwardVisited = new Set(), backwardVisited = new Set();
    Object.keys(graph).forEach(v => {
        forwardG[v] = Infinity;
        backwardG[v] = Infinity;
        forwardF[v] = Infinity;
        backwardF[v] = Infinity;
        forwardPrev[v] = null;
        backwardPrev[v] = null;
    });
    forwardG[start] = 0;
    forwardF[start] = heuristic(start, end);
    backwardG[end] = 0;
    backwardF[end] = heuristic(end, start);
    let forwardHeap = new MinHeap();
    let backwardHeap = new MinHeap();
    forwardHeap.push([forwardF[start], start]);
    backwardHeap.push([backwardF[end], end]);
    let meetingNode = null;
    let bestCost = Infinity;
    while (forwardHeap.size() > 0 && backwardHeap.size() > 0) {
        // Forward step
        if (forwardHeap.size() > 0) {
            const [fScore, fNode] = forwardHeap.pop();
            if (forwardVisited.has(fNode)) continue;
            forwardVisited.add(fNode);
            if (backwardVisited.has(fNode)) {
                let total = forwardG[fNode] + backwardG[fNode];
                if (total < bestCost) {
                    bestCost = total;
                    meetingNode = fNode;
                }
            }
            for (let neighbor in graph[fNode]) {
                let tentativeG = forwardG[fNode] + graph[fNode][neighbor][key];
                if (tentativeG < forwardG[neighbor]) {
                    forwardPrev[neighbor] = fNode;
                    forwardG[neighbor] = tentativeG;
                    forwardF[neighbor] = tentativeG + heuristic(neighbor, end);
                    forwardHeap.push([forwardF[neighbor], neighbor]);
                }
            }
        }
        // Backward step
        if (backwardHeap.size() > 0) {
            const [bScore, bNode] = backwardHeap.pop();
            if (backwardVisited.has(bNode)) continue;
            backwardVisited.add(bNode);
            if (forwardVisited.has(bNode)) {
                let total = forwardG[bNode] + backwardG[bNode];
                if (total < bestCost) {
                    bestCost = total;
                    meetingNode = bNode;
                }
            }
            for (let neighbor in graph[bNode]) {
                let tentativeG = backwardG[bNode] + graph[bNode][neighbor][key];
                if (tentativeG < backwardG[neighbor]) {
                    backwardPrev[neighbor] = bNode;
                    backwardG[neighbor] = tentativeG;
                    backwardF[neighbor] = tentativeG + heuristic(neighbor, start);
                    backwardHeap.push([backwardF[neighbor], neighbor]);
                }
            }
        }
        if (meetingNode !== null) break;
    }
    if (meetingNode === null) return null;
    // Reconstruct path
    let path = [];
    let node = meetingNode;
    while (node !== null) {
        path.unshift(node);
        node = forwardPrev[node];
    }
    node = backwardPrev[meetingNode];
    while (node !== null) {
        path.push(node);
        node = backwardPrev[node];
    }
    return { path, cost: bestCost };
}

// --- Landmark-based A* (ALT Algorithm) ---
const ALT_LANDMARKS = [];
const ALT_DISTANCES = {};

function selectLandmarks(graph, num = 3) {
    // Pick first num cities alphabetically as landmarks
    const cities = Object.keys(graph).sort();
    return cities.slice(0, Math.min(num, cities.length));
}

function precomputeLandmarkDistances(graph, landmarks, key) {
    for (const landmark of landmarks) {
        ALT_DISTANCES[landmark] = {};
        const dists = dijkstraAll(graph, landmark, key);
        for (const city in dists) {
            ALT_DISTANCES[landmark][city] = dists[city];
        }
    }
}

function dijkstraAll(graph, start, key) {
    let distances = {};
    let visited = new Set();
    Object.keys(graph).forEach(vertex => {
        distances[vertex] = Infinity;
    });
    distances[start] = 0;
    const heap = new MinHeap();
    heap.push([0, start]);
    while (heap.size() > 0) {
        const [dist, current] = heap.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        for (let neighbor in graph[current]) {
            let alt = distances[current] + graph[current][neighbor][key];
            if (alt < distances[neighbor]) {
                distances[neighbor] = alt;
                heap.push([alt, neighbor]);
            }
        }
    }
    return distances;
}

function altHeuristic(u, v, key) {
    // ALT heuristic: max |d(landmark, v) - d(landmark, u)|
    let maxDiff = 0;
    for (const landmark of ALT_LANDMARKS) {
        const dLtoV = ALT_DISTANCES[landmark][v] ?? Infinity;
        const dLtoU = ALT_DISTANCES[landmark][u] ?? Infinity;
        const diff = Math.abs(dLtoV - dLtoU);
        if (diff > maxDiff) maxDiff = diff;
    }
    return maxDiff;
}

function altAstar(graph, start, end, key) {
    if (!graph[start] || !graph[end]) return null;
    if (ALT_LANDMARKS.length === 0) {
        // Select and precompute for both cost and time
        ALT_LANDMARKS.length = 0;
        ALT_LANDMARKS.push(...selectLandmarks(graph, 3));
        precomputeLandmarkDistances(graph, ALT_LANDMARKS, key);
    }
    let gScore = {};
    let fScore = {};
    let previous = {};
    Object.keys(graph).forEach(node => {
        gScore[node] = Infinity;
        fScore[node] = Infinity;
        previous[node] = null;
    });
    gScore[start] = 0;
    fScore[start] = altHeuristic(start, end, key);
    const heap = new MinHeap();
    heap.push([fScore[start], start]);
    let visited = new Set();
    while (heap.size() > 0) {
        const [_, current] = heap.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        if (current === end) {
            let path = [];
            let curr = end;
            while (curr !== null) {
                path.unshift(curr);
                curr = previous[curr];
            }
            return { path, cost: gScore[end] };
        }
        if (!graph[current]) continue;
        for (let neighbor in graph[current]) {
            let weight = graph[current][neighbor][key];
            let tentativeGScore = gScore[current] + weight;
            if (tentativeGScore < gScore[neighbor]) {
                previous[neighbor] = current;
                gScore[neighbor] = tentativeGScore;
                fScore[neighbor] = tentativeGScore + altHeuristic(neighbor, end, key);
                heap.push([fScore[neighbor], neighbor]);
            }
        }
    }
    return null;
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

    // Get both cost and time routes
    const costRoute = dijkstra(routeGraph, start, end, "cost");
    const timeRoute = dijkstra(routeGraph, start, end, "time");

    if (!costRoute || !timeRoute) {
        document.getElementById("result").innerHTML = `
            <div class="algorithm-result error">
                <h4>No valid route found between ${start} and ${end}</h4>
            </div>
        `;
        return;
    }

    // Update paths for visualization
    selectedPath.bestCost = type === 'cost' ? costRoute.path : null;
    selectedPath.bestTime = type === 'time' ? timeRoute.path : null;
    selectedPath.type = type;

    // Display the selected route
    const selectedRoute = type === 'cost' ? costRoute : timeRoute;
    displayRoute(selectedRoute, type);
}



async function findOptimalRouteAll() {
    showSpinner();
    console.log("Starting findOptimalRouteAll");
    if (Object.keys(cityPositions).length === 0) {
        loadGujaratMap();
    }
    const start = prompt("Enter start city:").toUpperCase();
    const end = prompt("Enter end city:").toUpperCase();
    console.log(`Searching route from ${start} to ${end}`);
    if (!start || !end || !cityPositions[start] || !cityPositions[end]) {
        hideSpinner();
        document.getElementById("result").innerHTML = `
            <div class="algorithm-result error">
                <h4>Error: Invalid cities</h4>
                <p>Available cities: ${Object.keys(cityPositions).join(", ")}</p>
            </div>
        `;
        return;
    }
    if (!hasValidPath(routeGraph, start, end)) {
        hideSpinner();
        document.getElementById("result").innerHTML = `
            <div class="algorithm-result error">
                <h4>No valid path exists between ${start} and ${end}</h4>
            </div>
        `;
        return;
    }
    // List of algorithms to run
    const algorithms = [
        { name: "Dijkstra (Cost)", fn: dijkstra, key: "cost" },
        { name: "A* (Cost)", fn: astar, key: "cost" },
        { name: "DFS (Cost)", fn: dfs, key: "cost" },
        { name: "BFS (Cost)", fn: bfs, key: "cost" },
        { name: "Bellman-Ford (Cost)", fn: bellmanFord, key: "cost" },
        { name: "Floyd-Warshall (Cost)", fn: floydWarshall, key: "cost" },
        { name: "Bidirectional Dijkstra (Cost)", fn: bidirectionalDijkstra, key: "cost" },
        { name: "Bidirectional A* (Cost)", fn: bidirectionalAstar, key: "cost" },
        { name: "ALT A* (Cost)", fn: altAstar, key: "cost" },
        { name: "Dijkstra (Time)", fn: dijkstra, key: "time" },
        { name: "A* (Time)", fn: astar, key: "time" },
        { name: "DFS (Time)", fn: dfs, key: "time" },
        { name: "BFS (Time)", fn: bfs, key: "time" },
        { name: "Bellman-Ford (Time)", fn: bellmanFord, key: "time" },
        { name: "Floyd-Warshall (Time)", fn: floydWarshall, key: "time" },
        { name: "Bidirectional Dijkstra (Time)", fn: bidirectionalDijkstra, key: "time" },
        { name: "Bidirectional A* (Time)", fn: bidirectionalAstar, key: "time" },
        { name: "ALT A* (Time)", fn: altAstar, key: "time" }
    ];
    // Run all algorithms synchronously in the main thread
    const costAlgorithms = {};
    const timeAlgorithms = {};
    const timings = {};
    for (const { name, fn, key } of algorithms) {
        let result = null;
        let t0 = performance.now();
        try {
            if (fn === astar || fn === bidirectionalAstar || fn === altAstar) {
                result = fn(routeGraph, start, end, key, cityPositions);
            } else {
                result = fn(routeGraph, start, end, key);
            }
        } catch (err) {
            console.warn(`Algorithm ${name} threw an error:`, err);
            result = null;
        }
        let t1 = performance.now();
        timings[name] = t1 - t0;
        if (key === "cost") costAlgorithms[name] = result;
        else timeAlgorithms[name] = result;
    }
    hideSpinner();
    displayResults(start, end, costAlgorithms, timeAlgorithms, timings);
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
    try {
        console.log("Starting to load Gujarat map...");

        clearMap();
        console.log("Map cleared");

        loadPredefinedCities();
        console.log("Cities loaded:", Object.keys(cityPositions).length);

        loadPredefinedRoutes();
        console.log("Routes loaded:", Object.keys(routeGraph).length);

        if (Object.keys(cityPositions).length === 0) {
            throw new Error("No cities were loaded");
        }

        displayGraphNetwork();
        console.log("Network display complete");
    } catch (error) {
        console.error("Error loading Gujarat map:", error);
        showEmptyGraphMessage();
    }
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
        cityPositions[city] = location;  // Correct variable
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
            "AHMEDABAD": { cost: 80, time: 2.0 },
            "VADODARA": { cost: 40, time: 1.0 }
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
            }
        },
        "BHARUCH": {
            "ANKLESHWAR": { cost: 30, time: 0.5 },
            "SURAT": {
                // Coastal highway
                cost: 70,
                time: 1.2
            },
            "VADODARA": {
                // Inland route
                cost: 80,
                time: 1.3
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
        if (!routeGraph[city]) routeGraph[city] = {};

        Object.entries(connections).forEach(([target, data]) => {
            if (!routeGraph[target]) routeGraph[target] = {};

            // Add route in both directions
            routeGraph[city][target] = data;
            routeGraph[target][city] = data;
        });
    });

    // Fix: Use routeGraph instead of graph
    if (routeGraph["SURAT"] && routeGraph["VADODARA"]) {
        routeGraph["SURAT"]["VADODARA"].cost = 150;  // Going up costs more
        routeGraph["VADODARA"]["SURAT"].cost = 130;  // Going down costs less
    }

    if (routeGraph["VADODARA"] && routeGraph["AHMEDABAD"]) {
        routeGraph["VADODARA"]["AHMEDABAD"].time = 2.0;  // Going up takes longer
        routeGraph["AHMEDABAD"]["VADODARA"].time = 1.8;  // Going down is faster
    }
}

function addTestRoutes() {
    // Create a diamond-shaped network with different weights
    if (!routeGraph["AHMEDABAD"]) routeGraph["AHMEDABAD"] = {};
    if (!routeGraph["GANDHINAGAR"]) routeGraph["GANDHINAGAR"] = {};
    if (!routeGraph["VADODARA"]) routeGraph["VADODARA"] = {};
    if (!routeGraph["ANAND"]) routeGraph["ANAND"] = {};

    // Direct route (expensive but short)
    routeGraph["AHMEDABAD"]["VADODARA"] = { cost: 120, time: 1.8 };
    routeGraph["VADODARA"]["AHMEDABAD"] = { cost: 120, time: 1.8 };

    // Indirect route via Gandhinagar (medium cost)
    routeGraph["AHMEDABAD"]["GANDHINAGAR"] = { cost: 35, time: 0.7 };
    routeGraph["GANDHINAGAR"]["AHMEDABAD"] = { cost: 35, time: 0.7 };
    routeGraph["GANDHINAGAR"]["VADODARA"] = { cost: 95, time: 1.6 };
    routeGraph["VADODARA"]["GANDHINAGAR"] = { cost: 95, time: 1.6 };

    // Longer route via Anand (cheaper but longer)
    routeGraph["AHMEDABAD"]["ANAND"] = { cost: 80, time: 1.3 };
    routeGraph["ANAND"]["AHMEDABAD"] = { cost: 80, time: 1.3 };
    routeGraph["ANAND"]["VADODARA"] = { cost: 30, time: 0.6 };
    routeGraph["VADODARA"]["ANAND"] = { cost: 30, time: 0.6 };

    // Create a denser network around Rajkot
    if (!routeGraph["RAJKOT"]) routeGraph["RAJKOT"] = {};
    if (!routeGraph["MORBI"]) routeGraph["MORBI"] = {};
    if (!routeGraph["JAMNAGAR"]) routeGraph["JAMNAGAR"] = {};
    if (!routeGraph["JUNAGADH"]) routeGraph["JUNAGADH"] = {};

    // Direct route
    routeGraph["RAJKOT"]["JUNAGADH"] = { cost: 110, time: 1.8 };
    routeGraph["JUNAGADH"]["RAJKOT"] = { cost: 110, time: 1.8 };

    // Via Morbi (longer)
    routeGraph["RAJKOT"]["MORBI"] = { cost: 65, time: 1.1 };
    routeGraph["MORBI"]["RAJKOT"] = { cost: 65, time: 1.1 };
    routeGraph["MORBI"]["JUNAGADH"] = { cost: 130, time: 2.0 };
    routeGraph["JUNAGADH"]["MORBI"] = { cost: 130, time: 2.0 };

    // Via Jamnagar (more expensive)
    routeGraph["RAJKOT"]["JAMNAGAR"] = { cost: 90, time: 1.5 };
    routeGraph["JAMNAGAR"]["RAJKOT"] = { cost: 90, time: 1.5 };
    routeGraph["JAMNAGAR"]["JUNAGADH"] = { cost: 105, time: 1.7 };
    routeGraph["JUNAGADH"]["JAMNAGAR"] = { cost: 105, time: 1.7 };
}

// --- Dynamic Cache Updates ---
function invalidateCachesForCity(city) {
    // Invalidate routeCache entries involving the city
    for (const key of Array.from(routeCache.keys())) {
        if (key.includes(`_${city}_`) || key.endsWith(`_${city}`) || key.startsWith(`${city}_`)) {
            routeCache.delete(key);
        }
    }
    // Invalidate ALT precomputes
    ALT_LANDMARKS.length = 0;
    for (const k in ALT_DISTANCES) delete ALT_DISTANCES[k];
}

// Patch addNewRoute to invalidate cache for both cities
const _originalAddNewRoute = addNewRoute;
addNewRoute = function(data) {
    invalidateCachesForCity(data.start);
    invalidateCachesForCity(data.end);
    _originalAddNewRoute(data);
};

// --- UI Spinner Helpers ---
function showSpinner() {
    let spinner = document.getElementById('algo-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'algo-spinner';
        spinner.style.position = 'fixed';
        spinner.style.top = '50%';
        spinner.style.left = '50%';
        spinner.style.transform = 'translate(-50%, -50%)';
        spinner.style.zIndex = '9999';
        spinner.innerHTML = '<div style="padding:20px;background:#fff;border-radius:8px;box-shadow:0 2px 8px #0002;font-size:1.2em;">⏳ Calculating routes...</div>';
        document.body.appendChild(spinner);
    } else {
        spinner.style.display = 'block';
    }
}
function hideSpinner() {
    let spinner = document.getElementById('algo-spinner');
    if (spinner) spinner.style.display = 'none';
}