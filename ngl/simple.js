function buildNglViewer(divid, data) {
    console.log("buildNglViewer in " + divid);

    var viewer_id =  divid + "_nglviewer"
    var outerDiv = $("#" + divid);
    var viewer = outerDiv.find('.main');
    viewer[0].id = viewer_id;

    //console.log("Container is " + viewer + " -> " + viewer_id);
    _fixSizes(outerDiv, viewer);

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
            if (d.extension === 'sdf') {
                _loadSdf(divid, stage, d, i, controlsEl);
            } else if (d.extension === 'pdb') {
                _loadPdb(divid, stage, d, i, controlsEl);
            }
            console.log("Loaded data" + (i+1) + " as " + d.extension);
        } else {
            console.log("No data" + (i+1));
            var el = controlsEl.find("div.input" + (i+1));
            el.find("*").remove();
            el.append("<span>No data loaded</span>");
        }
    }
}

var representationParamsFnMap = {
    "ball+stick" : function(p) { p.multipleBond = true }
}

function _createRepresentationParams(representationType, initialParams) {
    var representationParamsFn = representationParamsFnMap[representationType];
    if (representationParamsFn) {
        representationParamsFn(initialParams);
    }
    return initialParams;
}

function _loadPdb(outerId, stage, data, index, controlsEl) {

    var i = index + 1;
     _setupPdbControls(outerId, index, controlsEl);

     var displayFilterEl = controlsEl.find(".components" + i);
     var representationToUse = controlsEl.find('input[name=display_radio_' + i + ']:checked').val();
     console.log("Using representation " + representationToUse);

    var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
    stage.loadFile( stringBlob, { ext: data.extension, name: "input" + i} ).then( function( comp ) {

        comp.addRepresentation(representationToUse);
        comp.autoView();

        displayFilterEl.find("*").remove();
        displayFilterEl.append(
            '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="waters' +
            '" onchange="macromolChanged(\'' + outerId + '\', this, ' + i + '); return false;">' +
            '<label>Waters</label></div></div>');
        displayFilterEl.append(
            '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="ions' +
            '" onchange="macromolChanged(\'' + outerId + '\', this, ' + i + '); return false;">' +
            '<label>Ions</label></div></div>');
        displayFilterEl.append(
            '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="ligands' +
            '" onchange="macromolChanged(\'' + outerId + '\', this, ' + i + '); return false;">' +
            '<label>Ligands</label></div></div>');

//        var chainNames = new Set();
//        comp.structure.eachChain(function(c) {
//            console.log("Chain: " + c.chainid + " " + c.chainname + " " + c.entity.description);
//            chainNames.add(c.chainname);
//        });
//        chainNames.forEach(function(c) {
//            console.log("Found chain " + c);
//            displayFilterEl.append(
//                '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="chain_' + c +
//                '" onchange="macromolDisplay(\'' + outerId + '\', this, ' + i + '); return false;">' +
//                '<label>Chain ' + c + '</label></div></div>');
//        });

        comp.structure.eachPolymer(function(p) {
            console.log("Polymer: " + p.residueIndexStart + " - " + p.residueIndexEnd);
        });
    });
}

function _setupPdbControls(outerId, index, el) {
    console.log("Handling PDB controls");

    var i = index + 1;
    var onchange = "macromolChanged('" + outerId + "', this, " + i + "); return false;";

    var controlsEl = el.find("div.pdb.controls" + i);
    if (controlsEl.length == 0) {

        var div = el.find("div.input" + i);

        div.find("*").remove();

        div.append('<div class="ui vertical accordion menu controls' + i + ' pdb">\n' +
            '<div class="item representation' + i + '">\n' +
            '<a class="active title"><i class="dropdown icon"></i>Display type</a>\n' +
            '<div class="active content"><div class="ui form"><div class="grouped fields">\n' +
            _createRepresentationRadio(outerId, "ball+stick", "Ball & Stick", i, true, onchange) +
            _createRepresentationRadio(outerId, "cartoon", "Cartoon", i, false, onchange) +
            _createRepresentationRadio(outerId, "hyperball", "Hyperball", i, false, onchange) +
            _createRepresentationRadio(outerId, "licorice", "Licorice", i, false, onchange) +
            _createRepresentationRadio(outerId, "spacefill", "Spacefill", i, false, onchange) +
            '</div></div></div></div>\n' +
            '<div class="item"><a class="title"><i class="dropdown icon"></i>Components</a><div class="content"><div class="ui form"><div class="grouped fields components' + i + '">\n' +
            '</div></div></div></div></div>');

        var acc = div.find('div.ui.accordion');
        acc.accordion();
    } else {
        console.log("PDB controls already present");
    }
}

function _loadSdf(outerId, stage, data, index, controlsEl) {

    var i = index + 1;

    _setupSdfControls(outerId, index, controlsEl);

    var displayFilterEl = controlsEl.find(".molecules" + i);
    var representationToUse = controlsEl.find('input[name=display_radio_' + i + ']:checked').val();
    console.log("Using representation " + representationToUse);

    var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
    stage.loadFile( stringBlob, { ext: data.extension, name: "input" + i} ).then( function( comp ) {

        var mol = 1
        displayFilterEl.find("*").remove();
        comp.structure.eachModel(function(model) {
            //console.log("Setting up model " + mol + " " + model.index);
            _createSdfRepresentation(comp, mol - 1, representationToUse, true);

            displayFilterEl.append(
                '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="mol' + mol +
                '" onchange="toggleDisplay(\'' + outerId + '\', this, ' + i + ', ' + mol +'); return false;">' +
                '<label>Molecule ' + mol + '</label></div></div>');
            mol++;
        });

        comp.autoView();
    });
}

function _createSdfRepresentation(comp, index, representationToUse, visible) {
    //console.log("Setting up model " + index);
    var params = _createRepresentationParams(representationToUse, {sele: "/" + index, visible: visible});
    comp.addRepresentation(representationToUse, params);
}

function _setupSdfControls(outerId, index, el) {

    console.log("Handling SDF controls");

    var i = index + 1;
    var onchange = "representationChanged('" + outerId + "', this, " + i + "); return false;";

    var controlsEl = el.find("div.sdf.controls" + i);
    if (controlsEl.length == 0) {

        var div = el.find("div.input" + i);

        div.find("*").remove();

        div.append('<div class="ui vertical accordion menu controls' + i + ' sdf">\n' +
            '<div class="item representation' + i + '">\n' +
            '<a class="active title"><i class="dropdown icon"></i>Display type</a>\n' +
            '<div class="active content"><div class="ui form"><div class="grouped fields">\n' +
            _createRepresentationRadio(outerId, "ball+stick", "Ball & Stick", i, true, onchange) +
            _createRepresentationRadio(outerId, "cartoon", "Cartoon", i, false, onchange) +
            _createRepresentationRadio(outerId, "hyperball", "Hyperball", i, false, onchange) +
            _createRepresentationRadio(outerId, "licorice", "Licorice", i, false, onchange) +
            _createRepresentationRadio(outerId, "spacefill", "Spacefill", i, false, onchange) +
            '</div></div></div></div>\n' +
            '<div class="item"><a class="title"><i class="dropdown icon"></i>Molecules</a><div class="content">' +
            '<div class="ui form"><div class="grouped fields molecules' + i + '">\n' +
            '</div></div></div></div></div>');

        var acc = div.find('div.ui.accordion');
        acc.accordion();
    } else {
        console.log("SDF controls already present");
    }
}

function _createRepresentationRadio(outerId, value, label, index, checked, onchange) {
    return '<div class="field"><div class="ui radio checkbox">' +
    '<input type="radio" name="display_radio_' + index + '" value="' + value + '" onchange="' + onchange + '"'
     + (checked ? ' checked' : '') + '><label>' + label +'</label></div></div>\n';
}

function fitNglViewer(divid) {
    console.log("fitNglViewer");
    var outerDiv = $("#" + divid);
    var viewer = outerDiv.find(".main");
    _fixSizes(outerDiv, viewer);
    var stage = viewer[0].nglviewer;
    if (stage) {
        stage.handleResize();
    } else {
        console.log("No stage")
    }
}

/** onchange handler for SDF files */
function representationChanged(divid, what, input) {

    var representation = what.value;
    //console.log("Representation changed: " + representation + " " + input);
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
                    var mol = 0;
                    comp.structure.eachModel(function(m) {
                        // TODO set the visibility according to the selections
                        var visible = $('#' + divid + ' .molecules' + input +' input[name=mol' + (mol + 1) + ']').prop('checked');
                        _createSdfRepresentation(comp, mol, representation, visible);
                        mol++;
                    });
                }
            });
        }
    }
}

/** onchange handler for PDB files */
function macromolChanged(divid, what, input) {

    var i = input + 1;

    var representationToUse = $('#' + divid + ' .representation' + input +' input[name=display_radio_' + input + ']:checked').val();
    console.log("Macromol changed: " + representationToUse + " " + input);
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
                    var displayWaters = $("#" + divid + ' .components' + input + ' input[name=waters' + ']').prop('checked');
                    var displayIons = $("#" + divid + ' .components' + input + ' input[name=ions' + ']').prop('checked');
                    var displayLigands = $("#" + divid + ' .components' + input + ' input[name=ligands' + ']').prop('checked');
                    //console.log("Display waters=" + displayWaters + " ions=" + displayIons + " ligands=" + displayLigands);
                    var selector = _createSelector(undefined, displayWaters, displayIons, displayLigands)
                    console.log("Selector: " + selector);

                    var params = _createRepresentationParams(representationToUse, {})
                    comp.setSelection(selector).addRepresentation(representationToUse, params);
                }
            });
        }
    }
}

function _createSelector(index, displayWaters, displayIons, displayLigands) {
    var selector;
    if (index) {
        selector = "/" + index;
    }

    if (!displayWaters && !displayIons && !displayLigands) { // none
        return (selector ? selector + " " : "") + "not hetero";
    } else if (!displayWaters && !displayIons && displayLigands) { // ligands only
        return (selector ? selector + " " : "") + "not (water or ion)";
    } else if (!displayWaters && displayIons && !displayLigands) { // ions only
        return (selector ? selector + " " : "") + "not (hetero and not ion)";
    } else if (displayWaters && !displayIons && !displayLigands) { // waters only
        return (selector ? selector + " " : "") + "not (hetero and not water)";
    } else if (!displayWaters && displayIons && displayLigands) { // ligands and ions
        return (selector ? selector + " " : "") + "not water";
    } else if (displayWaters && !displayIons && displayLigands) { // ligands and waters
        return (selector ? selector + " " : "") + "not (hetero and ion)";
    } else if (displayWaters && displayIons && !displayLigands) { // ions and waters
        return (selector ? selector + " " : "") + "not (hetero and (ion or water)";
    } else { // everything
        return selector ? selector : "*";
    }
}

function toggleDisplay(divid, what, input, molNumber) {

    var name = what.name;
    var checked = what.checked;
    //console.log("Display changed: " + name + " " + input + " " + checked);
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

                    var i = 1;
                    comp.eachRepresentation(function(rep) {
                        //console.log("Rep " + i + rep);
                        if (i == molNumber) {
                            rep.setVisibility(checked);
                            console.log("Set visibility of mol " + i + " to " + checked);
                        }
                        i++;
                    });
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
    var outerW = outerDiv.width();
    var controlsW = controls.width();
    var houter = outerDiv.height();
    var headersH = headers.height();
    var statusH = status.height();
    var h = houter - headersH - statusH - 6;
    var w = outerW - controlsW - 2;

    console.log("Resizing NGLViewer : outer width=" + outerW + " width=" + w + " outer height=" + houter + " inner height=" + h + "px" + " headersH=" + headersH + " statusH=" + statusH);
    viewer.css("width", w + "px");
    viewer.css("height", h + "px");
}

