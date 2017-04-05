function buildNglViewer(divid, data) {
    console.log("buildNglViewer in " + divid);

    var viewer_id =  divid + "_nglviewer"
    var outerDiv = $("#" + divid);
    var viewer = outerDiv.find('.main');
    viewer[0].id = viewer_id;

    //console.log("Container is " + viewer + " -> " + viewer_id);
    _fixSizes(outerDiv, viewer);


    var if1El =  $("#format1");

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
    var inputsCount = 0
    for (var i=0; i < data.length; i++) {
        var d = data[i];
        if (d) {
            inputsCount++;

            _loadSdf(divid, stage, d, i, controlsEl);


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

            console.log("Loaded data" + (i+1) + " as " + d.extension);

        } else {
            console.log("No data" + (i+1));
            var el = controlsEl.find("div.input" + (i+1));
            el.find("*").remove();
            el.append("<span>No data loaded</span>");
        }

    }

}

var representationParams = new Map();
representationParams.set("ball+stick", { multipleBond: true });


function _loadSdf(outerId, stage, data, index, controlsEl) {

    var i = index + 1;

    _setupSdfControls(outerId, index, controlsEl);
    var displayFilterEl = controlsEl.find(".molecules" + i);

    var representationToUse = controlsEl.find('input[name=display_radio_' + i + ']:checked').val();
    console.log("Using representation " + representationToUse);

    var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
    stage.loadFile( stringBlob, { ext: data.extension, name: "input" + i} ).then( function( comp ) {
        comp.addRepresentation(representationToUse, representationParams.get(representationToUse));
        comp.autoView();
        var mol = 1
        displayFilterEl.find("*").remove();
        comp.structure.eachModel(function(model) {
            console.log("Setting up model " + mol + " " + model.index);
            displayFilterEl.append(
                '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="mol' + mol +
                '" onchange="toggleDisplay(\'' + outerId + '\', this, ' + i + ', ' + mol +'); return false;">' +
                '<label>Molecule ' + mol + '</label></div></div>');
            mol++;
        });
    });
}

function _setupSdfControls(outerId, index, el) {

    console.log("Handling SDF controls");

    var i = index + 1;

    var controlsEl = el.find("div.sdf.controls" + i);
    if (controlsEl.length == 0) {

        var div = el.find("div.input" + i);

        div.find("*").remove();

        div.append('<div class="ui vertical accordion menu controls' + i + ' sdf">\n' +
            '<div class="item representation' + i + '">\n' +
            '<a class="active title"><i class="dropdown icon"></i>Display type</a>\n' +
            '<div class="active content"><div class="ui form"><div class="grouped fields">\n' +
            _createRepresentationRadio(outerId, "ball+stick", "Ball & Stick", i, true) +
            _createRepresentationRadio(outerId, "cartoon", "Cartoon", i, false) +
            _createRepresentationRadio(outerId, "hyperball", "Hyperball", i, false) +
            _createRepresentationRadio(outerId, "licorice", "Licorice", i, false) +
            _createRepresentationRadio(outerId, "spacefill", "Spacefill", i, false) +
            '</div></div></div></div>\n' +
            '<div class="item"><a class="title"><i class="dropdown icon"></i>Molecules</a><div class="content"><div class="ui form"><div class="grouped fields molecules' + i + '">\n' +
            '</div></div></div></div></div>');

        var acc = div.find('div.ui.accordion');
        acc.accordion();
    } else {
        console.log("SDF controls already present");
    }
}

function _createRepresentationRadio(outerId, value, label, index, checked) {
    return '<div class="field"><div class="ui radio checkbox">' +
    '<input type="radio" name="display_radio_' + index + '" value="' + value + '" onchange="representationChanged(\'' + outerId +
    '\', this, ' + index +
    '); return false;"' + (checked ? ' checked' : '') + '><label>' + label +'</label></div></div>\n';

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
    var viewer = $("#" + divid + " .main");
    if (viewer.length == 0) {
        console.log("Can't find viewer");
    } else {
        var stage = viewer[0].nglviewer;
        if (!stage) {
            console.log("Viewer not yet configured");
            return;
        } else {
            stage.eachComponent(function(comp) {
                if (comp.name === "input" + input) {
                    comp.removeAllRepresentations();
                    comp.addRepresentation(representation, representationParams.get(representation));
                }
            });
        }
    }
}

function toggleDisplay(divid, what, input, molNumber) {

    var name = what.name;
    var checked = what.checked;
    console.log("Display changed: " + name + " " + input + " " + checked);
    var viewer = $("#" + divid + " .main");
    if (viewer.length == 0) {
        console.log("Can't find viewer");
    } else {
        var stage = viewer[0].nglviewer;
        if (!stage) {
            console.log("Viewer not yet configured");
            return;
        } else {
            var i = 1;
            stage.eachComponent(function(comp) {
                if (comp.name === "input" + input) {
                    comp.setSelection("/0").setVisibility(true);
                    //comp.setVisibility(true);
                    var sel = "/" + (molNumber - 1);
                    viz = comp.setSelection(sel);
                    viz.setVisibility(checked);
                    console.log("Set visibility of " + sel + " to " + checked);
                }
                i++;
            });
        }
    }
}


function _fixSizes(outerDiv, viewer) {
    var headers = outerDiv.find(".headers");
    var status = outerDiv.find(".extra.content.line");
    var controls = outerDiv.find(".controls");
    //var outerW = outerDiv.css("width").replace("px", "");
    var outerW = outerDiv.width();
    //var controlsW = controls.css("width").replace("px", "");
    var controlsW = controls.width();
    //var houter = outerDiv.css("height");
    var houter = outerDiv.height();
    //var headersH = headers.css("height").replace("px", "");
    var headersH = headers.height();
    //var statusH = status.css("height").replace("px", "");
    var statusH = status.height();
    var h = houter - headersH - statusH - 6;
    var w = outerW - controlsW - 2;

    console.log("Resizing NGLViewer : outer width=" + outerW + " width=" + w + " outer height=" + houter + " inner height=" + h + "px" + " headersH=" + headersH + " statusH=" + statusH);
    viewer.css("width", w + "px");
    viewer.css("height", h + "px");
}

