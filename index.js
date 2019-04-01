const regl = require('regl')
const {render, loadData, wrapColorScale} = require('./flow.js');
const {
    geoLayout,
    barsLayout,
    areaLayout,
    gridLayout
} = require('./layouts.js');
const d3 = require('d3');

var canvas = window.document.getElementById('canvas');

function main(regl, csvData, canvas) {

    const width = canvas.width - 10;
    const height = canvas.height -10;
   
    // Constants for the animation.
    const config = {
        numPoints: csvData.length,
        pointWidth: 2,
        pointMargin: 1,
        duration: 1500,
        delayByIndex: 500/csvData.length,
        maxDuration  : 1500 + (500/csvData.length) * csvData.length,
        width : canvas.width - 10,
        height : canvas.height - 10,
    }

    // create initial set of points
    const points = d3.range(config.numPoints).map(d => ({}));

    points.forEach((d, i) => {
        d.tx = width / 2;
        d.ty = height / 2;
        d.colorEnd = [0, 0, 0];
    });

    // Define the layouts to use.
    const toGeo = (points) => geoLayout(points, width, height, csvData);
    const toBars = (points) => barsLayout(points, width, height, csvData);
    const toArea = (points) => areaLayout(points, width, height, csvData);
    const toAreaSep = (points) => areaLayout(points, width, height, csvData, separate=true);
    const toGrid = (points) => gridLayout(points, width, height, csvData);

    const toMiddle = (points) => {
        points.forEach((d, i) => {
            d.x = width / 2;
            d.y = height / 2;
            d.color = [0, 0, 0];
        });
    }
    const toBlack = (points) => {
        points.forEach((d, i) => {
            d.color = [0, 0, 0];
        });
    }

    const layouts = [toGrid, toGeo, toBars, toArea, toAreaSep, toMiddle];

    const colorScales = [
        d3.scaleSequential(d3.interpolateViridis),
        d3.scaleSequential(d3.interpolateMagma),
        d3.scaleSequential(d3.interpolateInferno),
        d3.scaleSequential(d3.interpolateCool),
    ].map(wrapColorScale);


    function event() {
        var button = window.document.getElementById('btn');
        return new Promise(resolve => button.addEventListener("mousedown",resolve));
    }

    // render the dots
    render(regl, config, points, layouts, colorScales, event, width, height);
}

// Move this to the html bind to a canvas.
// Follow https://github.com/Erkaman/wireframe-world
loadData('./data/data_geo.csv').then((data) => {
    // initialize regl
    console.log(data.length)
    regl({
        // callback when regl is initialized
        onDone: (err, regl) => {
            if (err) {
                console.error('Error initializing regl', err);
                return;
            }
            main(regl, data, window.document.getElementById('canvas'));
        },
        canvas
    });
});

// Organize flow.js and investigate how to add layout wise animation.
// Animate the grid to create stacking effect for the grid.
// Follow this for interactions: https://beta.observablehq.com/@grantcuster/using-three-js-for-2d-data-visualization.