
var pu = require('url').parse;
var pf = require('util').format;
var uis = require('util').inspect;
var of = require('zanner-typeof').of;
var logger = require('zanner-logger')('middle');

var middle = module.exports = function(_log, _manager, _id, _execute, _match, _order, _alias){
	var self = this;

	var log = function(){
		(_log ? _log : logger.log).apply(self, arguments);
	};

	// manager for middle
	if(!of(_manager, 'object')){
		log('error', '[middle.constructor]: MANAGER is undefined');
		throw pf('Error [middle.constructor]: MANAGER is undefined');
	}
	this._manager = _manager;
	this.manager = function(){
		return _manager;
	};

	// id for middle
	if(!of(_id, 'string')){
		log('error', '[middle.constructor]: ID is undefined');
		throw pf('Error [middle.constructor]: ID is undefined');
	}
	else _id = String(_id).toLowerCase();
	this._id = _id;
	this.id = function(){
		return _id;
	};

	// execute for middle
	// execute -> next( error, z, request, response );
	if(!of(_execute, 'function')){
		log('error', '[middle.constructor]: EXECUTE is undefined for id:"%s"', self.id());
		throw pf('Error [middle.constructor]: EXECUTE is undefined for id:"%s"', self.id());
	}
	this.execute = function(z, request, response, next){
		log('debug', 'execute("%s")', self.id());
		var result = _execute.apply(self, [z, request, response, next]);
		log('info', 'execute("%s") -> %s', self.id(), uis(result, {depth: 0}));
		return result;
	};

	// match for middle
	// match -> return (bool){ true | false };
	if(!of(_match, 'function')){
		var __match = _match;
		_match = function(z, request, response){
			return middleMatch(__match, request);
		};
	}
	this.match = function(z, request, response){
		log('debug', 'match("%s")', self.id());
		var result = _match.apply(self, [z, request, response]);
		log('info', 'match("%s") -> %s', self.id(), result);
		return result;
	};

	// order for middle
	// order -> return (int){ 1 ( this < id ) | 0 ( this > id ) };
	_order = of(_order, 'array') ? _order : of(_order, 'string') ? [_order] : [];
	this.order = function(middleId){
		log('debug', 'order("%s")', self.id());
		var result = middleOrder(_order, middleId);
		log('info', 'order("%s"), middle("%s") -> %j', self.id(), middleId, result);
		return result;
	};

	// orderCheck for middle
	// orderCheck -> return (bool){ true ( all requirements ok ) | false ( not all ) };
	this.orderCheck = function(ordered){
		log('debug', 'ordered("%s")', self.id());
		var result = middleOrderCheck(_order, ordered);
		log('info', 'ordered("%s") -> %j', self.id(), result);
		return result;
	};

	// alias for middle
	_alias = !of(_alias, 'object') ? {} : _alias;
	this.alias = function(name){
		return of(name, 'undefined') ? Object.keys(_alias) : (name in _alias) ? _alias[name] : undefined;
	};
};

middle.prototype.inspect = function(depth){
	return pf('middle("%s",%j)', this.id(), this.alias());
};



var middleMatchCompare = function(_match, _value, _compare){
	if(!of(_compare, 'function')){
		throw '[middleMatchCompare]: compare not function';
	}
	switch(of(_match)){
		case 'array':  return _match.some(function(m){return middleMatchCompare(m, _value, _compare);});
		case 'regexp': return _match.test(_value);
		case 'string': return !!_compare(_match, _value);
	}
	return false;
};

var middleMatchEqual = function(_match, _value){
	return middleMatchCompare(_match, _value, function(m, v){
		return m==='*' || m===v;
	});
};

var middleMatchLike = function(_match, _value){
	return middleMatchCompare(_match, _value, function(m, v){
		return m==='*' || v.indexOf(m, 0)!=-1;
	});
};

var middleMatchLLike = function(_match, _value){
	return middleMatchCompare(_match, _value, function(m, v){
		return m==='*' || v.indexOf(m, 0)==0;
	});
};

var middleMatch = function(_match, _request){
	switch(of(_match)){
		case 'array':
			return _match.some(function(m){
				return middleMatch(m, _request);
			});
		case 'boolean':
			return _match;
		case 'object':
			var requestMethod = _request.method.toLowerCase();
			if('method' in _match){
				if(!middleMatchEqual(_match.method, requestMethod)) break;
			}
			else if('m' in _match){
				if(!middleMatchEqual(_match.m, requestMethod)) break;
			}
			var requestHost = pu(_request).hostname;
			if('host' in _match){
				if(!middleMatchEqual(_match.host, requestHost)) break;
			}
			else if('h' in _match){
				if(!middleMatchEqual(_match.h, requestHost)) break;
			}
			var requestPath = pu(_request).pathname;
			if('path' in _match){
				if(!middleMatchLLike(_match.path, requestPath)) break;
			}
			else if('p' in _match){
				if(!middleMatchLLike(_match.p, requestPath)) break;
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
				return middleMatch(matched, _request);
			}
			break;
	}
	return false;
};

var middleOrder = function(_order, _middleId){
	switch(of(_order)){
		case 'array':
			return _order.some(function(o){
				return middleOrder(o, _middleId)==1;
			}) ? 1 : 0;
		case 'string':
			return _order.toLowerCase()==_middleId.toLowerCase() ? 1 : 0;
	}
	throw 'Error [middleOrder]: order unknown';
};

var middleOrderCheck = function(_order, _ordered){
	return !_order.some(function(o){ return _ordered.indexOf(o)==-1; });
};
