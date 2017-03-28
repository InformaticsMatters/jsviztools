function buildNglViewer(divid, data1) {
    console.log("buildNglViewer");

    var viewer_id =  divid + "_nglviewer"
    var outerDiv = d3.select("#" + divid);
    var viewer = outerDiv.select('.main');
    viewer.node().id = viewer_id

    //console.log("Container is " + viewer + " -> " + viewer_id);
    _fixSizes(outerDiv, viewer);

    var stage = viewer.node().nglviewer;
    if (!stage) {
        console.log("Creating new stage");
        stage = new NGL.Stage( viewer_id );
        viewer.node().nglviewer = stage;
    } else {
        console.log("Clearing out old stage");
        stage.removeAllComponents();
    }

    if (data1) {

        var mols = data1.molecules;

        var selectEl = outerDiv.select("select.representation1");
        var representation = selectEl.node().value;

        var displayEl = outerDiv.select("select.display1");
        displayEl.selectAll("*").remove();

        //console.log("Loading " + mediaType + " " + ext + " " + mols.length + " " + typeof mols);

        var stringBlob = new Blob( [ mols ], { type:  data1.mediaType} );
        stage.loadFile( stringBlob, { ext: data1.extension, name: "input1"} ).then( function( comp ) {
            comp.addRepresentation(representation == null ? "ball+stick" : representation, { multipleBond: true } );
            comp.autoView();
            console.log("Added component " + comp.name);


            displayEl.append(function() { return _createDisplayOption("all", "All"); });
            displayEl.append(function() { return _createDisplayOption("none", "None"); });
            var index = 1
            comp.structure.eachModel(function(model) {
                //console.log("Setting up model " + model.index);
                displayEl.append(function() {
                    var opt = document.createElement("option");
                    opt.value = ""+index;
                    opt.text = ""+index;
                    index++;
                    return opt;
                });
            });

        });

    } else {
        console.log("No data1");
    }
}

function _createDisplayOption(value, text) {
    var opt = document.createElement("option");
    opt.value = value;
    opt.text = text;
    return opt;
}

function fitNglViewer(divid) {
    console.log("fitNglViewer");
    var outerDiv = d3.select("#" + divid);
    var viewer = outerDiv.select(".main");
    _fixSizes(outerDiv, viewer);
    var stage = viewer.node().nglviewer;
    if (stage) {
        stage.handleResize();
        stage.handleResize();
    } else {
        console.log("No stage")
    }
}

function representationChanged(divid, what, input) {
    var representation = what.value;
    //console.log("Representation changed: " + representation + " " + input);
    var outerDiv = d3.select("#" + divid);
    var viewer = outerDiv.select(".main");
    var stage = viewer.node().nglviewer;
    if (!stage) {
        console.log("Viewer not yet configured");
        return;
    } else {
        stage.eachComponent(function(comp) {
            if (comp.name === "input" + input) {
                comp.removeAllRepresentations();
                comp.addRepresentation(representation);
            }
        });
    }
}

function displayChanged(divid, what, input) {
    var display = what.value;
    //console.log("Display changed: " + display + " " + input);
    var outerDiv = d3.select("#" + divid);
    var viewer = outerDiv.select(".main");
    var stage = viewer.node().nglviewer;
    if (!stage) {
        console.log("Viewer not yet configured");
        return;
    } else {
        var i = 1;
        stage.eachComponent(function(comp) {
            if (comp.name === "input" + input) {
                if (display === "all") {
                    viz = comp.setSelection("*");
                    viz.setVisibility(true);
                } else if (display === "none") {
                    viz = comp.setSelection("*");
                    viz.setVisibility(false);
                } else {
                    comp.setVisibility(true);
                    viz = comp.setSelection("/" + (display -1));
                    viz.setVisibility(true);
                }
            }
            i++;
        });
    }
}


function _fixSizes(outerDiv, viewer) {
    var headers = outerDiv.select(".headers");
    var status = outerDiv.select(".extra.content.line");
    var w = outerDiv.style("width");
    var houter = outerDiv.style("height");
    var headersH = headers.style("height").replace("px", "");
    var statusH = status.style("height").replace("px", "");
    var h = houter.replace("px", "") - headersH - statusH;
    console.log("Resizing NGLViewer : width=" + w + " outer height=" + houter + " inner height=" + h + "px" + " headersH=" + headersH + " statusH=" + statusH);
    viewer.style("width", w + "px");
    viewer.style("height", h + "px");
}

