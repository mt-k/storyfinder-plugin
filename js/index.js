var Readability = require('readability-node').Readability
	, _ = require('lodash')
	, async = require('async')
	, escapeStringRegexp = require('escape-string-regexp')
	, Delegate = require('dom-delegate')
	;

function Storyfinder(){
	var cssNamespace = 'de-tu-darmstadt-lt-storyfinder'
		, article = null
		, articleNodes = []
		;
		
	/*
		Plugin communication
	*/
	function initializePlugin(){
		if(!_.isUndefined(self.port) && !_.isNull(self.port)){			
			self.port.on('getArticle', function(data){
				if(_.isNull(article)){		
					if(!getArticle())
						article = {
							isRelevant: false,
							isParseable: false
						};
				}
	
				if(!_.isUndefined(data) && !_.isUndefined(data.isRelevant))
					article.isRelevant = data.isRelevant;
					
				self.port.emit('setArticle', article);
			});
			
			self.port.on('setEntities', function(data){
				setEntities(data.Site.Entities);
				activateHighlighting();
			});
			
			self.port.on('error', function(err){
				alert(err.msg);
			});
			
			self.port.on('highlight', function(nodeId){
				highlight(nodeId);
			});
			
			self.port.on('unhighlight', function(nodeId){
				unhighlight(nodeId);
			});
		}
	}
	
	/*
		Find the elements of the website which contain the article
	*/
	function getArticle(){
		var loc = document.location;
		var uri = {
			spec: loc.href,
			host: loc.host,
			prePath: loc.protocol + "//" + loc.host,
			scheme: loc.protocol.substr(0, loc.protocol.indexOf(":")),
			pathBase: loc.protocol + "//" + loc.host + loc.pathname.substr(0, loc.pathname.lastIndexOf("/") + 1)
		};
		
		/*
			Readability modified the dom tree by removing elements etc.
			We do not want to alter the visible website. Therefor, readability gets applied to a clone of the document.
			In order to find the elements of the clone in the real document, after readability has extracted the article,
			we assign an id to every node:
			1) Assign ID to every node
			2) Clone document
			3) Run Readability on the clone
			4) get the content articleContent by overwriting the _postProcessContent method of Readability
			5) find elements with ids in the articleContent
			6) get only the top level elements with ids
			7) find the same elements in the real document by their ids
		*/
		
		var content = null;
		
		//1)
		var elementList = document.querySelectorAll('*');
		for(var i = 0;i < elementList.length; i++){
			elementList[i].setAttribute('__sf__eid', i++);
		};
			
		//4)			
		Readability.prototype._postProcessContent = function(articleContent){
			content = articleContent;
			this._fixRelativeUris(articleContent);
		};
		
		//2)
		var documentClone = document.cloneNode(true);
		//3)
		article = new Readability(uri, documentClone).parse();
		
		if(_.isNull(article))return false;
		
		article.bounds = {top: null, right: null, bottom: null, left: null, width: null, height: null};
		
		var topNodes = [];
		if(typeof content != 'undefined' && content != null){
			//5)
			var elementIds = []
				, topNodeClones = content.querySelectorAll('[__sf__eid]');
				;
	
			//6)
			for(var node of topNodeClones){
				var p = node;
				while(typeof p.parentNode != 'undefined' && p.parentNode != null){
					p = p.parentNode;
					
					if(p.hasAttribute('__sf__eid'))
						break;
				}
				if(p.hasAttribute('__sf__eid') && p != node)continue;
				
				elementIds.push(node.getAttribute('__sf__eid'));
			}
		
			//7)
			topNodes = document.querySelectorAll('[__sf__eid="' + elementIds.join('"], [__sf__eid="', elementIds) + '"]');
			for(var i = 0;i < topNodes.length; i++){
				articleNodes.push({
					id: topNodes[i].getAttribute('__sf__eid'),
					el: topNodes[i]
				});
				
				var dim = topNodes[i].getBoundingClientRect();
								
				if(article.bounds.top == null || article.bounds.top > dim.top + window.scrollY)
					article.bounds.top = dim.top + window.scrollY;
				if(article.bounds.left == null || article.bounds.left > dim.left + window.scrollY)
					article.bounds.left = dim.left + window.scrollX;
				if(article.bounds.right == null || article.bounds.right > dim.right + window.scrollX)
					article.bounds.right = dim.right + window.scrollX;
				if(article.bounds.bottom == null || article.bounds.bottom > dim.bottom + window.scrollY)
					article.bounds.bottom = dim.bottom + window.scrollY;
					
				if(article.bounds.width == null || article.bounds.width < topNodes[i].scrollWidth)
					article.bounds.width = topNodes[i].scrollWidth;
				if(article.bounds.height == null || article.bounds.height < topNodes[i].scrollHeight)
					article.bounds.height = topNodes[i].scrollHeight;
				
				//Assign the storyfinder root class to the element
				topNodes[i].classList.add(cssNamespace + '-root');
			}
			
			//article.bounds.height = document.contentDocument.clientHeight - article.bounds.bottom - article.bounds.top;
			//article.bounds.width = document.contentDocument.clientWidth - article.bounds.left - article.bounds.right;
			article.plain = article.title + "\n" + articleNodes.map(function(node){
				return node.el.textContent;
			}).join("\n");
			article.html = article.content.innerHTML;
			return true;
		}
		return false;
	}
	
	/*
	Highlight entities	
	*/
	function setEntities(entities){			
		entities = entities.sort(function(a, b){
			return b.caption.length - a.caption.length;
		});
			
		entities.forEach(function(entity){
			articleNodes.forEach(articleNode => {
				var textNodes = getTextNodesIn(articleNode.el);
				
				if(textNodes.length == 0)return;
				
				entities.forEach(entity => {
					var val = entity.caption;
					
					textNodes.forEach((textNode) => {
						var txt = textNode.textContent;
												
						if(!_.isUndefined(txt.split)){
							var split = new RegExp('([^A-Za-z0-9\-])(' + escapeStringRegexp(val) + ')([^\-A-Za-z0-9])', 'g');
							var replaced = txt.replace(split, '$1<sf-entity class="entity type-' + entity.type + '" data-entity-id="' + entity.id + '">$2</sf-entity>$3');
							if(txt != replaced){
								var newTextNode = document.createElement('sf-text-node');
								newTextNode.innerHTML = replaced;
								
								if(!_.isNull(textNode.parentElement))
									textNode.parentElement.replaceChild(newTextNode, textNode);
							}
						}
					});
				});
			});
		});
	}
	
	function activateHighlighting(){
		articleNodes.forEach(articleNode => {
			var delegate = new Delegate(articleNode.el);
		
			delegate.on('mouseover', 'sf-entity', function(event){
				var nodeId = this.getAttribute('data-entity-id');
				setHighlight(nodeId, true);
			});
		
			delegate.on('mouseout', 'sf-entity', function(event){	
				var nodeId = this.getAttribute('data-entity-id');
				setHighlight(nodeId, false);
			});
		});
	}
	
	function setHighlight(id, status){		
	
		self.port.emit('emit-sidebar-event', {
			event: status?'highlight':'unhighlight',
			data: id
		});
		
		articleNodes.forEach(articleNode => {
			if(status)
				articleNode.el.classList.add('storyfinder-highlighted');
			else
				articleNode.el.classList.remove('storyfinder-highlighted');
		});
	}
	
	function getTextNodesIn(el){
		//Select all children
		//console.log(typeof el);
		var result = [];
		
		for(var c of el.childNodes){
			if(c.nodeType == 3)
				result.push(c);
		}
		
		var children = el.querySelectorAll(':not(iframe)');
		
		for(var c of children){
			if(c.nodeType == 3)
				result.push(c);
			else if(typeof c.childNodes != 'undefined'){
				for(var cc of c.childNodes)
					if(cc.nodeType == 3)
						result.push(cc);
			}
		}
					
		return result;
	}
	
	initializePlugin();
}

new Storyfinder();