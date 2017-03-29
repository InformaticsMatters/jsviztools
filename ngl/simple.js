function buildNglViewer(divid, data) {
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

    for (var i=0; i < data.length; i++) {
        var d = data[i];
        if (d) {

            var mols = d.molecules;

            //console.log("Loading " + mediaType + " " + ext + " " + mols.length + " " + typeof mols);

            var stringBlob = new Blob( [ mols ], { type:  d.mediaType} );
            stage.loadFile( stringBlob, { ext: d.extension, name: "input" + (i+1)} ).then( function( comp ) {
                console.log("Processing " + comp.name);
                var compIdx = comp.name.substring(5);

                comp.addRepresentation(representation == null ? "ball+stick" : representation, { multipleBond: true } );
                comp.autoView();
                console.log("Added component " + comp.name);

                var selectEl = outerDiv.select("select.representation" + compIdx);
                var representation = selectEl.node().value;
                var displayEl = outerDiv.select("select.display" + compIdx);
                displayEl.selectAll("*").remove();

                displayEl.append(function() { return _createDisplayOption("all", "All"); });
                displayEl.append(function() { return _createDisplayOption("none", "None"); });
                var index = 1
                comp.structure.eachModel(function(model) {
                    console.log("Setting up model " + compIdx + " " + model.index);
                    displayEl.append(function() {
                        var opt = document.createElement("option");
                        opt.value = ""+index;
                        opt.text = ""+index;
                        index++;
                        return opt;
                    });
                });


//                comp.structure.eachEntity(function(entity) {
//                    console.log("Entity: " + entity.type + " " + entity.description);
//                });
//
//                comp.structure.eachChain(function(c) {
//                    console.log("Chain: " + c.chainid + " " + c.chainname + " " + c.entity.description);
//                });
//
//                comp.structure.eachPolymer(function(p) {
//                    console.log("Polymer: " + p.residueIndexStart + " - " + p.residueIndexEnd);
//                });

            });

        } else {
            console.log("No data" + (i+1));
        }
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

