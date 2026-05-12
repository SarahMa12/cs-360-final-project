// Margins
const svgWidth = 1100;
const svgHeight = 700;

// Margins for map
const mapMargin = { top: -20, right: 50, bottom: 50, left: 0 };
const mWidth = svgWidth - mapMargin.left - mapMargin.right;
const mHeight = svgHeight - mapMargin.top - mapMargin.bottom;

// Margins for bar chart
const barMargin = { top: 20, right: 30, bottom: 170, left: 210 };
const bWidth = svgWidth - barMargin.left - barMargin.right;
const bHeight = 850 - barMargin.top - barMargin.bottom;

let allData = []; // For CSV data
let selectedState = null; // Tracks which state is clicked on the map

// Domain for categorical axes and features for bar chart
const companyOrder = [
  "More than 1000",
  "500-1000",
  "100-500",
  "26-100",
  "6-25",
  "1-5",
];
const features = ["benefits_n", "care_n", "wellness_n", "help_n", "anon_n", "leave_n"];
const featureLabels = {
  benefits_n: "Health Benefits",
  care_n: "Care Options",
  wellness_n: "Wellness Program",
  help_n: "Help Resources",
  anon_n: "Anonymity",
  leave_n: "Leave Accessibility",
};

// SVG containers for the two charts
const mapSvg = d3
  .select("#map-container")
  .append("svg")
  .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
  .append("g")
  .attr("transform", `translate(${mapMargin.left}, ${mapMargin.top})`);

const barSvg = d3
  .select("#bar-chart-container")
  .append("svg")
  .attr("viewBox", `0 0 ${svgWidth} 850`)
  .append("g")
  .attr("transform", `translate(${barMargin.left}, ${barMargin.top})`);

const tooltip = d3.select("#tooltip");

// Bar chart scales
const bY0 = d3
  .scaleBand()
  .domain(companyOrder)
  .range([0, bHeight])
  .padding(0.3);

const bY1 = d3
  .scaleBand()
  .domain(features)
  .range([0, bY0.bandwidth()])
  .padding(0.02);

const bX = d3.scaleLinear().domain([0, 100]).range([0, bWidth]);

const bColor = d3
  .scaleOrdinal()
  .domain(features)
  .range(["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02"]); // ColorBrewer 6-class Dark2

// Loading data
Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
  d3.csv("data/cleaned_data.csv"),
])
  .then(([topoData, csvData]) => {
    allData = csvData;

    // Calculate support score per state and count of responses
    const states = topojson.feature(topoData, topoData.objects.states).features;
    const stateMetrics = d3.rollup(
      allData,
      (v) => ({
        avgScore: d3.mean(v, (d) => +d.support_score),
        count: v.length,
      }),
      (d) => d.state_full,
    );

    const colorScale = d3.scaleSequential(d3.interpolatePurples).domain([0, 6]);
    const projection = d3
      .geoAlbersUsa()
      .translate([mWidth / 2, mHeight / 2])
      .scale(1400);
    const path = d3.geoPath().projection(projection);

    // Draw choropleth map
    mapSvg
      .append("g")
      .selectAll("path")
      .data(states)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const metrics = stateMetrics.get(d.properties.name);
        return metrics ? colorScale(metrics.avgScore) : "#f0f0f0"; // If no data, make it gray
      })
      .attr("stroke", "#000000")
      .attr("stroke-width", 0.75)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const m = stateMetrics.get(d.properties.name);
        d3.select(this).attr("stroke-width", 2.5);
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.properties.name}</strong><br/>Responses: ${m ? m.count : 0}<br/>Avg Score: ${m ? m.avgScore.toFixed(2) : "N/A"}`,
          );
      })
      .on("mousemove", (event) =>
        tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px"),
      )
      .on("mouseout", function (event, d) {
        // Only shrink the border if it's not the currently selected state
        if (selectedState !== d.properties.name) {
          d3.select(this).attr("stroke-width", 0.75);
        }
        tooltip.style("opacity", 0);
      })
      .on("click", function (event, d) {
        // Toggle state selection (click to select, click again to deselect)
        const stateName = d.properties.name;
        if (selectedState === stateName) {
          selectedState = null;
          d3.selectAll("path").style("opacity", 1).attr("stroke-width", 0.75);
        } else {
          selectedState = stateName;
          d3.selectAll("path").style("opacity", 0.3).attr("stroke-width", 0.75);
          d3.select(this).style("opacity", 1).attr("stroke-width", 4);
        }
        updateBarChart(selectedState); // Trigger bar chart update
      });

    // Map color legend
    const legend = d3
      .legendColor()
      .labelFormat(d3.format(".2f"))
      .title("Support Score")
      .scale(colorScale)
      .cells(6);
    mapSvg
      .append("g")
      .attr("transform", `translate(${mWidth - 110}, ${mHeight - 160})`)
      .style("font-size", "22px")
      .call(legend);

    // Axis for bar chart
    barSvg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${bHeight})`)
      .call(d3.axisBottom(bX).tickFormat((d) => d + "%"))
      .style("font-size", "22px");
    
    barSvg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(bY0))
      .style("font-size", "22px");

    // Add Y-axis label
    barSvg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-barMargin.left + 50}, ${bHeight / 2}) rotate(-90)`)
      .style("font-size", "26px")
      .style("font-weight", "bold")
      .text("Company Size");

    // Bar chart color legend
    const bLegend = barSvg
      .append("g")
      .attr("transform", `translate(0, ${bHeight + 60})`);
    
    features.forEach((feature, i) => {
      const row = Math.floor(i / 3); // 3 items per row
      const col = i % 3;
      const g = bLegend
        .append("g")
        .attr("transform", `translate(${col * 300}, ${row * 45})`);
      
      g.append("rect")
        .attr("width", 22)
        .attr("height", 22)
        .attr("fill", bColor(feature));
      
      g.append("text")
        .attr("x", 30)
        .attr("y", 11)
        .attr("dy", "0.35em")
        .style("font-size", "22px")
        .text(featureLabels[feature]);
    });

    updateBarChart(null); // Initial load with no state filter
  });

// Function to update bar chart based on selected state
function updateBarChart(filterState) {
  // Filter dataset based on map selection
  const displayData = filterState
    ? allData.filter((d) => d.state_full === filterState)
    : allData;

  // Update section title and substitle with sample size info
  d3.select("#bar-chart-section h3").text(
    filterState
      ? `Grouped Bar Chart - Mental Health Support by Company Size in ${filterState}`
      : "Grouped Bar Chart - Mental Health Support by Company Size in the U.S.",
  );

  const infoText = filterState
    ? `Sample Size: ${displayData.length} responses`
    : `Total Sample Size: ${allData.length} responses`;
  let subtitle = d3.select("#sample-info");
  if (subtitle.empty())
    subtitle = d3
      .select("#bar-chart-section")
      .insert("p", "#bar-chart-container")
      .attr("id", "sample-info");
  subtitle
    .text(infoText)
    .style("font-style", "italic")
    .style("color", "#7f8c8d");

  // Handle cases where a state has no survey data
  if (displayData.length === 0) {
    barSvg.selectAll(".company-group").remove();
    subtitle
      .text(`No data available for ${filterState}`)
      .style("color", "#e74c3c");
    return;
  }

  // Calculate percentage of 'Yes' responses for each feature per company size
  const processedData = companyOrder.map((size) => {
    const group = displayData.filter((d) => d.no_employees === size);
    const total = group.length;
    return {
      size: size,
      hasResponses: total > 0,
      values: features.map((f) => ({
        feature: f,
        value:
          total > 0 ? (group.filter((d) => +d[f] > 0).length / total) * 100 : 0,
      })),
    };
  });

  // Combine data for company groups
  const companyGroups = barSvg
    .selectAll(".company-group")
    .data(processedData, (d) => d.size);

  const companyGroupsEnter = companyGroups
    .enter()
    .append("g")
    .attr("class", "company-group")
    .attr("transform", (d) => `translate(0, ${bY0(d.size)})`);

  const combinedGroups = companyGroupsEnter.merge(companyGroups);

  // Add a group-level background/outline to unify the bars in each company size
  const groupBg = combinedGroups.selectAll(".group-bg-box").data((d) => [d]);
  groupBg
    .enter()
    .insert("rect", ":first-child") // Put it behind the bars
    .attr("class", "group-bg-box")
    .merge(groupBg)
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", bWidth)
    .attr("height", bY0.bandwidth())
    .attr("fill", "rgba(0, 77, 64, 0.01)") // Almost transparent
    .attr("stroke", "#4b5563") // Darker gray for more definition
    .attr("stroke-width", 1.5);

  // Separate active (with responses) and inactive groups for styling
  const activeGroups = combinedGroups.filter((d) => d.hasResponses);
  const inactiveGroups = combinedGroups.filter((d) => !d.hasResponses);
  inactiveGroups.selectAll("rect").remove();

  // Draw background bars
  const bgBars = activeGroups.selectAll(".bg-bar").data(
    (d) => d.values,
    (d) => d.feature,
  );

  bgBars
    .enter()
    .append("rect")
    .attr("class", "bg-bar")
    .merge(bgBars)
    .attr("x", 0)
    .attr("y", (d) => bY1(d.feature))
    .attr("width", bX(100))
    .attr("height", bY1.bandwidth())
    .attr("fill", "#f8f9fa") // Light neutral gray/white for background bars
    .on("mouseover", function (event, d) {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${featureLabels[d.feature]}</strong><br/>${d.value.toFixed(1)}% availability`,
        );
    })
    .on("mousemove", (event) =>
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px"),
    )
    .on("mouseout", () => tooltip.style("opacity", 0));

  bgBars.exit().remove();

  // Draw data bars (on top of background bars)
  const bars = activeGroups.selectAll(".data-bar").data(
    (d) => d.values,
    (d) => d.feature,
  );

  bars
    .enter()
    .append("rect")
    .attr("class", "data-bar")
    .merge(bars)
    .attr("stroke", "none") // Remove individual bar outlines
    .on("mouseover", function (event, d) {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${featureLabels[d.feature]}</strong><br/>${d.value.toFixed(1)}% availability`,
        );
      d3.select(this).style("filter", "brightness(0.9)");
    })
    .on("mousemove", (event) =>
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px"),
    )
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
      d3.select(this).style("filter", "none");
    })
    .transition()
    .duration(500)
    .attr("x", 0)
    .attr("y", (d) => bY1(d.feature))
    .attr("width", (d) => bX(d.value))
    .attr("height", bY1.bandwidth())
    .attr("fill", (d) => bColor(d.feature));

  bars.exit().remove();
  companyGroups.exit().remove();

  // Add hover effects to Y-axis labels to show sample size
  barSvg.selectAll(".y-axis .tick text")
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
        const count = displayData.filter(row => row.no_employees === d).length;
        d3.select(this).style("fill", "#004d40").style("font-weight", "bold");
        tooltip
            .style("opacity", 1)
            .html(`<strong>Company Size: ${d}</strong><br/>Responses: ${count}`);
    })
    .on("mousemove", (event) =>
        tooltip
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 28 + "px")
    )
    .on("mouseout", function() {
        d3.select(this).style("fill", "currentColor").style("font-weight", "normal");
        tooltip.style("opacity", 0);
    });
}
