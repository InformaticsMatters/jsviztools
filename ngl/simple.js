function buildNglViewer(divid, data) {
    console.log("buildNglViewer in " + divid);

    var viewer_id =  divid + "_nglviewer"
    var outerDiv = $("#" + divid);
    var viewer = outerDiv.find('.viewer');
    viewer[0].id = viewer_id;

    console.log("Container is " + viewer + " -> " + viewer_id);
    fixSizes();

    var stage = viewer[0].nglviewer;
    if (!stage) {
        console.log("Creating new stage in " + viewer_id);
        stage = new NGL.Stage( viewer_id );
        viewer[0].nglviewer = stage;
        new ResizeSensor(viewer, function() {
            console.log('Stage resized');
            fixSizes();
            stage.handleResize();
        });
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
                loadSdf(d, i);
            } else if (d.extension === 'pdb') {
                loadPdb(d, i);
            }
            console.log("Loaded data" + (i+1) + " as " + d.extension);
        } else {
            console.log("No data" + (i+1));
            var el = controlsEl.find("div.input" + (i+1));
            el.find("*").remove();
            el.append("<span>No data loaded</span>");
        }
    }

    function fixSizes() {
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

// --------------------- SDF related --------------------- //

    function loadSdf(data, input) {

        var i = input + 1;

        setupSdfControls(input);

        var displayFilterEl = controlsEl.find(".molecules" + i);
        var representationToUse = controlsEl.find('input[name=display_radio_' + i + ']:checked').val();
        console.log("Using representation " + representationToUse);

        var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
        stage.loadFile( stringBlob, { ext: data.extension, name: "input" + i} ).then( function( comp ) {

            var mol = 1
            displayFilterEl.find("*").remove();
            comp.structure.eachModel(function(model) {
                //console.log("Setting up model " + mol + " " + model.index);
                createSdfRepresentation(comp, mol - 1, representationToUse, true);

                var added = displayFilterEl.append(
                    '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="mol' + mol + '">' +
                    '<label>Molecule ' + mol + '</label></div></div>');

                mol++;
            });

            // add change listeners that react to molecule selection
            displayFilterEl.find('input').each(function(x) {
                $(this).change(function() {
                    toggleDisplay(this, i, x+1);
                    return false;
                });
            });

            comp.autoView();
        });
    }


    function setupSdfControls(input) {

        console.log("Handling SDF controls");

        var i = input + 1;

        var sdfControlsEl = controlsEl.find("div.sdf.controls" + i);
        if (sdfControlsEl.length == 0) {

            var div = controlsEl.find("div.input" + i);

            div.find("*").remove();

            div.append('<div class="ui vertical accordion menu controls' + i + ' sdf">\n' +
                '<div class="item representation' + i + '">\n' +
                '<a class="active title"><i class="dropdown icon"></i>Display type</a>\n' +
                '<div class="active content"><div class="ui form"><div class="grouped fields">\n' +
                createRepresentationRadio("ball+stick", "Ball & Stick", i, true) +
                createRepresentationRadio("cartoon", "Cartoon", i, false) +
                createRepresentationRadio("hyperball", "Hyperball", i, false) +
                createRepresentationRadio("licorice", "Licorice", i, false) +
                createRepresentationRadio("spacefill", "Spacefill", i, false) +
                '</div></div></div></div>\n' +
                '<div class="item"><a class="title"><i class="dropdown icon"></i>Molecules</a><div class="content">' +
                '<div class="ui form"><div class="grouped fields molecules' + i + '">\n' +
                '</div></div></div></div></div>');

            var acc = div.find('div.ui.accordion');
            acc.find('input').change(function() {
                representationChanged(this, i);
                return false;
            });
            acc.accordion();
        } else {
            console.log("SDF controls already present");
        }
    }

    function createSdfRepresentation(comp, index, representationToUse, visible) {
        //console.log("Setting up model " + index);
        var params = createRepresentationParams(representationToUse, {sele: "/" + index, visible: visible});
        comp.addRepresentation(representationToUse, params);
    }

    /** Change display type change handler for SDF files
    */
    function representationChanged(what, input) {

        var representation = what.value;
        //console.log("Representation changed: " + representation + " " + input);
        if (stage == null) {
            console.log("Can't find viewer");
        } else {
            stage.eachComponent(function(comp) {
                if (comp.name === "input" + input) {
                    comp.removeAllRepresentations();
                    var mol = 0;
                    comp.structure.eachModel(function(m) {
                        // TODO set the visibility according to the selections
                        var visible = controlsEl.find('.molecules' + input +' input[name=mol' + (mol + 1) + ']').prop('checked');
                        createSdfRepresentation(comp, mol, representation, visible);
                        mol++;
                    });
                    configChanged();
                }
            });
        }
    }

    /** Toggle the display of the nth <molNumber> for input <input>
    */
    function toggleDisplay(what, input, molNumber) {

        var name = what.name;
        var checked = what.checked;
        //console.log("Display changed: " + name + " " + input + " " + checked);
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
                            configChanged();
                        }
                        i++;
                    });
                }
                i++;
            });
        }
    }

    // --------------------- PDB related --------------------- //

    function loadPdb(data, index) {

        var i = index + 1;
        setupPdbControls(index);

        var displayFilterEl = controlsEl.find(".components" + i);
        var representationToUse = controlsEl.find('input[name=display_radio_' + i + ']:checked').val();
        console.log("Using representation " + representationToUse);

        var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
        stage.loadFile( stringBlob, { ext: data.extension, name: "input" + i} ).then( function( comp ) {

            comp.addRepresentation(representationToUse);
            comp.autoView();

            displayFilterEl.find("*").remove();
            displayFilterEl.append(
                '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="waters">' +
                '<label>Waters</label></div></div>');
            displayFilterEl.append(
                '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="ions">' +
                '<label>Ions</label></div></div>');
            displayFilterEl.append(
                '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="ligands">' +
                '<label>Ligands</label></div></div>');

            // add change listeners that react to component type selection
            displayFilterEl.find('input').each(function(x) {
                $(this).change(function() {
                    pdbChanged(this, i, x+1);
                    return false;
                });
            });


    //        var chainNames = new Set();
    //        comp.structure.eachChain(function(c) {
    //            console.log("Chain: " + c.chainid + " " + c.chainname + " " + c.entity.description);
    //            chainNames.add(c.chainname);
    //        });
    //        chainNames.forEach(function(c) {
    //            console.log("Found chain " + c);
    //            displayFilterEl.append(
    //                '<div class="field"><div class="ui checkbox"><input type="checkbox" checked name="chain_' + c +
    //                '" onchange="macromolDisplay(\'' + divid + '\', this, ' + i + '); return false;">' +
    //                '<label>Chain ' + c + '</label></div></div>');
    //        });

//            comp.structure.eachPolymer(function(p) {
//                console.log("Polymer: " + p.residueIndexStart + " - " + p.residueIndexEnd);
//            });
        });
    }

    function setupPdbControls(index) {
        console.log("Handling PDB controls");

        var i = index + 1;

        var pdbControlsEl = controlsEl.find("div.pdb.controls" + i);
        if (pdbControlsEl.length == 0) {

            var div = controlsEl.find("div.input" + i);

            div.find("*").remove();

            div.append('<div class="ui vertical accordion menu controls' + i + ' pdb">\n' +
                '<div class="item representation' + i + '">\n' +
                '<a class="active title"><i class="dropdown icon"></i>Display type</a>\n' +
                '<div class="active content"><div class="ui form"><div class="grouped fields">\n' +
                createRepresentationRadio("ball+stick", "Ball & Stick", i, true) +
                createRepresentationRadio("cartoon", "Cartoon", i, false) +
                createRepresentationRadio("hyperball", "Hyperball", i, false) +
                createRepresentationRadio("licorice", "Licorice", i, false) +
                createRepresentationRadio("spacefill", "Spacefill", i, false) +
                '</div></div></div></div>\n' +
                '<div class="item"><a class="title"><i class="dropdown icon"></i>Components</a><div class="content"><div class="ui form"><div class="grouped fields components' + i + '">\n' +
                '</div></div></div></div></div>');

            var acc = div.find('div.ui.accordion');
            acc.find('input').change(function() {
                pdbChanged(this, i);
                return false;
            });
            acc.accordion();
        } else {
            console.log("PDB controls already present");
        }
    }

    /** onchange handler for PDB files
    */
    function pdbChanged(what, input) {

        var i = input + 1;

        var representationToUse = controlsEl.find('.representation' + input +' input[name=display_radio_' + input + ']:checked').val();
        console.log("Macromol changed: " + representationToUse + " " + input);
        if (!stage) {
            console.log("Viewer not yet configured");
            return;
        } else {
            stage.eachComponent(function(comp) {
                if (comp.name === "input" + input) {
                    comp.removeAllRepresentations();
                    var displayWaters = controlsEl.find('.components' + input + ' input[name=waters' + ']').prop('checked');
                    var displayIons = controlsEl.find('.components' + input + ' input[name=ions' + ']').prop('checked');
                    var displayLigands = controlsEl.find('.components' + input + ' input[name=ligands' + ']').prop('checked');
                    //console.log("Display waters=" + displayWaters + " ions=" + displayIons + " ligands=" + displayLigands);
                    var selector = createPdbSelector(undefined, displayWaters, displayIons, displayLigands)
                    console.log("Selector: " + selector);

                    var params = createRepresentationParams(representationToUse, {})
                    comp.setSelection(selector).addRepresentation(representationToUse, params);
                    configChanged();
                }
            });
        }
    }

    function createPdbSelector(index, displayWaters, displayIons, displayLigands) {
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

    // --------------------- general stuff --------------------- //

    function createRepresentationRadio(value, label, index, checked) {
        return '<div class="field"><div class="ui radio checkbox">' +
        '<input type="radio" name="display_radio_' + index + '" value="' + value + '"'
         + (checked ? ' checked' : '') + '><label>' + label +'</label></div></div>\n';
    }

    function getRepresentation(input) {
        return controlsEl.find('.representation' + input +' input[name=display_radio_' + input + ']:checked').val();
    }

    var representationParamsFnMap = {
        "ball+stick" : function(p) { p.multipleBond = true }
    }

    function createRepresentationParams(representationType, initialParams) {
        var representationParamsFn = representationParamsFnMap[representationType];
        if (representationParamsFn) {
            representationParamsFn(initialParams);
        }
        return initialParams;
    }

    function configChanged() {
        console.log("Config changed");
        var config = buildConfig();
    }

    function buildConfig() {
        var config = {};
        var rep1 = getRepresentation(1);
        var rep2 = getRepresentation(2);
        console.log("Reps: " + rep1 + " " + rep2);

        return config;
    }

}





