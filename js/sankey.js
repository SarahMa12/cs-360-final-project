let rawData = [];
let selectionOrder = []; // Track the order of selected features for the sankey diagram

// Margins
const k_margin = {top: 40, right: 180, bottom: 40, left: 180}; 
const k_width = 1400 - k_margin.left - k_margin.right;
const k_height = 550 - k_margin.top - k_margin.bottom;

const k_svg = d3.select("#sankey-container") 
    .append("svg")
    .attr("viewBox", `0 0 ${k_width + k_margin.left + k_margin.right} ${k_height + k_margin.top + k_margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${k_margin.left},${k_margin.top})`);

// Map csv column keys to labels on the diagram
const labelMap = {
    "self_employed": "Self-Employed",
    "remote_work": "Remote Work",
    "tech_company": "Tech Company",
    "coworkers": "Coworkers",
    "supervisor": "Supervisor",
    "treatment": "Treatment"
};

// Load data
// SOURCE: https://gist.github.com/d3noob/06e72deea99e7b4859841f305f63ba85
d3.csv("./data/cleaned_data.csv").then(data => {
    rawData = data;
    
    // Interactive checklist
    d3.selectAll(".sankey-feat").on("change", function() {
        const val = this.value;
        
        if (this.checked) {
            selectionOrder.push(val);
        } else {
            selectionOrder = selectionOrder.filter(d => d !== val);
        }

        updateSankey(); // Redraw with new column order
    });

    updateSankey(); // Initial draw (will be empty)
});

// Function to update the sankey diagram based on current selections
function updateSankey() {
    let selectedDims = [...selectionOrder, "treatment"]; // Make sure treatment is at the end

    // Clear previous diagram
    k_svg.selectAll("*").remove();

    // Handle empty case
    if (selectionOrder.length === 0) {
        k_svg.append("text")
            .attr("x", k_width / 2)
            .attr("y", k_height / 2)
            .attr("text-anchor", "middle")
            .text("Click the checkboxes to visualize how workplace conditions affect seeking treatment")
            .style("fill", "#90a4ae")
            .style("font-style", "italic")
            .style("font-size", "14px");
        return;
    }

    let nodes = [];
    let links = [];

    selectedDims.forEach((dim, i) => {
        if (i === selectedDims.length - 1) return;
        const currDim = dim;
        const nextDim = selectedDims[i + 1];

        // Calculate volumn of people moving between two categories
        const counts = d3.rollups(rawData, v => v.length, 
            d => String(d[currDim]).trim(), 
            d => String(d[nextDim]).trim()
        );

        counts.forEach(([currVal, nextGroup]) => {
            nextGroup.forEach(([nextVal, count]) => {

                const sourceId = `${currDim}_${currVal}`;
                const targetId = `${nextDim}_${nextVal}`;

                // Create unique nodes if they don't exist
                if (!nodes.find(n => n.id === sourceId)) nodes.push({id: sourceId, name: currVal, category: labelMap[currDim]});
                if (!nodes.find(n => n.id === targetId)) nodes.push({id: targetId, name: nextVal, category: labelMap[nextDim]});

                // Create link between the two nodes
                links.push({
                    source: nodes.findIndex(n => n.id === sourceId),
                    target: nodes.findIndex(n => n.id === targetId),
                    value: count,
                    isPositive: nextVal === "Yes" && nextDim === "treatment"
                });
            });
        });
    });

    // Compute the sankey diagram
    const sankey = d3.sankey()
        .nodeWidth(24)
        .nodePadding(50)
        .nodeAlign(d3.sankeyJustify)
        .size([k_width, k_height]);

    const graph = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    // Draw the sankey diagram flows
    k_svg.append("g").selectAll("path")
        .data(graph.links)
        .enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => d.isPositive ? "#b39ddb" : "#cfd8dc")
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("fill", "none")
        .style("opacity", 0.4);

    const node = k_svg.append("g").selectAll("g")
        .data(graph.nodes)
        .enter().append("g");

    // Draw the sankey diagram bars
    node.append("rect")
        .attr("x", d => d.x0).attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0).attr("width", d => d.x1 - d.x0)
        .style("fill", d => d.name === "Yes" ? "#4a148c" : "#90a4ae")
        .style("stroke", "#fff")
        .style("stroke-width", "2px");

    // Labels
    node.append("text")
        .attr("x", d => d.x0 < k_width / 2 ? d.x1 + 10 : d.x0 - 10)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < k_width / 2 ? "start" : "end")
        .text(d => `${d.category}: ${d.name}`)
        .style("font-size", "11px").style("font-weight", "800");
}