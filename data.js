const d3 = require('d3');

/**
 * Load CSV and JSON data and return a promise.
 * Load image data and cities scv data asynchronously.
 * @param {int} width 
 * @param {int} height 
 */
function loadData(data_path) {

    // Use d3's csv utility to map over csv.
    const data = d3.csv(data_path).then(function (d) {
        return d;
    }, function (err) {
        console.error(err);
    })
    return data;
}

// wrap d3 color scales so they produce vec3s with values 0-1
// also limit the t value to remove darkest color
function wrapColorScale(scale) {
    const tScale = d3.scaleLinear().domain([0, 1]).range([0.4, 1]);
    return t => {
        const rgb = d3.rgb(scale(tScale(t)));
        return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
    };
}

function geoLayout(points, width, height, data) {

    // Find the extent (min and max) of latitude.
    // Reference: https://github.com/d3/d3-array#extent
    var latExtent = d3.extent(data, function (d) {
        return d.lat
    });

    // Find the extent (min and max) of longitude.
    var lngExtent = d3.extent(data, function (d) {
        return d.lon
    });

    // Create extent geoJSON object.
    var extentGeoJson = {
        type: "LineString",
        coordinates: [
            [lngExtent[0], latExtent[0]],
            [lngExtent[1], latExtent[1]]
        ]
    };

    // Create Mercator projection top-left corner as [0,0].
    // Extent array [[x₀, y₀], [x₁, y₁]], where x₀ is the left side of the bounding box,
    // y₀ is the top, x₁ is the right and y₁ is the bottom.
    // Reference: https://github.com/d3/d3-geo#projection_fitExtent
    var projection = d3.geoMercator().fitSize([width, height], extentGeoJson);

    // Store X and Y from the projection.
    let scale = 0.5;
    let vertices = [];
    points.forEach(function (d, i) {
        var city = data[i];
        var location = projection([city.lon, city.lat]);
        d.x = location[0]*scale;
        d.y = location[1]*scale;
        vertices.push(d.x,d.y, 0);
    })
    return vertices;

}

function barsLayout(points, width, height, csvData) {
    column = 'IncidentOutcome'
    var pointWidth = width / 800;
    var pointMargin = 1;
    
    // Create a nested object by category and filter.
    // Reference: https://github.com/d3/d3-collection#nest
    var byCategories = d3.nest().key(function (d) {
        return d[column]
    }).entries(csvData);
    
    /* Calculate the bar margin and width */
    var binMargin = pointWidth * 10;
    var numBins = byCategories.length;
    var minBinWidth = width / (numBins * 2.5);
    var totalExtraWidth = width - binMargin * (numBins - 1) - minBinWidth * numBins;

    /* Calculate bar width and return array for each -- more data, thicker bar */
    var binWidths = byCategories.map(function (d) {
        return minBinWidth
    });

    // Keep track of points and bin width from left.
    var increment = pointWidth + pointMargin;
    var cumulativeBinWidth = totalExtraWidth/2;
    
    // Calculate bin widths and positions.
    var binsArray = binWidths.map(function (binWidth, i) {
        var bin = {
            category: byCategories[i].key,
            binWidth: binWidth,
            binStart: cumulativeBinWidth + i * binMargin, // position of bin start
            binCount: 0,
            binCols: Math.floor(binWidth / increment) // num of cols reqd for the binns
        };
        cumulativeBinWidth += binWidth - 1;
        return bin
    });

    // nest the above bin array for each category.
    var bins = d3.nest().key(function (d) {
        return d.category
    }).rollup(function (d) {
        return d[0]
    }).object(binsArray); 

    // colorData(points, csvData, column);
    // Iterate over data points.
    var arrangement = points.map(function (d, i) {

        // Get continet of the data point, and it's bin information.
        var category = csvData[i][column];
        var bin = bins[category];

        if (!bin) {
            return {
                x: d.x,
                y: d.y,
                color: [0, 0, 0]
            }
        }
        // Get bin's display related variables.
        var binWidth = bin.binWidth;
        var binCount = bin.binCount;
        var binStart = bin.binStart;
        var binCols = bin.binCols;
        var row = Math.floor(binCount / binCols);
        var col = binCount % binCols;
        var x = binStart + col * increment;
        var y = -row * increment + height;
        bin.binCount += 1;
        return {
            x: x,
            y: y,
            color: d.color
        }
    });
    
    let vertices = [];
    let y_offset = height/5.0;
    let x_offset = width/5.0;
    // Apply x,y and color data for each point.
    arrangement.forEach(function (d, i) {
        Object.assign(points[i], d)
        vertices.push(d.x - x_offset, d.y - y_offset, 0);
    });
    return vertices;

}

function gridLayout(points,width,height,csvData){
    
    var pointWidth = width / 400;
    var pointMargin = 3;
    
    // Create a nested object by category and filter.
    // Reference: https://github.com/d3/d3-collection#nest
    var byCategories = d3.nest().key(function (d) {
        return 'aaa';
    }).entries(csvData);
    
    /* Calculate the bar margin and width */
    var binMargin = pointWidth * 10;
    var numBins = byCategories.length;
    var minBinWidth = width / (numBins * 1.5);
    var totalExtraWidth = width - binMargin * (numBins - 1) - minBinWidth * numBins;

    /* Calculate bar width and return array for each -- more data, thicker bar */
    var binWidths = byCategories.map(function (d) {
        return minBinWidth
    });

    // Keep track of points and bin width from left.
    var increment = pointWidth + pointMargin;
    var cumulativeBinWidth = totalExtraWidth/2;
    
    // Calculate bin widths and positions.
    var binsArray = binWidths.map(function (binWidth, i) {
        var bin = {
            category: byCategories[i].key,
            binWidth: binWidth,
            binStart: cumulativeBinWidth + i * binMargin, // position of bin start
            binCount: 0,
            binCols: Math.floor(binWidth / increment) // num of cols reqd for the binns
        };
        cumulativeBinWidth += binWidth - 1;
        return bin
    });

    // nest the above bin array for each category.
    var bins = d3.nest().key(function (d) {
        return d.category
    }).rollup(function (d) {
        return d[0]
    }).object(binsArray); 

    // colorData(points, csvData, 0);
    // Iterate over data points.
    
    var arrangement = points.map(function (d, i) {

        // Get continet of the data point, and it's bin information.
        var category = 'aaa';
        var bin = bins[category];

        if (!bin) {
            return {
                x: d.x,
                y: d.y,
                color: [0, 0, 0]
            }
        }
        // Get bin's display related variables.
        var binWidth = bin.binWidth;
        var binCount = bin.binCount;
        var binStart = bin.binStart;
        var binCols = bin.binCols;
        var row = Math.floor(binCount / binCols);
        var col = binCount % binCols;
        var x = binStart + col * increment;
        var y = -row * increment + height;
        bin.binCount += 1;
        return {
            x: x,
            y: y,
            color: d.color
        }
    });
    let vertices = [];
    let y_offset = height/5.0;
    let x_offset = width/5.0;
    // Apply x,y and color data for each point.
    arrangement.forEach(function (d, i) {
        Object.assign(points[i], d)
        vertices.push(d.x - x_offset, d.y - y_offset, 0);
    });
    return vertices;
    
}

module.exports = {
    geoLayout: geoLayout,
    loadData: loadData,
    barsLayout: barsLayout,
    gridLayout: gridLayout
}
