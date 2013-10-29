/***************************************************************************
			UTILS FUNCTIONS
***************************************************************************/

	//Shorten the vertex function
	function v(x,y,z){ 
		return new THREE.Vector3(x,y,z); 
	}

	//Initializing Three.js renderer
	function initRenderer(width,height) {
		//Creating application Three.js renderer
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.sortObjects = false;

		//Creating new DOM element
		container = document.createElement('div');
		document.body.appendChild(container);

		//Settin renderer size and adding to the DOM
		renderer.autoClear = false;
		renderer.setSize(width, height );
		container.appendChild( renderer.domElement );
		
		
		//Binding to UI elements so camera won't move while manipulating UI
		$('.UI').live("mouseover",function(event){
			controlsOff();			
		});
		
		
		//Binding to UI elements so camera restarts when exiting UI
		$('.UI').live("mouseout",function(event){
			controlsOn();			
		});
	}
	
	//Initializing UI elements
	function initUI() {
		//Create sliders
		$( ".sliderCoord" ).slider({
			value:1,
			min: 0,
			max: 2,
			step: 0.2,
			slide: function( event, ui ) {
				//recreating dataset points
				for(var i=0;i<datasets.length;i++) {
					datasets[i].center([$( "#sliderX" ).slider('value'),$( "#sliderY" ).slider('value'),$( "#sliderZ" ).slider('value')]);
				}
				//Refreshing worlds
				for(var i=0;i<worlds.length;i++) {
					worlds[i].refreshDataSets();
				}
			}
		});
		
		$( "#threshold" ).slider({
			value:0,
			min: 0,
			max: 1000,
			step: 1,
			slide: function( event, ui ) {
				$('#valueTresh').text((ui.value/10000000).toExponential(5));
				if(currentDataset >= 0 && currentClusterset >= 0){
					datasets[currentDataset].clusterSets[currentClusterset].threshold = ui.value/10000000;
					//Refreshing worlds
					for(var i=0;i<worlds.length;i++) {
						worlds[i].refreshDataSets();
					}
				}
			}

		});
		
		
		$( "#alphaClust" ).slider({
			value:0,
			min: 0,
			max: 1,
			step: 0.05,
			slide: function( event, ui ) {
				//Changing global alpha value
				alphaClust = (1 - ui.value);
				
				//Changing cluster materials
				for(var i=0;i<datasets.length;i++) {
					datasets[i].refreshClusterSets();
				}
				//Refreshing worlds
				for(var i=0;i<worlds.length;i++) {
					worlds[i].refreshDataSets();
				}
			}
		});
		
		$( "#alphaRaw" ).slider({
			value:0.9,
			min: 0,
			max: 1,
			step: 0.05,
			slide: function( event, ui ) {
				//Changing global alpha value
				alphaRaw = (1 - ui.value);
				//Refreshing worlds
				for(var i=0;i<worlds.length;i++) {
					worlds[i].refreshDataSets();
				}
			}
		});
		
		$( "#sliderPartSize" ).slider({
			value:2,
			min: 1,
			max: 30,
			step: 1,
			slide: function( event, ui ) {
				//Changing global size
				partSize = ui.value;
				
				//Changing cluster materials
				for(var i=0;i<datasets.length;i++) {
					datasets[i].refreshClusterSets();
				}
				//Refreshing worlds
				for(var i=0;i<worlds.length;i++) {
					worlds[i].refreshDataSets();
				}
			}
		});
		
		//Create accordions
		$("#accordion").accordion({ heightStyle: "content"});

		$("#worldAccordion").buttonset();


		//Create centering button
		$("#checkCenter").button();
		
		
		//Bind events 
		$(".UIControl").bind("click", function (event) {
			//Show/hide UI
			$(".UI").fadeToggle('slow');
		});

		$("#checkCenter").bind("change",function(event) {
			centerPoints = !centerPoints;
			//Refreshing worlds
			for(var i=0;i<worlds.length;i++) {
				worlds[i].refreshDataSets();
			}	
				
		});
		
		$("#newDataSet").bind("change", function (event) {
			startRead();
		});
		
		$(".checkWorld").bind("change",function (event) {
			var $this = $(this);
			if($(".checkWorld:checked").length == 0){
				$this.prop("checked",true);
				$("#worldAccordion").buttonset();
				consoleMess("You need at least one world");
			}
			else{
				numWorlds = $(".checkWorld:checked").length;
				worlds[$this.val()].toggle();
				setWorlds();
			}
		});

		//Bind Cluster File upload now and in the future
		$(".clusterFile").live("change", function (event) {
			startReadCluster($(this).attr('id'));
		});
		
	}
	
	

	//Handler for data selection, binded to UI data representation fields
	function selectDataHandler(event) {
			// $this will contain a reference to the checkbox
			var $this = $(this);

			if (typeof $this.attr('name') !== 'undefined') {
				//remove current
				worlds[event.data.world-1].detachDataSet($this.attr('name'));
			}	
			if($("select[id='worldButtonData"+event.data.dataset+""+event.data.world+"'] option:selected").attr("class") == 'raw'){
				try {
					worlds[event.data.world-1].attachDataSet(datasets[event.data.dataset-1],event.data.dataset-1);
					$this.attr('name',event.data.dataset-1);
					//Clearing the cluster area
					$("#clusters"+(event.data.dataset)+"-"+(event.data.world)+"").empty();
					currentClusterset = -1;
				}
				catch(e) {
					console.log("Failed to load dataset");
				}
			}
			else if($("select[id='worldButtonData"+event.data.dataset+""+event.data.world+"'] option:selected").attr("class") == 'noaction') {
				$this.removeAttr('name');
				//Clearing the cluster area
				$("#clusters"+(event.data.dataset)+"-"+(event.data.world)+"").empty();
				currentClusterset = -1;
			}
			else if($("select[id='worldButtonData"+event.data.dataset+""+event.data.world+"'] option:selected").attr("class") == 'clust') {
				try{
					var numClust = ($("select[id='worldButtonData"+event.data.dataset+""+event.data.world+"'] option:selected").val() - 1);
					worlds[event.data.world-1].attachDataSet(datasets[event.data.dataset-1],event.data.dataset-1,numClust);
					$this.attr('name',event.data.dataset-1);

					//Clearing the cluster area
					$("#clusters"+(event.data.dataset)+"-"+(event.data.world)+"").empty();
					//Creating All/None buttons
					$("#clusters"+(event.data.dataset)+"-"+(event.data.world)+"").append("<a href='#' class='allButton"+(event.data.dataset)+"-"+(event.data.world)+"'>All</a>/<a class='noneButton"+(event.data.dataset)+"-"+(event.data.world)+"' href='#'>None</a>"+
						"<div style='float:right'>Change colour</div>");
					$(".allButton"+(event.data.dataset)+"-"+(event.data.world)+"").bind("click",{world:event.data.world,dataset:event.data.dataset,clustSet:numClust,numClust:datasets[event.data.dataset-1].clusterSets[numClust].numClust}, function(event) {
						$(".clusters"+(event.data.dataset)+"-"+(event.data.world)+"").attr("checked",true);
						for(var k=0;k<event.data.numClust;k++) {
							datasets[event.data.dataset-1].clusterSets[event.data.clustSet].visible[k] = true;
						}
						worlds[event.data.world-1].refreshDataSets();
					});
					$(".noneButton"+(event.data.dataset)+"-"+(event.data.world)+"").bind("click",{world:event.data.world,dataset:event.data.dataset,clustSet:numClust,numClust:datasets[event.data.dataset-1].clusterSets[numClust].numClust}, function(event) {
						$(".clusters"+(event.data.dataset)+"-"+(event.data.world)+"").attr("checked",false);
						for(var k=0;k<event.data.numClust;k++) {
							datasets[event.data.dataset-1].clusterSets[event.data.clustSet].visible[k] = false;
						}
						worlds[event.data.world-1].refreshDataSets();
					});
					//Iterating over each cluster
					
					for(var k=0;k<datasets[event.data.dataset-1].clusterSets[numClust].numClust;k++) {
						var checked = (datasets[event.data.dataset-1].clusterSets[numClust].visible[k]) ? "checked" : "";
						$("#clusters"+(event.data.dataset)+"-"+(event.data.world)+"").append("<div id='divClust"+(event.data.dataset)+"-"+(event.data.world)+"-"+(k+1)+"' style='background-color:"+colorsCSS[k]+";padding-left:8px'>" +
							"<input type='checkbox' "+checked+" class='clusters"+(event.data.dataset)+"-"+(event.data.world)+"' id='clusters"+(event.data.dataset)+"-"+(event.data.world)+"-"+(k+1)+"'> "+
							"<label for='clusters"+(event.data.dataset)+"-"+(event.data.world)+"-"+(k+1)+"'>"+datasets[event.data.dataset-1].clusterSets[numClust].labels[k]+"</label>"+
							"<div style='float:right'><input type='text' size='10' id='colors"+(event.data.dataset)+"-"+(event.data.world)+"-"+(k+1)+"' style='font-size:9px;background:#"+('000000'+datasets[event.data.dataset-1].clusterSets[numClust].materials[k].color.getHex().toString(16)).slice(-6)+"' class=\"color\" value='"+('000000'+datasets[event.data.dataset-1].clusterSets[numClust].materials[k].color.getHex().toString(16)).slice(-6)+"'></div>"+
							"</div>");
						//Binding checkboxes
						$("#clusters"+(event.data.dataset)+"-"+(event.data.world)+"-"+(k+1)+"").bind("change",{world:event.data.world-1,dataset:event.data.dataset-1,clusterSet:numClust,cluster:k}, function(event) {
							var $this = $(this);
							if ($this.is(':checked')) {
							
								datasets[event.data.dataset].clusterSets[event.data.clusterSet].visible[event.data.cluster] = true;
							}
							else {
								datasets[event.data.dataset].clusterSets[event.data.clusterSet].visible[event.data.cluster] = false;
							}
							worlds[event.data.world].refreshDataSets();
						});
						//Binding color input
						$("#colors"+(event.data.dataset)+"-"+(event.data.world)+"-"+(k+1)+"").bind("change",{world:event.data.world-1,dataset:event.data.dataset-1,clusterSet:numClust,cluster:k}, function(event) {
							datasets[event.data.dataset].clusterSets[event.data.clusterSet].setColor(event.data.cluster,'0x'+$(this).val());
							$("#divClust"+(event.data.dataset+1)+"-"+(event.data.world+1)+"-"+(event.data.cluster+1)+"").css('background-color','#'+$(this).val());
						});
						//Binding slider treshhold
						$("#threshold").slider('value',datasets[event.data.dataset-1].clusterSets[numClust].threshold*10000000);
						$("#valueTresh").text(datasets[event.data.dataset-1].clusterSets[numClust].threshold.toExponential(5));
						currentClusterset = numClust;
						currentDataset = event.data.dataset-1;
					}
				}
				catch(e) {
					console.log("Failed to load dataset");
				}
					
			}
	}


	//Display message on command console
	function consoleMess(text) {
		if(typeof timeout !== 'undefined'){
			clearTimeout(timeout);
		}
		$("#console").html(text);
		$("#console").fadeIn('slow');
		timeout = setTimeout("$('#console').fadeOut('slow');",6000);
	}

	


	
	//Render all created worlds
	function renderWorlds () {
		for(var i=0;i<worlds.length;i++) {
			worlds[i].render();
		}
	}
	
	//Different world number options from 1 to 4
	function setWorlds () {
		var coord = new Array();
		var coordNum = 0;
		var i =0;
		if(numWorlds == 1) {
			coord = [[winWidth,winHeight,0,0]];
		}
		else if(numWorlds == 2) {
			coord = [[winWidth/2,winHeight,0,0],[winWidth/2,winHeight,winWidth/2,0]];
		}
		else if(numWorlds == 3) {
			coord = [[winWidth,winHeight/2,0,0],[winWidth/2,winHeight/2,0,winHeight/2],[winWidth/2,winHeight/2,winWidth/2,winHeight/2]];
		}
		else if (numWorlds == 4) {
			coord = [[winWidth/2,winHeight/2,0,0],[winWidth/2,winHeight/2,winWidth/2,0],[winWidth/2,winHeight/2,0,winHeight/2],[winWidth/2,winHeight/2,winWidth/2,winHeight/2]];
		}
		while(coordNum < numWorlds) {
			if(worlds[i].visible) {
				worlds[i].changeSize(coord[coordNum][0],coord[coordNum][1],coord[coordNum][2],coord[coordNum][3]);
				coordNum++;
			}
			i++;
		}
	}

	//Cut all controls
	function controlsOff () {

		for(var i=0;i<worlds.length;i++) {
			worlds[i].disableControls();
		}
	}

	//turn on all controls
	function controlsOn () {
		for(var i=0;i<worlds.length;i++) {
			worlds[i].enableControls();
		}
	}


	//Load Data From URL File
	function setFactory(jsonFile) {
		//JSON file
		if(jsonFile.split('.').pop() == "json") { 
			$.ajax({
			  url: jsonFile,
			  dataType: 'json',
			  success: function(data) {
				  //Reading Json and creating Object
				  var index = datasets.push(new DataSet(data.dataset));
				  addDataSetUI(index);
			},
			 error: function (xhr, ajaxOptions, thrownError){
				jsonError(xhr.statusText);
			} 
			});	
		}
		//XML file
		else if(jsonFile.split('.').pop() == "xml") { 
			$.ajax({
			  url: jsonFile,
			  dataType: 'html',
			  success: function(data) {
				  //Reading xml and creating Object
				  var coord = new Object();
				  var xml = $.parseXML(data);
				  $xml = $( xml );
			    	  coord.name =  $xml.find( "name" ).text();
				  coord.chain = ($xml.find( "chain" ).text()  === 'true');
				  coord.points = new Array();
				  $xml.find("point").each(
					function(i,e) {
						coord.points.push([$(e).find("x").text(),$(e).find("y").text(),$(e).find("z").text()]);
					}
				  );
				  var index = datasets.push(new DataSet(coord));
				  //Adding dataSet to UI
				  addDataSetUI(index);
			},
			 error: function (xhr, ajaxOptions, thrownError){
				jsonError(xhr.statusText);
			} 
			});	
		}
		//CSV File
		else {
			$.ajax({
			  url: jsonFile,
			  dataType: 'html',
			  success: function(data) {
				  //Reading csv and creating Object
				  var coord = new Object();
				  coord.points = $.csv.toArrays(data)
				  var index = datasets.push(new DataSet(coord));
				  addDataSetUI(index);
			},
			 error: function (xhr, ajaxOptions, thrownError){
				jsonError(xhr.statusText);
			} 
			});
			
		}
	}
	
	
	//Load cluster From Json File
	function clusterSetFactory(jsonFile,index) {
		//JSON file
		if(jsonFile.split('.').pop() == "json") { 
			$.ajax({
			  url: jsonFile,
			  dataType: 'json',
			  success: function(data) {
				addClusterUI((index-1),index,data.information);
			},
			  error: function (xhr, ajaxOptions, thrownError){
				jsonError(xhr.statusText);
			}   
			});
		}
		//CSV File
		else {

			$.ajax({
			  url: jsonFile,
			  dataType: 'html',
			  success: function(data) {
				//Reading CSV and creating Object
				var csv = new Object();
				csv.information = new Array();
				var information = $.csv.toArrays(data);

				//Building structure
				for(var j=0;j<information[0].length;j++) {
					csv.information[j] = new Object();
					csv.information[j].values = new Array();
				}

				for(var j=0;j<information[0].length;j++) {
					var clustMax = 0;
					for(var i=1;i<information.length;i++){
						csv.information[j].values[i-1] = Number(information[i][j]);
					}
					csv.information[j].numClass = 2;
					csv.information[j].name = information[0][j];

				}
				addClusterUI(index-1,index,csv.information);
			},
			 error: function (xhr, ajaxOptions, thrownError){
				jsonError(xhr.statusText);
			} 
			});
		}

	}
	
	

	//Reading variable in URl
	function getUrlVars()
	{
		var vars = [], hash;
		var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for(var i = 0; i < hashes.length; i++)
		{
			hash = hashes[i].split('=');
			vars.push(hash[0]);
			vars[hash[0]] = hash[1];
		}
		return vars;
	}

	//Json parsin error handle
	function jsonError(e) {
		consoleMess("Error ("+e+") while reading JSON, please check the file format <br/><a href='https://github.com/jibooo/bioWeb3D/wiki/Getting-started' target='_blank'>more info on formats</a>");
	}


	//xml PARSER
	var parseXml;
	if (typeof window.DOMParser != "undefined") {
	    parseXml = function(xmlStr) {
		return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
	    };
	} else if (typeof window.ActiveXObject != "undefined" &&
	       new window.ActiveXObject("Microsoft.XMLDOM")) {
	    parseXml = function(xmlStr) {
		var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async = "false";
		xmlDoc.loadXML(xmlStr);
		return xmlDoc;
	    };
	} else {
	    throw new Error("No XML parser found");
	}

 
