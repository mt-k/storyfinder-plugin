var cm = require("sdk/context-menu")
	, url = require("sdk/url").URL
	, tabs = require("sdk/tabs")
	;

module.exports = function(prefs, sidebar){
	/*
	Add an contextmenu item "Add »[selection]« to Storyfinder" when text is selected on a website.
	*/
	cm.Item({
		label: "Add to Storyfinder",
		context: cm.SelectionContext(),
		contentScript: 'self.on("context", function () {' +
	                 '  var text = window.getSelection().toString();' +
	                 '  if (text.length > 64)' +
	                 '    text = text.substr(0, 64);' +
	                 '  return "Add »" + text + "« to Storyfinder";' +
	                 '});' +
	                 'self.on("click", function (node, data) {' +
	                 '  self.postMessage(window.getSelection().toString());' +
	                 '});',
		onMessage: function (caption) {
			var data = {
				caption: caption.substr(0, 64),
				url: tabs.activeTab.url,
				host: url(tabs.activeTab.url).protocol + '//' + url(tabs.activeTab.url).host,
				title: tabs.activeTab.title
			};
			
			sidebar.emit({action: 'create', data: data});
		}
	});
}