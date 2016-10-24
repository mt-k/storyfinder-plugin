var name = "extensions.@storyfinder.sdk.console.logLevel";
require("sdk/preferences/service").set(name, 'info');

var self = require('sdk/self')
	, data = require("sdk/self").data
	, ui = require("sdk/ui")
	, prefs = require('sdk/simple-prefs').prefs
	, tabs = require("sdk/tabs")
	, url = require("sdk/url").URL
	;
	
module.exports = function(prefs){
	var workers = []
		, sidebar = null
		, pageworker = null
		;
		
	function setPageworker(pw){
		pageworker = pw;
	}
	
	this.setPageworker = setPageworker;
	
	function initialize(){
		sidebar = ui.Sidebar({
			id: 'storyfinder-sidebar',
			title: 'Storyfinder',
			url: require("sdk/self").data.url("sidebar.html"),
			onAttach: function (worker) {
				var n = workers.length;
				worker.idx = n;
				workers[n] = worker;
				
				worker.on('detach', function(){			
					if(typeof workers[this.idx] != 'undefined')
						delete workers[this.idx];
				});
								
				worker.port.on("ready", function(){
					initializeSidebar(worker);
				});
				
				worker.port.on('msg', function(data){
					switch(data.action){
						case 'userRegistered':
							storeCredentials(data.username, data.password);
							//worker.port.emit("initialize", prefs["server"].replace(/\/$/,'') + '/');
						break;
						case 'parseSite':
							pageworker.parseSite(data.url);
						break;
						default:
							console.log('Received unknown message from iframe', data);
						break;
					}
				});
			}
		});
				
		if(prefs['showSidebar'])
			sidebar.show();
	}
	
	function onPrefChange(){
		workers.forEach(function(worker){
			if(typeof worker != 'undefined'){
				initializeSidebar(worker);
			}
		});
	}
	
	function initializeSidebar(worker){
		var server = url(prefs['server']);
		worker.port.emit("load", {url: prefs["server"]});
		
		/*if(prefs['username'] == ''){
			worker.port.emit("load", {url: prefs["server"].replace(/\/$/,'') + '/register'});
		}else{
			worker.port.emit("load", {url: prefs["server"], username: prefs["username"], password: prefs["password"]});
		}*/
	}
	
	function storeCredentials(username, password){
		prefs['username'] = username;
		prefs['password'] = password;
	}
	
	function emit(data){
		workers.forEach(function(worker){
			if(typeof worker != 'undefined'){
				//console.log('Emitting message', data);
				worker.port.emit('msg', data);
			}
		});
	}
	
	this.emit = emit;
		
	initialize();
	
	tabs.on('activate', function () {
		if(tabs.activeTab.url.replace(/\/$/g,'') == prefs["server"].replace(/\/$/g,''))
			sidebar.hide();
		else if(prefs['showSidebar'])
			sidebar.show();
	});
	
	tabs.on('open', function (tab) {	
		if(tab.url.replace(/\/$/g,'') == prefs["server"].replace(/\/$/g,''))
			sidebar.hide();
		else if(prefs['showSidebar'])
			sidebar.show();
	});
	
	function hide(){
		sidebar.hide();
	}
	
	this.hide = hide;
}