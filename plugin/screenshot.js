/*
Take a screenshot of the active tab.
You may pass an object as the first argument to capture only a part of the website. The object has to contain the 4 keys left, top, width and height, specifying the dimensions of the area you want to capture.

Use a framescript for multi process firefox support @see http://stackoverflow.com/questions/34596722/drawwindow-broken-with-multiprocess-firefox-e10s
*/
module.exports = new (function(p){
	const { getTabContentWindow, getActiveTab } = require('sdk/tabs/utils');
	const { getMostRecentBrowserWindow } = require('sdk/window/utils');
	var currentCallback = null;
	
	function captureTab(p, callback) {	  
	  currentCallback = callback;
	  
	  var rectangle = {
		  startX: null,
		  startY: null,
		  width: null,
		  height: null
	  };
	  
	  if(typeof p != 'undefined' && p != null)
		  rectangle = {
			  startX: p.left,
			  startY: p.top,
			  width: p.width,
			  height: p.height
		  };
	  
	  var tab = require("sdk/tabs").activeTab;
	  var xulTab = require("sdk/view/core").viewFor(tab);
	  var xulBrowser = require("sdk/tabs/utils").getBrowserForTab(xulTab);

		var browserMM = xulBrowser.messageManager;
		if (typeof tab.hasScreenshotFrameScript == 'undefined') {
			browserMM.loadFrameScript(require("sdk/self").data.url("content-scripts/frame-script.js"), false);
			browserMM.addMessageListener("storyfinder@got-screenshot", function (payload) {
			    callbackHandler(payload.data);
			});
			tab.hasScreenshotFrameScript = true;
		}
		browserMM.sendAsyncMessage('storyfinder@make_screenshot_from_rectangle', rectangle);
	}
	
	function callbackHandler(data){
		currentCallback(data);
	}

	this.capture = function(p, callback){
		if(typeof p == 'undefined')
			return captureTab(null, callback);
		else
			return captureTab(p, callback);
	}
})();