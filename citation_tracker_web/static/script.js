// Updated script.js with export, node info panel, legend, edge labels, and distinct shapes/colors

let allNodes = [], allLinks = [], simulation;

function resetGraph() {
  document.getElementById("author-query").value = "";
  document.getElementById("citation-query").value = "";
  document.getElementById("chain-query").value = "";
  document.getElementById("query-results").innerHTML = "";
  drawGraph();
}

async function handleQueries() {
  const author = document.getElementById("author-query").value.trim();
  const citation = document.getElementById("citation-query").value.trim();
  const chain = document.getElementById("chain-query").value.trim();
  const resultBox = document.getElementById("query-results");
  resultBox.innerHTML = "<em>Loading...</em>";

  if (author) {
    const res = await fetch(`/search/author/${encodeURIComponent(author)}`);
    const papers = await res.json();
    renderResults(papers, `Papers written by ${author}`);
  } else if (citation) {
    const res = await fetch(`/search/citations/${encodeURIComponent(citation)}`);
    const citers = await res.json();
    renderResults(citers, `Papers citing '${citation}'`);
  } else if (chain) {
    const res = await fetch('/visualize');
    const graphData = await res.json();
    const chainNodes = traceCitationChain(chain, graphData.edges);
    renderResults(chainNodes, `Citation chain from '${chain}'`);
  } else {
    resultBox.innerHTML = "<em>Please enter a query above.</em>";
  }
}

function renderResults(ids, title) {
  const resultBox = document.getElementById("query-results");
  if (!ids.length) {
    resultBox.innerHTML = `<p><strong>${title}</strong><br>No results found.</p>`;
    return;
  }
  const list = ids.map(id => `<li>${id}</li>`).join("");
  resultBox.innerHTML = `<p><strong>${title}</strong></p><ul>${list}</ul>`;
}

function traceCitationChain(start, edges) {
  const visited = new Set();
  const queue = [start];
  while (queue.length) {
    const curr = queue.shift();
    visited.add(curr);
    edges.forEach(edge => {
      if (edge.source === curr && edge.relation === "cites" && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    });
  }
  return Array.from(visited);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = Object.fromEntries(fd.entries());
    const res = await fetch('/submit-paper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    });
    const data = await res.json();
    alert(data.msg);
    e.target.reset();
    drawGraph();
  });

  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await fetch('/upload-batch', {
      method: 'POST',
      body: fd
    });
    const data = await res.json();
    alert(data.msg);
    e.target.reset();
    drawGraph();
  });

  const queryBtn = document.getElementById("query-button");
  if (queryBtn) {
    queryBtn.addEventListener("click", handleQueries);
  }

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export as PNG';
  exportBtn.style.cssText = 'position:absolute; top:700px; right:400px; z-index:10; padding:6px 12px; font-size:13px;';
  exportBtn.onclick = () => {
    const svg = document.querySelector('#visual-area svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = svg.clientWidth;
    canvas.height = svg.clientHeight;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = 'citation_graph.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };
  document.body.appendChild(exportBtn);

  const infoBox = document.createElement('div');
  infoBox.id = 'node-info';
  infoBox.style.cssText = 'position:absolute; top:60px; right:20px; width:250px; background:white; border:1px solid #ccc; padding:12px; font-size:13px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.1); display:none;';
  document.body.appendChild(infoBox);

  drawGraph();
});

async function drawGraph() {
  const res = await fetch('/visualize');
  const graphData = await res.json();
  allNodes = graphData.nodes;
  allLinks = graphData.edges;

  d3.select("#visual-area").selectAll("*").remove();

  const width = 960, height = 780;

  const svg = d3.select("#visual-area")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "#f5f7fa");

  const color = d3.scaleOrdinal()
    .domain(["main_paper", "cited_paper", "author", "journal"])
    .range(["#1f497d", "#e74c3c", "#f1c40f", "#27ae60"]);

  const shape = d3.scaleOrdinal()
    .domain(["main_paper", "cited_paper", "author", "journal"])
    .range([d3.symbolCircle, d3.symbolCircle, d3.symbolSquare, d3.symbolDiamond]);

  const edgeColor = {
    'cites': '#2c3e50',
    'authored_by': '#9b59b6',
    'in_journal': '#2980b9'
  };

  simulation = d3.forceSimulation(graphData.nodes)
    .force("link", d3.forceLink(graphData.edges).id(d => d.id).distance(180).strength(1))
    .force("charge", d3.forceManyBody().strength(-700).distanceMax(400))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(32))
    .force("cluster", clusteringForce(0.08));

  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "-0 -5 10 10")
    .attr("refX", 25)
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("xoverflow", "visible")
    .append("path")
    .attr("d", "M 0,-5 L 10,0 L 0,5")
    .attr("fill", "#6666ff")
    .style("stroke", "none");

  const link = svg.append("g")
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 0.7)
    .selectAll("line")
    .data(graphData.edges)
    .join("line")
    .attr("stroke", d => edgeColor[d.relation] || "#999")
    .attr("marker-end", d => d.relation === "cites" ? "url(#arrowhead)" : "");

  const edgeLabels = svg.append("g")
    .selectAll("text")
    .data(graphData.edges)
    .join("text")
    .text(d => d.relation)
    .attr("font-size", 10)
    .attr("fill", d => edgeColor[d.relation] || "#999")
    .attr("text-anchor", "middle")
    .style("pointer-events", "none");

  const node = svg.append("g")
    .selectAll("path")
    .data(graphData.nodes)
    .join("path")
    .attr("d", d3.symbol().type(d => shape(d.type)).size(400))
    .attr("fill", d => color(d.type))
    .attr("stroke", "#222")
    .attr("stroke-width", 1.8)
    .style("cursor", "pointer")
    .call(drag(simulation))
    .on("click", showNodeInfo);

  const label = svg.append("g")
    .selectAll("text")
    .data(graphData.nodes)
    .join("text")
    .text(d => d.id)
    .attr("font-size", 13)
    .attr("fill", "#333")
    .attr("font-weight", "600")
    .attr("pointer-events", "none")
    .attr("dy", "0.35em")
    .attr("dx", 14);

  node.append("title")
    .text(d => `${capitalizeWords(d.type.replace(/_/g, ' '))}: ${d.id}`);

  simulation.on("tick", () => {
    link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
    label.attr("x", d => d.x).attr("y", d => d.y);
    edgeLabels.attr("x", d => (d.source.x + d.target.x) / 2)
              .attr("y", d => (d.source.y + d.target.y) / 2);
  });

  const legend = svg.append("g")
    .attr("transform", `translate(20, 20)`);

  const types = ["main_paper", "cited_paper", "author", "journal"];
  types.forEach((type, i) => {
    legend.append("path")
      .attr("d", d3.symbol().type(shape(type)).size(150)())
      .attr("transform", `translate(10, ${i * 25})`)
      .attr("fill", color(type))
      .attr("stroke", "#222");

    legend.append("text")
      .attr("x", 24)
      .attr("y", i * 25 + 5)
      .attr("font-size", 13)
      .text(capitalizeWords(type.replace("_", " ")));
  });

  function drag(sim) {
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
  }

  function showNodeInfo(event, d) {
    const infoBox = document.getElementById('node-info');
    infoBox.innerHTML = `<strong>${capitalizeWords(d.type)}:</strong> ${d.id}<br>` +
      (d.year ? `<strong>Year:</strong> ${d.year}<br>` : '') +
      `<strong>Type:</strong> ${d.type}`;
    infoBox.style.display = 'block';
  }

  function clusteringForce(strength = 0.12) {
    const centers = {
      main_paper: { x: width * 0.3, y: height / 2 },
      cited_paper: { x: width * 0.3, y: height * 0.7 },
      author: { x: width * 0.7, y: height * 0.3 },
      journal: { x: width * 0.7, y: height * 0.7 }
    };
    function force(alpha) {
      for (const node of graphData.nodes) {
        const center = centers[node.type];
        if (center) {
          node.vx += (center.x - node.x) * strength * alpha;
          node.vy += (center.y - node.y) * strength * alpha;
        }
      }
    }
    force.initialize = () => {};
    return force;
  }

  function capitalizeWords(str) {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}

drawGraph();
