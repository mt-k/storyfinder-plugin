var name = "extensions.@storyfinder.sdk.console.logLevel";
require("sdk/preferences/service").set(name, 'info');

var async = require('async')
	, _ = require('lodash')
	, url = require("sdk/url").URL
	, data = require("sdk/self").data
	, pageMod = require("sdk/page-mod")
	, Request = require("sdk/request").Request
	, base64 = require("sdk/base64")
	, screenshot = require('screenshot.js')
	;
	
let { getFavicon } = require("sdk/places/favicon");

module.exports = function(prefs, sidebar){
	sidebar.setPageworker(this);
	var workers = [];
	
	function saveRemote(url, data, callback){
		//console.log(JSON.stringify(data));
		Request({
			url: url,
			headers: {
				Authorization: 'Basic ' + base64.encode(prefs['username'] + ':' + prefs['password'])
			},
			contentType: 'application/json',
			content: JSON.stringify(data),
			onComplete: function (response) {
				if(response.status == 401){
					sidebar.showLogin();
					callback(null, null);
				}else if(response.status != 200){
					console.log('Error', response.statusText, response.text);
					callback(new Error('Unable to save data'));
				}else{
					callback(null, JSON.parse(response.text));
				}
			}
		}).put();
	}
	
	function setArticle(worker, article){
		var data = {
			Site: {
				url: worker.tab.url,
				host: url(worker.tab.url).protocol + '//' + url(worker.tab.url).host,
				headTitle: worker.tab.title
			},
			Article: article
		};
				
		/*data.host = url(worker.tab.url).protocol + '//' + url(worker.tab.url).host;
		data.documentTitle = worker.tab.title;
		*/
		
		worker.port.on('emit-sidebar-event', function(data){
			sidebar.emit({action: data.event, data: data.data});
		});
				
		var bIsNew = false
			, bIsRelevant = false
			, siteId = null
			, articleId = null
			;
				
		async.series([
			function(next){
				getFavicon(data.Site.host, function(favicon){
					data.Site.favicon = favicon;
					next();
				});
			},
			function(next){
				saveRemote(prefs["server"].replace(/\/$/,'') + '/Sites', data, function(err, response){
					console.log(err, response);
					if(err){
						next(err);
						return;
					}
					
					bIsRelevant = response.is_relevant;
					bIsNew = response.is_new;			
										
					if(!_.isUndefined(response.Site)){
						siteId = response.Site.id;
						articleId = response.Site.Article.id;
					
						worker.port.emit('setEntities', response);
					}
										
					if(bIsNew && !bIsRelevant){
						sidebar.emit({action: 'not-relevant', data: data.Site});
					}
					
					console.log(response);
					
					next();
				});
			},
			function(next){
				if(!bIsRelevant || !bIsNew){
					next();
					return;
				}
								
				screenshot.capture(null, function(image){
					saveRemote(
						prefs["server"].replace(/\/$/,'') + '/Sites/' + siteId + '/image',
						{image: image},
						function(err){
							next(err);
						}
					);
				});
			},
			function(next){
				if(!bIsNew){
					next();
					return;
				}
				
				screenshot.capture(article.bounds, function(image){
					saveRemote(
						prefs["server"].replace(/\/$/,'') + '/Articles/' + articleId + '/image',
						{image: image},
						function(err){
							next(err);
						}
					);
				});
			}
		], function(err){
			if(err){
				throw err;
				return false;
			}
		});
	}
	
	function onAttach(worker) {		
		if(!prefs['enabled'])return;
		
		if(worker.tab.url.replace(/\/$/g,'').substr(0, prefs["server"].replace(/\/$/g,'').length) == prefs["server"].replace(/\/$/g,'')){
			sidebar.hide();
		}else{
			var n = workers.length;
			worker.idx = n;
			workers[n] = worker;
			
			worker.on('detach', function(){			
				if(typeof workers[this.idx] != 'undefined')
					delete workers[this.idx];
			});
			
			worker.port.on("setArticle", function(data) {
				setArticle(worker, data);
			});
			
			worker.port.emit('getArticle', {});
		}
	}
	
	function parseSite(url){
		console.log('Parsing site...', url);
		
		workers.forEach(function(worker){
			if(typeof worker != 'undefined'){
				if(worker.tab.url == url){
					worker.port.emit('getArticle', {isRelevant: true});
				}
			}
		});
	}
	
	this.parseSite = parseSite;
	
	function addToHighlighting(entities){
		workers.forEach(function(worker){
			if(typeof worker != 'undefined'){
				worker.port.emit('addEntities', entities);
			}
		});
	}
	
	this.addToHighlighting = addToHighlighting;
	
	/*Attach the content script*/
	pageMod.PageMod({
		include: "*",
		contentScriptFile: data.url('contentscript.js'),
		contentStyleFile: data.url('contentstyle.css'),
		onAttach: onAttach,
		attachTo: ["top"]
	});
}