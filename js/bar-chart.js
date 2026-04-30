const b_svgWidth = 1000;
const b_svgHeight = 600; 
const b_margin = { top: 50, right: 200, bottom: 70, left: 120 };

const b_width = b_svgWidth - b_margin.left - b_margin.right;
const b_height = b_svgHeight - b_margin.top - b_margin.bottom;

const b_svg = d3.select("#bar-chart-container")
    .append("svg")
    .attr("width", b_svgWidth)
    .attr("height", b_svgHeight)
    .style("pointer-events", "none")
    .append("g")
    .attr("transform", `translate(${b_margin.left}, ${b_margin.top})`);

const features = ['benefits_n', 'care_n', 'wellness_n', 'help_n', 'anon_n'];
const featureLabels = {
    'benefits_n': 'Health Benefits',
    'care_n': 'Care Options',
    'wellness_n': 'Wellness Program',
    'help_n': 'Help Resources',
    'anon_n': 'Anonymity'
};

const companyOrder = ["1-5", "6-25", "26-100", "100-500", "500-1000", "More than 1000"];

d3.csv("data/cleaned_data.csv").then(data => {

    const processedData = companyOrder.map(size => {
        const group = data.filter(d => d.no_employees === size);
        const total = group.length;
        const entry = { size: size };
        
        features.forEach(f => {
            const yesCount = group.filter(d => +d[f] === 1).length;
            entry[f] = total > 0 ? (yesCount / total) * 100 : 0;
        });
        return entry;
    });

    const stack = d3.stack().keys(features);
    const stackedData = stack(processedData);

    const x = d3.scaleLinear()
        .domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))])
        .nice()
        .range([0, b_width]);

    const y = d3.scaleBand()
        .domain(companyOrder)
        .range([0, b_height])
        .padding(0.3);

    const color = d3.scaleOrdinal()
        .domain(features)
        .range(["#dadaeb", "#bcbddc", "#9e9ac8", "#756bb1", "#54278f"]);

    b_svg.append("g")
        .selectAll("g")
        .data(stackedData)
        .enter().append("g")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter().append("rect")
        .attr("y", d => y(d.data.size))
        .attr("x", d => x(d[0]))
        .attr("width", d => x(d[1]) - x(d[0]))
        .attr("height", y.bandwidth());

    b_svg.append("g")
        .attr("transform", `translate(0, ${b_height})`)
        .call(d3.axisBottom(x).tickFormat(d => d + "%"))
        .style("font-size", "12px");

    b_svg.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "12px");

    const legend = b_svg.append("g")
        .attr("transform", `translate(${b_width + 20}, 0)`);

    features.forEach((feature, i) => {
        const g = legend.append("g")
            .attr("transform", `translate(0, ${i * 25})`);
        
        g.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", color(feature));
        
        g.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .style("fill", "#2c3e50")
            .text(featureLabels[feature]);
    });

}).catch(err => console.error("Static Bar Chart Error:", err));