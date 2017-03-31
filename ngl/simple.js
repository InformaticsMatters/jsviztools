function buildNglViewer(divid, data) {
    console.log("buildNglViewer in " + divid);

    var viewer_id =  divid + "_nglviewer"
    var outerDiv = $("#" + divid);
    var viewer = outerDiv.find('.main');
    viewer[0].id = viewer_id;

    //console.log("Container is " + viewer + " -> " + viewer_id);
    _fixSizes(outerDiv, viewer);



    var if1El =  $("#format1");
    console.log("IF1: " + if1El.val());
    console.log("Found elements: " + if1El.length);


    var stage = viewer[0].nglviewer;
    if (!stage) {
        console.log("Creating new stage in " + viewer_id);
        stage = new NGL.Stage( viewer_id );
        viewer[0].nglviewer = stage;
    } else {
        console.log("Clearing out old stage");
        stage.removeAllComponents();
    }

    var controlsEl = outerDiv.find('.controls');
    console.log("found controlsEl " + controlsEl.length);

    var inputsCount = 0
    for (var i=0; i < data.length; i++) {
        var d = data[i];
        if (d) {
            inputsCount++;
            var mols = d.molecules;
            _loadSdf(divid, stage, d, i, controlsEl);

            //console.log("Loading " + mediaType + " " + ext + " " + mols.length + " " + typeof mols);

//            var stringBlob = new Blob( [ mols ], { type:  d.mediaType} );
//            stage.loadFile( stringBlob, { ext: d.extension, name: "input" + (i+1)} ).then( function( comp ) {
//                console.log("Processing " + comp.name);
//                var compIdx = comp.name.substring(5);



                //comp.addRepresentation(representation == null ? "ball+stick" : representation, { multipleBond: true } );
//                comp.addRepresentation("ball+stick", { multipleBond: true } );
//                comp.autoView();
//                console.log("Added component " + comp.name);

               // var selectEl = outerDiv.select("select.representation" + compIdx);
                //var representation = selectEl.node().value;
                //var displayEl = outerDiv.select("select.display" + compIdx);
                //displayEl.selectAll("*").remove();



                //displayEl.append(function() { return _createDisplayOption("all", "All"); });
                //displayEl.append(function() { return _createDisplayOption("none", "None"); });
//                var index = 1
//                comp.structure.eachModel(function(model) {
//                    console.log("Setting up model " + compIdx + " " + model.index);
//                    displayEl.append(function() {
//                        var opt = document.createElement("option");
//                        opt.value = ""+index;
//                        opt.text = ""+index;
//                        index++;
//                        return opt;
//                    });
//                });


//                 var selectEl = outerDiv.find("select.representation" + compIdx);
//                 //var selectEl = outerDiv.find("#representation" + compIdx);
//                 console.log("Found elements: " + outerDiv.length + " " + selectEl.length);
//                 var representation = selectEl.val();
//                 console.log("representation: " + representation);
//                 var displayEl = outerDiv.find("select.display" + compIdx);
//                 console.log("displayEl: " + displayEl);
//                 displayEl.empty();
//                 var index = 1
//                 comp.structure.eachModel(function(model) {
//                    console.log("Setting up model " + compIdx + " " + model.index);
//                    displayEl.append("<option value=" + index + ">" + index + "</option>");
//                    index++;
//                 });

                console.log("Done");

                //displayEl.dropdown();


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

//            });

        } else {
            console.log("No data" + (i+1));
        }

    }
    if (inputsCount == 0) {
        controlsEl.append("<span>No structures loaded</span>");
    }
}

function _loadSdf(outerId, stage, data, index, controlsEl) {

    var i = index + 1;

    _setupSdfControls(outerId, index, controlsEl);
    var displayFilterEl = controlsEl.find(".display" + i);
    console.log("found displayFilterEl " + displayFilterEl.length);
    displayFilterEl.find("*").remove();

    var representationToUse = controlsEl.find("select.representation" + i).val();
    console.log("Using representation " + representationToUse);

    var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
    stage.loadFile( stringBlob, { ext: data.extension, name: "input" + i} ).then( function( comp ) {
        comp.addRepresentation(representationToUse, { multipleBond: true } );
        comp.autoView();
        console.log("Added component " + i + " " + comp.name);
        var mol = 1
        comp.structure.eachModel(function(model) {
            console.log("Setting up model " + mol + " " + model.index);
            displayFilterEl.append('<input type="checkbox"><label>Molecule ' + mol + '</label><br>');
            mol++;
        });
    });
}

function _setupSdfControls(outerId, index, el) {

    var i = index + 1;

    var controlsEl = el.find(".representation" + i);
    if (controlsEl.length == 0) {
        console.log("Adding SDF controls");
        var div = el.find("div.controls" + i);

        div.find("*").remove();

        div.append('<div class="ui labeled input">' +
            '<span class="ui label">Display:</span>' +
            '<select class="ui compact dropdown representation' + i + '" onchange="representationChanged(\'' + outerId + '\', this, ' + (index +1) + '); return false;">"' +
            '</div');

        selectEl = div.find("select");
        selectEl.append('<option value="ball+stick">Ball & Stick</option>');
        selectEl.append('<option value="cartoon">Cartoon</option>');
        selectEl.append('<option value="hyperball">Hyperball</option>');
        selectEl.append('<option value="licorice">Licorice</option>');
        selectEl.append('<option value="spacefill">Spacefill</option>');

        //div.find("select").dropdown();


        // add the div for the display filters
        div.append('<p><div class="ui checkbox celled list display' + i + '"></div>');

    } else {
        console.log("SDF controls already present");
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
    var outerDiv = $("#" + divid);
    var viewer = outerDiv.find(".main");
    _fixSizes(outerDiv, viewer);
    var stage = viewer[0].nglviewer;
    if (stage) {
        stage.handleResize();
        stage.handleResize();
    } else {
        console.log("No stage")
    }
}

function representationChanged(divid, what, input) {
    var representation = what.value;
    console.log("Representation changed: " + representation + " " + input);
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
    var headers = outerDiv.find(".headers");
    var status = outerDiv.find(".extra.content.line");
    var controls = outerDiv.find(".controls");
    var outerW = outerDiv.css("width").replace("px", "");
    var controlsW = controls.css("width").replace("px", "");
    var houter = outerDiv.css("height");
    var headersH = headers.css("height").replace("px", "");
    var statusH = status.css("height").replace("px", "");
    var h = houter.replace("px", "") - headersH - statusH;
    var w = outerW - controlsW - 2;

    console.log("Resizing NGLViewer : outer width=" + outerW + " width=" + w + " outer height=" + houter + " inner height=" + h + "px" + " headersH=" + headersH + " statusH=" + statusH);
    viewer.css("width", w + "px");
    viewer.css("height", h + "px");
}

