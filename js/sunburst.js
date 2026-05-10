// Margins
const s_svgWidth = 1000;
const s_svgHeight = 900;
const s_radius = Math.min(s_svgWidth, s_svgHeight) / 2 - 40;

const s_svg = d3
  .select("#sunburst-container")
  .append("svg")
  .attr("viewBox", `0 0 ${s_svgWidth} ${s_svgHeight}`)
  .style("width", "100%")
  .style("height", "auto")
  .append("g")
  .attr("transform", `translate(${s_svgWidth / 2}, ${s_svgHeight / 2})`);

const s_tooltip = d3.select("#tooltip");

// Loading data
// SOURCE: https://observablehq.com/@d3/zoomable-sunburst
d3.csv("data/cleaned_data.csv")
  .then((data) => {
    // Clean data
    const cleanedData = data
      .map((d) => ({
        family_history: (d.family_history || "").trim(),
        gender: (d.Gender_Cleaned || "Other").trim(),
        treatment: (d.treatment || "").trim(),
      }));

    // Create nested groups for sunburst levels
    const nested = d3.groups(
      cleanedData,
      (d) =>
        d.family_history === "Yes" ? "Family History" : "No Family History",
      (d) => d.gender,
      (d) => (d.treatment === "Yes" ? "Sought Treatment" : "No Treatment"),
    );

    // Format data into hierarchical structure for sunburst
    const rootData = {
      name: "Demographics",
      children: nested.map(([history, genderGroup]) => ({
        name: history,
        children: genderGroup.map(([gender, treatmentGroup]) => ({
          name: gender,
          children: treatmentGroup.map(([treatment, entries]) => ({
            name: treatment,
            size: entries.length,
          })),
        })),
      })),
    };

    // Layout
    const s_root = d3
      .hierarchy(rootData)
      .sum((d) => d.size)
      .sort((a, b) => b.value - a.value);

    const partition = d3.partition().size([2 * Math.PI, s_radius]);
    partition(s_root);

    // Convert the data into SVG path coordinates
    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1)
      .padAngle(0.015)
      .cornerRadius(2);

    // Visual style
    const colorMap = {
      "Family History": "#4a148c", // Original Purple
      "No Family History": "#00796b", // Matching Teal
    };

    const paths = s_svg
      .selectAll("path")
      .data(s_root.descendants().filter((d) => d.depth > 0)) // Exclude the center circle
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", (d) => {
        let p = d;
        while (p.depth > 1) p = p.parent;
        const base = colorMap[p.data.name];
        return d3.interpolateRgb(base, "#fff")(d.depth * 0.22); // Lighten color based on depth
      })
      .style("stroke", "#fff")
      .style("stroke-width", "2px")
      .style("transition", "opacity 0.2s")
      // Interactivity
      .on("mouseover", function (event, d) {
        const ancestors = d.ancestors(); // Find path from root to current piece

        paths.style("opacity", 0.3); // Fade other paths

        // Make hovered path and its ancestors normal color
        paths
          .filter((node) => ancestors.indexOf(node) > -1)
          .style("opacity", 1)
          .style("filter", "brightness(1.1)");

        s_tooltip.style("opacity", 1).html(`
                    <div style="font-weight:bold; border-bottom:1px solid #ccc; margin-bottom:5px;">${d.data.name}</div>
                    <strong>Count:</strong> ${d.value}<br/>
                    <strong>Share:</strong> ${((d.value / s_root.value) * 100).toFixed(1)}%
                `);
      })
      .on("mousemove", (event) => {
        s_tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        paths.style("opacity", 1).style("filter", "none");
        s_tooltip.style("opacity", 0);
      });

    // Labels
    s_svg
      .selectAll("text")
      .data(
        s_root.descendants().filter((d) => d.depth > 0 && d.x1 - d.x0 > 0.25),
      ) 
      .enter()
      .append("text")
      .attr("transform", (d) => {
        // Calculate the center point of each arc to place the text
        const angle = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const radius = (d.y0 + d.y1) / 2;

        const x = Math.cos(((angle - 90) * Math.PI) / 180) * radius;
        const y = Math.sin(((angle - 90) * Math.PI) / 180) * radius;

        return `translate(${x}, ${y})`;
      })
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "800")
      .style("fill", (d) => (d.depth === 1 ? "#fff" : "#1a1a1a"))
      .style("pointer-events", "none")
      .each(function(d) {
          const text = d3.select(this);
          const name = d.data.name;
          const words = name.split(/\s+/);
          
          if (words.length > 1 && d.depth === 1) {
              // Wrap multi-word labels in the first depth
              text.text("");
              words.forEach((word, i) => {
                  text.append("tspan")
                      .attr("x", 0)
                      .attr("dy", i === 0 ? "-0.4em" : "1.1em")
                      .text(word);
              });
          } else {
              text.text(name).attr("dy", "0.35em");
          }
      });
  });
