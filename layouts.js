const d3 = require("d3");
const d3q = require('d3-queue')

/**
 * Calculate color of datapoints per category.
 * @param {array} data 
 * @param {array} csvData 
 * 
 */
function colorData(data, csvData, column) {

    // Get unique elements from the given column to create color scale.
    const unique = d3.set(
        csvData.map(function (d) { return d[column]; })
      ).values();

    console.log(unique);
    // Create a color scale for each category.
    var colorScale = d3.scaleOrdinal().domain(unique).range(
        d3.range(0, 1, 1 / 6).concat(1).map(d3.scaleSequential(d3.interpolateCool))
    );
    // Change lightness of each dot.
    var varyLightness = function (color) {
        var hsl = d3.hsl(color);
        hsl.l *= .1 + Math.random();
        return hsl.toString()
    };
    // Convert to vector color.
    function toVectorColor(colorStr) {
        var rgb = d3.rgb(colorStr);
        return [rgb.r / 255, rgb.g / 255, rgb.b / 255]
    }

    // Create color for each datapoint.
    data.forEach(function (d, i) {
        d.color = toVectorColor((colorScale(csvData[i][column])))
    })
}

/**
 * Convert geoJSON to x,y coordinates and provide color to the points.
 * @param {array} points An array of objects each representing a point in data.
 * @param {int} width width of the canvas
 * @param {int} height height of the canvas
 * @param {array} csvData Array containing csv loaded data.
 */
function geoLayout(points, width, height, csvData) {

    /**
     * Project from lat/long to x,y coordinates
     * @param {array} data 
     */
    function projectData(data) {
        
        // Find the extent (min and max) of latitude.
        // Reference: https://github.com/d3/d3-array#extent
        var latExtent = d3.extent(csvData, function (d) {
            return d.lat
        });

        // Find the extent (min and max) of longitude.
        var lngExtent = d3.extent(csvData, function (d) {
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
        data.forEach(function (d, i) {
            var city = csvData[i];
            var location = projection([city.lon, city.lat]);
            d.x = location[0];
            d.y = location[1];
        })
        console.log(data.length)
        

    }
    projectData(points);
    colorData(points, csvData, 'IncidentDistrict')

}


/**
 * Make bars with different width and color them.
 * @param {array} points An array of objects each representing a point in data.
 * @param {int} width width of the canvas
 * @param {int} height height of the canvas
 * @param {array} csvData Array containing csv loaded data.
 */
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

    colorData(points, csvData, column);
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

    // Apply x,y and color data for each point.
    arrangement.forEach(function (d, i) {
        Object.assign(points[i], d)
    });

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

    colorData(points, csvData, 0);
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

    // Apply x,y and color data for each point.
    arrangement.forEach(function (d, i) {
        Object.assign(points[i], d)
    });
    
}

/**
 * Draw area chart from the points.
 * @param {array} points An array of objects each representing a point in data.
 * @param {int} width width of the canvas
 * @param {int} height height of the canvas
 * @param {array} csvData Array containing csv loaded data.
 */
function areaLayout(points, width, height, csvData, separate=false) {

    column = 'Gender'
    colorData(points, csvData, column);
    
    var rng = d3.randomNormal(0, .2);
    var pointWidth = Math.round(width / 800);
    var pointMargin = 1;
    var pointHeight = pointWidth * .375;
    
    // Get latitude extent.
    var latExtent = d3.extent(csvData, function (d) {
        return d.lat
    });

    // Create a scale from the extent above to range 0 to width.
    var xScale = d3.scaleOrdinal().domain(latExtent).range(d3.range(0, width, pointWidth + pointMargin));
    
    var binCounts = xScale.range().reduce(function (accum, binNum) {
        accum[binNum] = 0;
        return accum
    }, {});

    // var cumulativeBinWidth = totalExtraWidth/2;

    console.log(binCounts)
    // Nest by category.
    var byCategories = d3.nest().key(function (d) {
        return d[column]
    }).entries(csvData);
    
    csvData.forEach(function (city, i) {
        city.d = points[i]
    });
    
    let separate_y = 0;
    if(separate){
        separate_y = 20;
    }
    byCategories.forEach(function (category, i) {
        category.values.forEach(function (city, j) {
            var d = city.d;
            var binNum = xScale(city.lat);
            d.x = binNum;
            d.y = height - (pointHeight * binCounts[binNum]*10 + i*separate_y);
            binCounts[binNum] += 1
        })
    })
}

module.exports = {
    geoLayout: geoLayout,
    barsLayout: barsLayout,
    areaLayout: areaLayout,
    gridLayout: gridLayout
}
