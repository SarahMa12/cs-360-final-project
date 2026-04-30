const svgWidth = 1000;
const svgHeight = 700; 
const margin = { top: -20, right: 110, bottom: 90, left: 0 };

const width = svgWidth - margin.left - margin.right;
const height = svgHeight - margin.top - margin.bottom;

const svg = d3.select("#map-container")
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g") 
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(1000); 

const path = d3.geoPath().projection(projection);

const colorScale = d3.scaleSequential(d3.interpolatePurples).domain([0, 6]);

Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
    d3.csv("../data/cleaned_data.csv")
]).then(([topoData, csvData]) => {
    
    const states = topojson.feature(topoData, topoData.objects.states).features;

    const stateScores = d3.rollup(csvData, 
        v => d3.mean(v, d => +d.support_score), 
        d => d.state_full
    );

    svg.append("g")
        .selectAll("path")
        .data(states)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const score = stateScores.get(d.properties.name);
            return score ? colorScale(score) : "#455a64"; 
        })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.5)
        .append("title")
        .text(d => {
            const score = stateScores.get(d.properties.name);
            return `${d.properties.name}\nAvg Score: ${score ? score.toFixed(2) : "N/A"}`;
        });

    const legend = d3.legendColor()
        .labelFormat(d3.format(".2f"))
        .title("Support Score")
        .scale(colorScale)
        .cells(6);

    svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, ${height - 180})`)
        .call(legend);

}).catch(err => console.error("Error:", err));