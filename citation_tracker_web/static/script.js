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
    e.target.reset();  // Clear form after submit
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
    e.target.reset();  // Clear form after upload
    drawGraph();
});

async function drawGraph() {
  const res = await fetch('/visualize');
  const graphData = await res.json();

  d3.select("#visual-area").selectAll("*").remove();

  const width = 960, height = 650;

  const svg = d3.select("#visual-area")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "#f5f7fa")
    .style("font-family", "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif");

  const color = d3.scaleOrdinal()
    .domain(["main_paper", "cited_paper", "author", "journal"])
    .range(["#1f497d", "#4a90e2", "#f28e2b", "#3b9d3b"]);

  const shape = d3.scaleOrdinal()
    .domain(["main_paper", "cited_paper", "author", "journal"])
    .range([d3.symbolCircle, d3.symbolCircle, d3.symbolSquare, d3.symbolCircle]);

  const edgeColor = {
    'cites': '#6666ff',
    'authored_by': '#ff9800',
    'in_journal': '#4caf50'
  };

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

  const simulation = d3.forceSimulation(graphData.nodes)
    .force("link", d3.forceLink(graphData.edges).id(d => d.id)
      .distance(180)     // increased for more space
      .strength(1))
    .force("charge", d3.forceManyBody()
      .strength(-700)   // stronger repulsion
      .distanceMax(400)) // repulsion effective up to 400px
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(32))  // larger collision radius
    .force("cluster", clusteringForce(0.08));  // slightly weaker cluster force

  const link = svg.append("g")
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 0.7)
    .selectAll("line")
    .data(graphData.edges)
    .join("line")
    .attr("stroke", d => edgeColor[d.relation] || "#999")
    .attr("stroke-dasharray", d => d.relation === "cites" ? "6 3" : "0")
    .attr("marker-end", d => d.relation === "cites" ? "url(#arrowhead)" : "");

  const linkLabels = svg.append("g")
    .selectAll("text")
    .data(graphData.edges.filter(d => d.relation === 'cites'))
    .join("text")
    .attr("font-size", 11)
    .attr("fill", "#4b4b4b")
    .attr("font-weight", "600")
    .attr("pointer-events", "none")
    .text("cites");

  const node = svg.append("g")
    .selectAll("path")
    .data(graphData.nodes)
    .join("path")
    .attr("d", d3.symbol().type(d => shape(d.type)).size(400)) // slightly bigger for clarity
    .attr("fill", d => color(d.type))
    .attr("stroke", "#222")
    .attr("stroke-width", 1.8)
    .style("cursor", "pointer")
    .call(drag(simulation));

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
    .attr("dx", 14)  // a bit more offset from node
    .style("user-select", "none")
    .style("text-shadow", "0 0 3px #fff");

  node.append("title")
    .text(d => `${capitalizeWords(d.type.replace(/_/g, ' '))}: ${d.id}`);

  node.on("mouseover", function(event, d) {
    node.style("opacity", o => areConnected(d, o) ? 1 : 0.2);
    link.style("opacity", o => (o.source.id === d.id || o.target.id === d.id ? 1 : 0.1));
    label.style("opacity", o => areConnected(d, o) ? 1 : 0.2);
  }).on("mouseout", () => {
    node.style("opacity", 1);
    link.style("opacity", 0.7);
    label.style("opacity", 1);
  });

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    linkLabels
      .attr("x", d => (d.source.x + d.target.x) / 2)
      .attr("y", d => (d.source.y + d.target.y) / 2 - 8);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
    label.attr("x", d => d.x).attr("y", d => d.y);
  });

  function drag(sim) {
    function started(event, d) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x; d.fy = event.y;
    }
    function ended(event, d) {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null; d.fy = null;
    }
    return d3.drag()
      .on("start", started)
      .on("drag", dragged)
      .on("end", ended);
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

  const linkedByIndex = {};
  graphData.edges.forEach(d => {
    const sourceIndex = typeof d.source === 'object' ? d.source.index : graphData.nodes.findIndex(n => n.id === d.source);
    const targetIndex = typeof d.target === 'object' ? d.target.index : graphData.nodes.findIndex(n => n.id === d.target);
    linkedByIndex[`${sourceIndex},${targetIndex}`] = true;
    linkedByIndex[`${targetIndex},${sourceIndex}`] = true;
  });

  function areConnected(a, b) {
    return a.index === b.index || linkedByIndex[`${a.index},${b.index}`];
  }

  function capitalizeWords(str) {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const legendData = [
    { label: "Main Paper", color: color("main_paper"), shape: d3.symbolCircle },
    { label: "Cited Paper", color: color("cited_paper"), shape: d3.symbolCircle },
    { label: "Author", color: color("author"), shape: d3.symbolSquare },
    { label: "Journal", color: color("journal"), shape: d3.symbolCircle },
  ];

  const legend = svg.append("g")
    .attr("transform", `translate(${width - 180}, 20)`);

  legend.selectAll("path")
    .data(legendData)
    .join("path")
    .attr("d", d => d3.symbol().type(d.shape).size(200)())
    .attr("fill", d => d.color)
    .attr("stroke", "#222")
    .attr("stroke-width", 1.2)
    .attr("transform", (d, i) => `translate(0,${i * 30})`);

  legend.selectAll("text")
    .data(legendData)
    .join("text")
    .text(d => d.label)
    .attr("x", 28)
    .attr("y", (d, i) => i * 30 + 5)
    .attr("font-size", 13)
    .attr("font-weight", "600")
    .attr("fill", "#222")
    .attr("alignment-baseline", "middle");
}

drawGraph();


