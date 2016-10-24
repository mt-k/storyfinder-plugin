/* Set log level*/
var name = "extensions.storyfinder@lt.informatik.tu-darmstadt.de.sdk.console.logLevel";
require("sdk/preferences/service").set(name, 'info');

var self = require('sdk/self')
	, pageMod = require("sdk/page-mod")
	, prefs = require('sdk/simple-prefs').prefs
	, tabs = require("sdk/tabs")
	, sidebar = new (require('./sidebar.js'))(prefs)
	, pageWorker = new (require('./pageworker.js'))(prefs, sidebar)
	, contextmenu = new (require('./contextmenu.js'))(prefs, sidebar)
	;

function showGlobalGraph(){
	tabs.open({
		url: remoteUrl,
		isPinned: true
	});
}