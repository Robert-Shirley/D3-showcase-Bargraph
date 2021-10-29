const dims = { height: 300, width: 300, radius: 150, margins: 150 };
const cent = { x: dims.width / 2 + 5, y: dims.height / 2 + 5 };

// create svg container
const svg = d3
  .select(".canvas")
  .append("svg")
  .attr("width", dims.width + dims.margins)
  .attr("height", dims.height + dims.margins);

const graph = svg
  .append("g")
  .attr("transform", `translate(${cent.x}, ${cent.y})`);
// translates the graph group to the middle of the svg container

const pie = d3
  .pie()
  .sort(null)
  .value((d) => d.cost);
// the value we are evaluating to create the pie angles

const arcPath = d3
  .arc()
  .outerRadius(dims.radius)
  .innerRadius(dims.radius / 3);

const colors = d3.scaleOrdinal(d3["schemeSet1"]);

//setup legend
const legendGroup = svg
  .append("g")
  .attr("transform", `translate(${dims.width + 40}, 10)`);

const legend = d3.legendColor().shape("circle").shapePadding(15).scale(colors);

//tooltip
const tip = d3
  .tip()
  .attr("class", "tip card")
  .html((d) => {
    let content = `<div class='name'> ${d.data.name} </div>`;
    content += `<div class='cost'>${d.data.cost} </div>`;
    content += '<div class="delete">Click to delete item </div>';
    return content;
  });

graph.call(tip);

const defaultOpacity = 0.75;

// update function
const update = (data) => {
  //update color scale domain
  colors.domain(data.map((item) => item.name));

  //update and call legend
  legendGroup.call(legend);
  legendGroup.selectAll("text").attr("fill", "Black");

  // join enhanced (pie) data to path elements
  const paths = graph.selectAll("path").data(pie(data));

  //exit selection
  paths
    .exit()
    .transition()
    .duration(1000)
    .attrTween("d", arcTweenExit)
    .remove();

  //update selection
  paths
    .attr("d", arcPath)
    .transition()
    .duration(1000)
    .attrTween("d", arcTweenUpdate);

  //enter selection
  paths
    .enter()
    .append("path")
    .attr("class", "arc")
    .style("opacity", defaultOpacity)
    .style("cursor", "pointer")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("fill", (d) => colors(d.data.name))
    .each(function (d) {
      this._current = d;
    })
    .transition()
    .duration(1000)
    .attrTween("d", arcTweenEnter);

  //event listeners
  graph
    .selectAll("path")
    .on("mouseover", (d, i, n) => {
      tip.show(d, n[i]);
      handleMouseOver(d, i, n);
    })
    .on("mouseout", (d, i, n) => {
      handleMouseOut(d, i, n);
      tip.hide();
    })
    .on("click", handleClick);
};

// data array and firestore
let data = [];

db.collection("expenses")
  .orderBy("cost")
  .onSnapshot((res) => {
    res.docChanges().forEach((change) => {
      const doc = { ...change.doc.data(), id: change.doc.id };

      switch (change.type) {
        case "added":
          data.push(doc);
          break;
        case "modified":
          const index = data.findIndex((item) => item.id == doc.id);
          data[index] = doc;
          break;
        case "removed":
          data = data.filter((item) => item.id !== doc.id);
          break;
        default:
          break;
      }
    });

    // call the update function
    update(data);
  });

const arcTweenEnter = (d) => {
  let i = d3.interpolate(d.endAngle, d.startAngle);

  return function (t) {
    d.startAngle = i(t);
    return arcPath(d);
  };
};

const arcTweenExit = (d) => {
  let i = d3.interpolate(d.startAngle, d.endAngle);

  return function (t) {
    d.startAngle = i(t);
    return arcPath(d);
  };
};

//need to use with of function keyword so we can use 'this'
function arcTweenUpdate(d) {
  //interpolate between the two objects
  let i = d3.interpolate(this._current, d);

  //update the current prop with the new updated data
  this._current = d;
  return function (t) {
    return arcPath(i(t));
  };
}

//handle event listeners

const handleMouseOver = (d, i, n) => {
  d3.select(n[i])
    .transition("changeSliceOpacity")
    .duration(150)
    .style("opacity", 1);
};

const handleMouseOut = (d, i, n) => {
  d3.select(n[i])
    .transition("changeSliceOpacity")
    .duration(400)
    .style("opacity", defaultOpacity);
};

const handleClick = async (d) => {
  await db.collection("expenses").doc(d.data.id).delete();
};
