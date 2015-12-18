
var pu = require('url').parse;
var of = require('zanner-typeof').of;

var path2path = function(_path){
	return _path
		.split('/')
		.filter(function(value, index, array){
			return index===0 || value.length>0;
		})
		.join('/');
};

var matching = {
	any: function(_match, _value){
		return _match==='*';
	},
	equal: function(_match, _value){
		return _match.toLowerCase()===_value.toLowerCase();
	},
	like: function(_match, _value){
		return _value.indexOf(_match, 0)!==-1;
	},
	llike: function(_match, _value){
		return _value.indexOf(_match, 0)===0;
	},
	plike: function(_match, _value){
		return matching.equal(path2path(_match), path2path(_value));
	},
	method: function(_match, _value){
		return matching.any(_match, _value) || matching.equal(_match, _value);
	},
	host: function(_match, _value){
		return matching.any(_match, _value) || matching.equal(_match, _value);
	},
	path: function(_match, _value){
		return matching.any(_match, _value) || matching.equal(_match, _value) || matching.plike(_match, _value);
	},
	compare: function(_match, _value, _compare){
		if(!of(_compare, 'function')){
			throw '[_middle.matching.compare]: compare not function';
		}
		switch(of(_match)){
			case 'array':  return _match.some(function(m){return matching.compare(m, _value, _compare);});
			case 'regexp': return _match.test(_value);
			case 'string': return !!_compare(_match, _value);
		}
		return false;
	},
	methods: function(_match, _method){
		return matching.compare(_match, _method, matching.method);
	},
	hosts: function(_match, _host){
		return matching.compare(_match, _host, matching.host);
	},
	paths: function(_match, _path){
		return matching.compare(_match, _path, matching.path);
	}
};

var match = module.exports.match = function(_match, _request){
	// resolve([type, value, pattern]), reject([type, urlPart, value, pattern])
	var promise = new Promise(function(resolve, reject){
		switch(of(_match)){
			case 'array':
				var ematch = _match.entries();
				var _matchWalk = function(){
					var _ematch = ematch.next();
					if(_ematch.done) reject(['array', 'path', _match]);
					else{
						match(_ematch.value, _request)
							.then(function(value){
								resolve(['array', value[1], value[2]]);
							})
							.catch(function(){
								_matchWalk();
							});
					}
				};
				_matchWalk();
				break;
			case 'boolean':
				_match ? resolve(['boolean', _match, true]) : reject(['boolean', 'path', _match]);
				break;
			case 'object':
				var requestMethod = _request.method.toLowerCase();
				if('method' in _match){
					if(!matching.methods(_match.method, requestMethod)){
						reject(['object', 'method', _match.method, requestMethod]);
						break;
					}
				}
				else if('m' in _match){
					if(!matching.methods(_match.m, requestMethod)){
						reject(['object', 'method', _match.m, requestMethod]);
						break;
					}
				}
				var requestHost = pu(_request.url).hostname;
				if('host' in _match){
					if(!matching.hosts(_match.host, requestHost)){
						reject(['object', 'host', _match.host, requestHost]);
						break;
					}
				}
				else if('h' in _match){
					if(!matching.hosts(_match.h, requestHost)){
						reject(['object', 'host', _match.h, requestHost]);
						break;
					}
				}
				var requestPath = pu(_request.url).pathname;
				if('path' in _match){
					if(!matching.paths(_match.path, requestPath)){
						reject(['object', 'path', _match.path, requestPath]);
						break;
					}
				}
				else if('p' in _match){
					if(!matching.paths(_match.p, requestPath)){
						reject(['object', 'path', _match.p, requestPath]);
						break;
					}
				}
				resolve(['object', _match, [requestMethod, requestHost, requestPath]]);
				break;
			case 'regexp':
				var requestPath = pu(_request.url).pathname;
				var result = _match.exec(requestPath);
				if(result && result.index===0){
					resolve(['regexp', result[0], requestPath]);
				}
				else{
					reject(['regexp', 'path', _match, requestPath]);
				}
				break;
			case 'string':
				var requestPath = pu(_request.url).pathname;
				// get://host1.host2.host3.host4/path1/path2/path3/path4
				var RE = /^(?:([\w]+|[\*])[\:])?(?:[\/]{2}([\w\d\:\.\_\-]+|[\*]))?(?:[\/]{1}([^\/]+(?:[\/][^\/]+)*|[\*])?)?$/i;
				if(_match===''){
					reject(['string', 'path', _match, requestPath]);
				}
				else if(matching.path(_match, requestPath)){
					resolve(['string', _match, requestPath]);
				}
				else if(RE.test(_match)){
					var m = RE.exec(_match);
					var matched = {};
					if(m[1]) matched.method = m[1].toLowerCase();
					if(m[2]) matched.host = m[2];
					matched.path = !m[3] ? '/' : m[3]==='*' ? '*' : '/' + m[3];
					match(matched, _request)
						.then(function(value){
							resolve(['string', matched, requestPath]);
						})
						.catch(function(error){
							reject(['string', error[1], error[2], error[3]]);
						});
				}
				break;
			default:
				reject(['unknown', 'unknown', 'unknown', 'unknown']);
				break;
		}
	});
	return promise;
};

var order = module.exports.order = function(_order, _middleId){
	switch(of(_order)){
		case 'array':
			return _order.some(function(o){
				return order(o, _middleId)===1;
			}) ? 1 : 0;
		case 'string':
			return (_order.toLowerCase()===_middleId.toLowerCase()) ? 1 : 0;
	}
	throw '[_middle.order]: order unknown';
};

var orderCheck = module.exports.orderCheck = function(_order, _ordered){
	return !_order.some(function(o){
		return _ordered.indexOf(o)==-1;
	});
};
