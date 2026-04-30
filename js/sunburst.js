const s_svgWidth = 1000;
const s_svgHeight = 600; 
const s_margin = { top: 50, right: 200, bottom: 70, left: 120 };

const s_width = s_svgWidth - s_margin.left - s_margin.right;
const s_height = s_svgHeight - s_margin.top - s_margin.bottom;
const s_radius = Math.min(s_width, s_height) / 2;

const s_svg = d3.select("#sunburst-container")
    .append("svg")
    .attr("width", s_svgWidth)
    .attr("height", s_svgHeight)
    .append("g")
    .attr("transform", `translate(${(s_width / 2) + s_margin.left}, ${(s_height / 2) + s_margin.top})`);

d3.csv("data/cleaned_data.csv").then(data => {

    const nested = d3.groups(data, 
        d => d.treatment === "Yes" ? "Sought Treatment" : "No Treatment",
        d => d.no_employees
    );

    const rootData = {
        name: "OSMI Survey",
        children: nested.map(([status, sizes]) => ({
            name: status,
            children: sizes.map(([size, entries]) => ({
                name: size,
                size: entries.length
            }))
        }))
    };

    const root = d3.hierarchy(rootData)
        .sum(d => d.size)
        .sort((a, b) => b.value - a.value);

    const partition = d3.partition().size([2 * Math.PI, s_radius]);
    partition(root);

    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);

    const color = d3.scaleOrdinal()
        .domain(["Sought Treatment", "No Treatment"])
        .range(["#54278f", "#cbc9e2"]);

    s_svg.selectAll("path")
        .data(root.descendants().filter(d => d.depth > 0))
        .enter()
        .append("path")
        .attr("d", arc)
        .style("fill", d => {
            if (d.depth === 1) return color(d.data.name);
            return d3.rgb(color(d.parent.data.name)).brighter(0.5);
        })
        .style("stroke", "#fff");


    s_svg.selectAll("text")
        .data(root.descendants().filter(d => d.depth > 0 && (d.x1 - d.x0) > 0.15))
        .enter()
        .append("text")
        .attr("transform", d => {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "11px")
        .style("fill", d => d.depth === 1 ? "white" : "#333")
        .text(d => d.data.name);

}).catch(err => console.error(err));