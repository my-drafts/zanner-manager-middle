
var pu = require('url').parse;
var of = require('zanner-typeof').of;

var matchCompare = function(_match, _value, _compare){
	if(!of(_compare, 'function')){
		throw '[_middle.matchCompare]: compare not function';
	}
	switch(of(_match)){
		case 'array':  return _match.some(function(m){return matchCompare(m, _value, _compare);});
		case 'regexp': return _match.test(_value);
		case 'string': return !!_compare(_match, _value);
	}
	return false;
};

var matchEqual = function(_match, _value){
	return matchCompare(_match, _value, function(m, v){
		return m==='*' || m===v;
	});
};

var matchLike = function(_match, _value){
	return matchCompare(_match, _value, function(m, v){
		return m==='*' || v.indexOf(m, 0)!=-1;
	});
};

var matchLLike = function(_match, _value){
	return matchCompare(_match, _value, function(m, v){
		return m==='*' || v.indexOf(m, 0)==0;
	});
};

var match = module.exports.match = function(_match, _request){
	switch(of(_match)){
		case 'array':
			return _match.some(function(m){
				return match(m, _request);
			});
		case 'boolean':
			return _match;
		case 'object':
			var requestMethod = _request.method.toLowerCase();
			if('method' in _match){
				if(!matchEqual(_match.method, requestMethod)) break;
			}
			else if('m' in _match){
				if(!matchEqual(_match.m, requestMethod)) break;
			}
			var requestHost = pu(_request).hostname;
			if('host' in _match){
				if(!matchEqual(_match.host, requestHost)) break;
			}
			else if('h' in _match){
				if(!matchEqual(_match.h, requestHost)) break;
			}
			var requestPath = pu(_request).pathname;
			if('path' in _match){
				if(!matchLLike(_match.path, requestPath)) break;
			}
			else if('p' in _match){
				if(!matchLLike(_match.p, requestPath)) break;
			}
			return true;
		case 'regexp':
			var requestPath = pu(_request).pathname;
			var result = _match.exec(requestPath);
			return result && (result.index==0);
		case 'string':
			var requestPath = pu(_request).pathname;
			// get://host1.host2.host3.host4/path1/path2/path3/path4
			var RE = /^(?:([\w]+|[\*])[\:])?(?:[\/]{2}([\w\d\:\.\_\-]+|[\*]))?(?:[\/]{1}([^\/]+(?:[\/][^\/]+)*|[\*])?)?$/i;
			if(_match==='') break;
			else if(_match==='*') return true;
			else if(_match===requestPath) return true;
			else if(requestPath.indexOf(_match, 0)==0) return true;
			else if(RE.test(_match)){
				var m = RE.exec(_match);
				var matched = {};
				if(m[1]) matched.method = m[1].toLowerCase();
				if(m[2]) matched.host = m[2];
				matched.path = !m[3] ? '/' : m[3]==='*' ? '*' : '/' + m[3];
				return match(matched, _request);
			}
			break;
	}
	return false;
};

var order = module.exports.order = function(_order, _middleId){
	switch(of(_order)){
		case 'array':
			return _order.some(function(o){
				return order(o, _middleId)==1;
			}) ? 1 : 0;
		case 'string':
			return _order.toLowerCase()==_middleId.toLowerCase() ? 1 : 0;
	}
	throw 'Error [_middle.order]: order unknown';
};

var orderCheck = module.exports.orderCheck = function(_order, _ordered){
	return !_order.some(function(o){ return _ordered.indexOf(o)==-1; });
};
