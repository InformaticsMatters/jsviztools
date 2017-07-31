var representationParamsFnMap = {
    "ball+stick" : function(p) { p.multipleBond = true }
}


function resizeNglViewer(divid, width, height) {
    var outerDiv = $('#' + divid);
    outerDiv.css("width", width + "px");
    outerDiv.css("height", height + "px");
    fitNglViewer(divid);
}

/** Resize the stage */
function fitNglViewer(divid) {

    var outerDiv = $('#' + divid);

    var headers = outerDiv.find(".headers");
    var status = outerDiv.find(".footer");
    var controls = outerDiv.find(".controls");
    var outerW = outerDiv.width();
    var outerH = outerDiv.height();
    var controlsW = controls.width();
    var headerH = headers.height();
    var footerH = status.height();
    var h = outerH - headerH - footerH - 6;
    var w = outerW - controlsW - 2;

//    console.log("Resizing NGLViewer : outerW=" + outerW + " outerH=" + outerH +
//        " innerW=" + w + " innerH=" + h +
//        " headerH=" + headerH + " footerH=" + footerH);

    var viewer = $("#" + divid + '_nglviewer');

    if (viewer.length == 1) {
        var stage = viewer[0].nglviewer;
        if (stage) {
            stage.handleResize();
        }
    }
}

/** Main entry point for setting up the NGL viewer.
*
* The data and configs element params are arrays, the first containing the data, the second the configuration
* for the corresponding data. Currently 2 inputs are handled, though more can easily be supported.
* Each data element is a Javascript object with 3 properties:
* mediaType: Content type of the molecules property. Currently must be text/plain.
* extension: Identifies the type of data. Currently sdf, pdb and mol2 are supported.
* molecules: The content of data that is fed to the NGL viewer. Currently text in SDF, PDB or MOL2 format.
*
* This method can be called multiple times with different data. The same NGL viewer will be reused.
*
* @param divid The ID of the div that is to contain the contents.
* @param data Array of data elements. Expects up to 2 elements, each of which can be null.
* @param configs The configs, includign the display type for each data element. Defaults are used if this is null
* or any element of the array is null.
* @param display Araray of elements that define which molecules are visible
*/
function buildNglViewer(divid, data, config, display) {
    console.log("buildNglViewer in " + divid);

    var viewer_id =  divid + "_nglviewer"
    var outerDiv = $("#" + divid);
    var viewer = outerDiv.find('.viewer');
    viewer[0].id = viewer_id;
    var form = outerDiv.find('form.config');
    var configBuilders = [];

    //console.log("Container is " + viewer + " -> " + viewer_id);

    var stage = viewer[0].nglviewer;
    if (!stage) {
        console.log("Creating new stage in " + viewer_id);
        stage = new NGL.Stage( viewer_id );
        viewer[0].nglviewer = stage;

    } else {
        console.log("Clearing out old stage");
        stage.removeAllComponents();
    }
//    if (config != undefined && config.orientation != undefined) {
//        console.log("Orienting: " + JSON.stringify(config.orientation));
//        stage.viewerControls.orient(config.orientation);
//    }

    var controlsEl = outerDiv.find('.controls');
    var inputsCount = 0
    for (var i=0; i < data.length; i++) {
        var d = data[i];
        var c = (config == undefined || config.inputs == undefined || config.inputs.length <= i ? null : config.inputs[i]);
        var o = (config == undefined ? null : config.orientation);
        var v = (display == undefined || display.length <= i ? null : display[i]);
        if (d) {
            inputsCount++;
            if (d.extension === 'sdf') {
                var config = sdfConfig(i, d, c, v, o);
                configBuilders.push(config);
                config.load();
            } else if (d.extension === 'pdb') {
                var config = macromolConfig(i, d, c, v, o, 'pdb');
                configBuilders.push(config);
                config.load();
            } else if (d.extension === 'mol2') {
                var config = macromolConfig(i, d, c, v, o, 'mol2');
                configBuilders.push(config);
                config.load();
            } else {
                console.log("Unsupported format " + d.extension);
                configBuilders.push(nullConfig(i+1));
            }
            console.log("Loaded data" + (i+1) + " as " + d.extension);
        } else {
            configBuilders.push(nullConfig(i+1));
            console.log("No data" + (i+1));
            var el = controlsEl.find("div.input" + (i+1));
            el.find("*").remove();
            el.append("<span>No data loaded</span>");
        }
    }


// --------------------- SDF related --------------------- //

    function sdfConfig(index, data, initialConfig, displays, orientation) {

        // index is zero based, input is 1 based
        var input = index + 1;
        var config = (initialConfig == null ? defaultConfig() : initialConfig);

        sdfConfig.config = function() {
            var c = baseConfig();
            c.representation = getRepresentation(input);
            config = c;
            return c;
        }

        sdfConfig.display = function() {
            return getSelectedMolecules(input);
        }

        function defaultConfig() {
            var c = baseConfig();
            c.representation = 'ball+stick';
            return c;
        }

        function baseConfig() {
            return {
                version: 1.0,
                type: 'sdf',
            };
        }

        sdfConfig.load = function() {

            var representationToUse = (config == null || config.representation == null ? "ball+stick" : config.representation);

            setupSdfControls(representationToUse);

            var displayFilterEl = controlsEl.find(".molecules" + input);
            displayFilterEl.find("*").remove();
            //console.log("Using representation " + representationToUse);

            if (data.size === undefined || data.size > 0) {
                var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
                stage.loadFile( stringBlob, { ext: data.extension, name: "input" + input} ).then( function( comp ) {

                    var mol = 1

                    comp.structure.eachModel(function(model) {
                        //console.log("Setting up model " + mol + " " + model.index);
                        var vis = false;
                        if (displays == null) {
                            vis = true;
                        } else if (displays.indexOf(mol) > -1) {
                            vis = true;
                        }

                        createSdfRepresentation(comp, mol - 1, representationToUse, vis);

                        var added = displayFilterEl.append(
                          '<div class="field"><div class="ui checkbox"><input type="checkbox" ' +
                          (vis ? 'checked ' : '') + 'name="mol' + mol + '">' +
                          '<label>Molecule ' + mol + '</label></div></div>');

                        mol++;
                    });

                    // add change listeners that react to molecule selection
                    displayFilterEl.find('input').each(function(x) {
                      $(this).change(function() {
                          toggleVisibility(this, x+1);
                          return false;
                      });
                    });

                    comp.autoView();
                    if (orientation) {
                      //console.log("Orienting SDF");
                      stage.viewerControls.orient(orientation);
                    }
                });
            }
          }

        function setupSdfControls(defaultRepresentation) {

            //console.log("Handling SDF controls");


            var sdfControlsEl = controlsEl.find("div.sdf.controls" + input);
            if (sdfControlsEl.length == 0) {

              var div = controlsEl.find("div.input" + input);

              div.find("*").remove();

              div.append('<div class="ui vertical accordion menu controls' + input + ' sdf">\n' +

                  '<div class="item"><a class="active title"><i class="dropdown icon"></i>Molecules</a>' +
                  '<div class="active content"><div class="ui form"><div class="grouped fields molecules' + input + '">\n' +
                  '</div></div></div></div>\n' +

                  '<div class="item representation' + input + '">\n' +
                  '<a class="title"><i class="dropdown icon"></i>Display type</a>\n' +
                  '<div class="content"><div class="ui form"><div class="grouped fields">\n' +
                  createRepresentationRadio("ball+stick", "Ball & Stick", input, defaultRepresentation === "ball+stick") +
                  createRepresentationRadio("cartoon", "Cartoon", input, defaultRepresentation === "cartoon") +
                  createRepresentationRadio("hyperball", "Hyperball", input, defaultRepresentation === "hyperball") +
                  createRepresentationRadio("licorice", "Licorice", input, defaultRepresentation === "licorice") +
                  createRepresentationRadio("spacefill", "Spacefill", input, defaultRepresentation === "spacefill") +
                  '</div></div></div></div>\n' +

                 '</div>');

              var acc = div.find('div.ui.accordion');
              acc.find('input').change(function() {
                  representationChanged(this);
                  return false;
              });
              acc.accordion();
            } else {
              //console.log("SDF controls already present");
            }
        }

        function createSdfRepresentation(comp, i, representationToUse, visible) {
            var params = createRepresentationParams(representationToUse, {sele: "/" + i, visible: visible});
            //console.log("Setting up model " + i + " params: " + JSON.stringify(params));
            comp.addRepresentation(representationToUse, params);
        }

        /** Change display type change handler for SDF files
        */
        function representationChanged(what) {

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

        /** Toggle the visibility of the nth <molNumber> for input <input>
        */
        function toggleVisibility(what, molNumber) {

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


        return sdfConfig;
    }

    // --------------------- PDB and Mol2 related --------------------- //

    function macromolConfig(index, data, initialConfig, displays, orientation, format) {

        // index is zero based, input is 1 based
        var input = index + 1;
        var config = (initialConfig == null ? defaultConfig() : initialConfig);

        macromolConfig.config = function() {
            var c = baseConfig();
            c.representation = getRepresentation(input);
            c.showWaters = isShowWaters();
            c.showIons = isShowIons();
            c.showLigands = isShowLigands();
            config = c;
            return c;
        }

        macromolConfig.display = function() {
            return null;
        }

        function defaultConfig() {
            var c = baseConfig();
            c.representation = 'cartoon';
            return c;
        }

        function baseConfig() {
            return {
                version: 1.0,
                type: format,
            };
        }

        macromolConfig.load = function() {

            var representationToUse = (config.representation == undefined ? "cartoon" : config.representation);
            var showWaters = (config.showWaters == undefined || config.showWaters);
            var showIons = (config.showIons == undefined || config.showIons);
            var showLigands = (config.showLigands == undefined || config.showLigands);

            setupMacromolControls(representationToUse);

            var displayFilterEl = controlsEl.find(".components" + input);
            //console.log("Using representation " + representationToUse);

            var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
            stage.loadFile( stringBlob, { ext: data.extension, name: "input" + input} ).then( function( comp ) {

                comp.addRepresentation(representationToUse);
                comp.autoView();
                if (orientation) {
                    stage.viewerControls.orient(orientation);
                }

                displayFilterEl.find("*").remove();
                displayFilterEl.append(
                    '<div class="field"><div class="ui checkbox"><input type="checkbox" ' + (showWaters ? 'checked ' : '') + 'name="waters">' +
                    '<label>Waters</label></div></div>');
                displayFilterEl.append(
                    '<div class="field"><div class="ui checkbox"><input type="checkbox" ' + (showIons ? 'checked ' : '') + 'name="ions">' +
                    '<label>Ions</label></div></div>');
                displayFilterEl.append(
                    '<div class="field"><div class="ui checkbox"><input type="checkbox" ' + (showLigands ? 'checked ' : '') + 'name="ligands">' +
                    '<label>Ligands</label></div></div>');

                // add change listeners that react to component type selection
                displayFilterEl.find('input').each(function(x) {
                    $(this).change(function() {
                        macromolChanged(this);
                        return false;
                    });
                });

            });
        }

        function setupMacromolControls(representationToUse) {
            //console.log("Handling Macromol controls for input" + input);

            var macromolControlsEl = controlsEl.find("div.macromol.controls" + input);
            if (macromolControlsEl.length == 0) {

                var div = controlsEl.find("div.input" + input);

                div.find("*").remove();

                div.append('<div class="ui vertical accordion menu controls' + input + ' macromol">\n' +
                    '<div class="item representation' + input + '">\n' +
                    '<a class="active title"><i class="dropdown icon"></i>Display type</a>\n' +
                    '<div class="active content"><div class="ui form"><div class="grouped fields">\n' +
                    createRepresentationRadio("ball+stick", "Ball & Stick", input, representationToUse === "ball+stick") +
                    createRepresentationRadio("cartoon", "Cartoon", input, representationToUse === "cartoon") +
                    createRepresentationRadio("hyperball", "Hyperball", input, representationToUse === "hyperball") +
                    createRepresentationRadio("licorice", "Licorice", input, representationToUse === "licorice") +
                    createRepresentationRadio("spacefill", "Spacefill", input, representationToUse === "spacefill") +
                    '</div></div></div></div>\n' +
                    '<div class="item"><a class="title"><i class="dropdown icon"></i>Components</a><div class="content"><div class="ui form"><div class="grouped fields components' + input + '">\n' +
                    '</div></div></div></div></div>');

                var acc = div.find('div.ui.accordion');
                acc.find('input').change(function() {
                    macromolChanged(this);
                    return false;
                });
                acc.accordion();
            } else {
                //console.log("Macromol controls already present");
            }
        }

        /** onchange handler for macromol files
        */
        function macromolChanged(what) {

            var representationToUse = controlsEl.find('.representation' + input +' input[name=display_radio_' + input + ']:checked').val();
            var displayWaters = isShowWaters();
            var displayIons = isShowIons();
            var displayLigands = isShowLigands();
            console.log("Macromol changed: " + input + " " + representationToUse + " waters=" + displayWaters + " ions=" + displayIons + " ligands=" + displayLigands);

            if (!stage) {
                console.log("Viewer not yet configured");
                return;
            } else {
                stage.eachComponent(function(comp) {
                    if (comp.name === "input" + input) {
                        comp.removeAllRepresentations();
                        var selector = createMacromolSelector(displayWaters, displayIons, displayLigands)

                        var params = createRepresentationParams(representationToUse, {});
                        //console.log("Selector: " + selector + " Params: " + JSON.stringify(params));
                        comp.setSelection(selector).addRepresentation(representationToUse, params);
                        configChanged();
                    }
                });
            }
        }

        function createMacromolSelector(displayWaters, displayIons, displayLigands) {

            if (!displayWaters && !displayIons && !displayLigands) { // none
                return "not hetero";
            } else if (!displayWaters && !displayIons && displayLigands) { // ligands only
                return "not (water or ion)";
            } else if (!displayWaters && displayIons && !displayLigands) { // ions only
                return "not (hetero and not ion)";
            } else if (displayWaters && !displayIons && !displayLigands) { // waters only
                return "not (hetero and not water)";
            } else if (!displayWaters && displayIons && displayLigands) { // ligands and ions
                return "not water";
            } else if (displayWaters && !displayIons && displayLigands) { // ligands and waters
                return "not (hetero and ion)";
            } else if (displayWaters && displayIons && !displayLigands) { // ions and waters
                return "not (hetero) or (ion or water)";
            } else { // everything
                return "*";
            }
        }

        function isShowWaters() {
            return controlsEl.find('.components' + input + ' input[name=waters' + ']').prop('checked');
        }

        function isShowIons() {
            return controlsEl.find('.components' + input + ' input[name=ions' + ']').prop('checked');
        }

        function isShowLigands() {
            return controlsEl.find('.components' + input + ' input[name=ligands' + ']').prop('checked');
        }

        return macromolConfig;
    }


    // --------------------- general stuff --------------------- //

    function nullConfig(index) {
        var input = index + 1;

        nullConfig.config = function() { return null; }
        nullConfig.load = function() {}
        nullConfig.display = function() { return null; }

        return nullConfig;
    }


    function createRepresentationRadio(value, label, index, checked) {
        return '<div class="field"><div class="ui radio checkbox">' +
        '<input type="radio" name="display_radio_' + index + '" value="' + value + '"'
         + (checked ? ' checked' : '') + '><label>' + label +'</label></div></div>\n';
    }

    function getRepresentation(input) {
        return controlsEl.find('.representation' + input +' input[name=display_radio_' + input + ']:checked').val();
    }

    function getSelectedMolecules(input) {
        var visible = controlsEl.find('.molecules' + input + ' input');
        var checked = [];
        visible.each(function(i) {
            if ($(this).prop('checked')) {
                checked.push(i+1);
            }
        });
        return checked;
    }

    function createRepresentationParams(representationType, initialParams) {
        var representationParamsFn = representationParamsFnMap[representationType];
        if (representationParamsFn) {
            representationParamsFn(initialParams);
        }
        return initialParams;
    }

    function configChanged() {
        var config = buildConfig();
        saveConfig(config, configBuilders[0].display(), configBuilders[1].display());
    }

    function buildConfig() {
        var config = {};
        var inputs = [];
        inputs.push(configBuilders[0].config());
        inputs.push(configBuilders[1].config());
        config.inputs = inputs;
        config.orientation = stage.viewerControls.getOrientation();

        return config;
    }

    function saveConfig(config, vis1, vis2) {

        if (form.length == 1) {
            var json =  JSON.stringify(config);
            //console.log("Config: " + json);
            form.find('.config').attr('value', json);
            form.find('.display1').attr('value', JSON.stringify(vis1));
            form.find('.display2').attr('value', JSON.stringify(vis2));
            form.find('.updateConfig').click();
        }
    }

}
