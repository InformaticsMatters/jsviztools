var representationParamsFnMap = {
    "ball+stick" : function(p) { p.multipleBond = true }
}

/** Main entry point for setting up the NGL viewer.
*
* The data and configs element params are arrays, the first containing the data, the second the configuration
* for the corresponding data. Currently 2 inputs are handled, though more can easily be supported.
* Each data element is a Javascript object with 3 properties:
* mediaType: Content type of the molecules property. Currently must be text/plain.
* extension: Identifies the type of data. Currently 'sdf' or 'pdb' are supported.
* molecules: The content of data that is fed to teh NGL viewer. Currently text in SDF or PDB format.
*
* This method can be called multiple times with different data. The same NGL viewer will be reused.
*
* @param divid The ID of the div that is to contain the contents.
* @param data Array of data elements. Expects up to 2 elements, each of which can be null.
* @param configs Array of configs, one for each data element. Defaults are used if this is null
* or any element of the array is null.
*/
function buildNglViewer(divid, data, configs) {
    console.log("buildNglViewer in " + divid);

    var viewer_id =  divid + "_nglviewer"
    var outerDiv = $("#" + divid);
    var viewer = outerDiv.find('.viewer');
    viewer[0].id = viewer_id;
    var configBuilders = [];

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
        var c = (configs == undefined || configs.length <= i ? null : configs[i]);
        if (d) {
            inputsCount++;
            if (d.extension === 'sdf') {
                var config = sdfConfig(i, d, c);
                configBuilders.push(config);
                config.load();
            } else if (d.extension === 'pdb') {
                var config = pdbConfig(i, d, c);
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


    function fixSizes() {
        var headers = outerDiv.find(".header");
        var status = outerDiv.find(".footer");
        var controls = outerDiv.find(".controls");
        var outerW = outerDiv.width();
        var controlsW = controls.width();
        var houter = outerDiv.height();
        var headerH = headers.height();
        var footerH = status.height();
        var h = houter - headerH - footerH - 6;
        var w = outerW - controlsW - 2;

//        console.log("Resizing NGLViewer : outerW=" + outerW + " innerW=" + w + " outerH=" + houter +
//            " innerH=" + h + " headerH=" + headerH + " footerH=" + footerH);
        viewer.css("width", w + "px");
        viewer.css("height", h + "px");
    }

// --------------------- SDF related --------------------- //

    function sdfConfig(index, data, initialConfig) {

        // index is zero based, input is 1 based
        var input = index + 1;
        var config = (initialConfig == null ? defaultConfig() : initialConfig);

        sdfConfig.config = function() {
            var c = baseConfig();
            c.representation = getRepresentation(input);
            c.molecules = getSelectedMolecules(input);
            config = c;
            return c;
        }

        function defaultConfig() {
            var c = baseConfig();
            c.representation = 'ball+stick';
            // molecules being null means all molecules
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
            //console.log("Using representation " + representationToUse);

            var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
            stage.loadFile( stringBlob, { ext: data.extension, name: "input" + input} ).then( function( comp ) {

                var mol = 1
                displayFilterEl.find("*").remove();
                comp.structure.eachModel(function(model) {
                    //console.log("Setting up model " + mol + " " + model.index);
                    var visible = false;
                    if (config == null || config.molecules == null) {
                        visible = true;
                    } else if (config.molecules.indexOf(mol) > -1) {
                        visible = true;
                    }

                    createSdfRepresentation(comp, mol - 1, representationToUse, visible);

                    var added = displayFilterEl.append(
                      '<div class="field"><div class="ui checkbox"><input type="checkbox" ' +
                      (visible ? 'checked ' : '') + 'name="mol' + mol + '">' +
                      '<label>Molecule ' + mol + '</label></div></div>');

                    mol++;
              });

              // add change listeners that react to molecule selection
              displayFilterEl.find('input').each(function(x) {
                  $(this).change(function() {
                      toggleDisplay(this, x+1);
                      return false;
                  });
              });

              comp.autoView();
            });
          }

        function setupSdfControls(defaultRepresentation) {

            //console.log("Handling SDF controls");


            var sdfControlsEl = controlsEl.find("div.sdf.controls" + input);
            if (sdfControlsEl.length == 0) {

              var div = controlsEl.find("div.input" + input);

              div.find("*").remove();

              div.append('<div class="ui vertical accordion menu controls' + input + ' sdf">\n' +
                  '<div class="item representation' + input + '">\n' +
                  '<a class="active title"><i class="dropdown icon"></i>Display type</a>\n' +
                  '<div class="active content"><div class="ui form"><div class="grouped fields">\n' +
                  createRepresentationRadio("ball+stick", "Ball & Stick", input, defaultRepresentation === "ball+stick") +
                  createRepresentationRadio("cartoon", "Cartoon", input, defaultRepresentation === "cartoon") +
                  createRepresentationRadio("hyperball", "Hyperball", input, defaultRepresentation === "hyperball") +
                  createRepresentationRadio("licorice", "Licorice", input, defaultRepresentation === "licorice") +
                  createRepresentationRadio("spacefill", "Spacefill", input, defaultRepresentation === "spacefill") +
                  '</div></div></div></div>\n' +
                  '<div class="item"><a class="title"><i class="dropdown icon"></i>Molecules</a><div class="content">' +
                  '<div class="ui form"><div class="grouped fields molecules' + input + '">\n' +
                  '</div></div></div></div></div>');

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

        /** Toggle the display of the nth <molNumber> for input <input>
        */
        function toggleDisplay(what, molNumber) {

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

    // --------------------- PDB related --------------------- //

    function pdbConfig(index, data, initialConfig) {

        // index is zero based, input is 1 based
        var input = index + 1;
        var config = (initialConfig == null ? defaultConfig() : initialConfig);

        pdbConfig.config = function() {
            var c = baseConfig();
            c.representation = getRepresentation(input);
            c.showWaters = isShowWaters();
            c.showIons = isShowIons();
            c.showLigands = isShowLigands();
            config = c;
            return c;
        }

        function defaultConfig() {
            var c = baseConfig();
            c.representation = 'cartoon';
            return c;
        }

        function baseConfig() {
            return {
                version: 1.0,
                type: 'pdb',
            };
        }

        pdbConfig.load = function() {

            var representationToUse = (config.representation == undefined ? "cartoon" : config.representation);
            var showWaters = (config.showWaters == undefined || config.showWaters);
            var showIons = (config.showIons == undefined || config.showIons);
            var showLigands = (config.showLigands == undefined || config.showLigands);

            setupPdbControls(representationToUse);

            var displayFilterEl = controlsEl.find(".components" + input);
            //console.log("Using representation " + representationToUse);

            var stringBlob = new Blob( [ data.molecules ], { type: data.mediaType} );
            stage.loadFile( stringBlob, { ext: data.extension, name: "input" + input} ).then( function( comp ) {

                comp.addRepresentation(representationToUse);
                comp.autoView();

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
                        pdbChanged(this);
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

        function setupPdbControls(representationToUse) {
            //console.log("Handling PDB controls for input" + input);

            var pdbControlsEl = controlsEl.find("div.pdb.controls" + input);
            if (pdbControlsEl.length == 0) {

                var div = controlsEl.find("div.input" + input);

                div.find("*").remove();

                div.append('<div class="ui vertical accordion menu controls' + input + ' pdb">\n' +
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
                    pdbChanged(this);
                    return false;
                });
                acc.accordion();
            } else {
                //console.log("PDB controls already present");
            }
        }

        /** onchange handler for PDB files
        */
        function pdbChanged(what) {

            var representationToUse = controlsEl.find('.representation' + input +' input[name=display_radio_' + input + ']:checked').val();
            var displayWaters = isShowWaters();
            var displayIons = isShowIons();
            var displayLigands = isShowLigands();
            console.log("PDB changed: " + input + " " + representationToUse + " waters=" + displayWaters + " ions=" + displayIons + " ligands=" + displayLigands);

            if (!stage) {
                console.log("Viewer not yet configured");
                return;
            } else {
                stage.eachComponent(function(comp) {
                    if (comp.name === "input" + input) {
                        comp.removeAllRepresentations();
                        var selector = createPdbSelector(displayWaters, displayIons, displayLigands)

                        var params = createRepresentationParams(representationToUse, {});
                        //console.log("Selector: " + selector + " Params: " + JSON.stringify(params));
                        comp.setSelection(selector).addRepresentation(representationToUse, params);
                        configChanged();
                    }
                });
            }
        }

        function createPdbSelector(displayWaters, displayIons, displayLigands) {

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

        return pdbConfig;
    }


    // --------------------- general stuff --------------------- //

    function nullConfig(index) {
        var input = index + 1;

        nullConfig.config = function() { return null; }
        nullConfig.load = function() {}

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
    }

    function buildConfig() {
        var config = {};
        config.config1 = configBuilders[0].config();
        config.config2 = configBuilders[1].config();
        var rep1 = getRepresentation(1);
        var rep2 = getRepresentation(2);
        //console.log("Config1: " + JSON.stringify(config.config1));
        //console.log("Config2: " + JSON.stringify(config.config2));

        return config;
    }

}





