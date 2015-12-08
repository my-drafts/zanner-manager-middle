
var pf = require('util').format;
var uis = require('util').inspect;
var of = require('zanner-typeof').typeOf;

var logger = require('zanner-logger')('middle');
var meta = require('./usefull').meta;

var middle = module.exports = function(_log, _manager, _id){
	var self = this;
	var ID = self._id = String(_id).toLowerCase();
	var MANAGER = self._manager = _manager;
	var log = self.log = function(){
		(_log ? _log : logger).log.apply(self, arguments);
	};

	if(!of(_manager, 'object')){
		log('error', 'In constructor MANAGER is undefined');
		throw pf('Error [middle.constructor]: MANAGER is undefined');
	}

	if(!of(_id, 'string')){
		log('error', 'IN constructor ID is undefined');
		throw pf('Error [middle.constructor]: ID is undefined');
	}

	// manager for middle
	self.manager = function(){
		return MANAGER;
	};

	// id for middle
	self.id = function(){
		return ID;
	};

	// execute -> next( error, request, response );
	// @overwrite
	self.execute = function(request, response, aliasCall, next){
		log('error', 'Execute not overloaded of "%s"', ID);
		throw pf('Error [middle.execute]: not overloaded of "%s"', ID);
	};

	// execute match -> return (bool){ true | false };
	// @overwrite
	self.match = function(request, response, aliasCall){
		log('error', 'Match not overloaded of "%s"', ID);
		throw pf('Error [middle.match]: not overloaded of "%s"', ID);
	};

	// execute order -> return (int){ 1 ( this < id ) | 0 ( this > id ) };
	// @overwrite
	self.order = function(id){
		log('error', 'Order not overloaded of "%s"', ID);
		throw pf('Error [middle.order]: not overloaded of "%s"', ID);
	};

	// execute ordered -> return (bool){ true ( all requirements ok ) | false ( not all ) };
	// @overwrite
	self.ordered = function(id){
		log('error', 'Ordered not overloaded of "%s"', ID);
		throw pf('Error [middle.ordered]: not overloaded of "%s"', ID);
	};
};

middle.prototype.one = function(_log, manager, id, execute, match, order, alias){
	var log = function(){
		(_log ? _log : logger).log.apply(self, arguments);
	};
	if(!of(execute, 'function')){
		log('error', 'Unknown execute for id:"%s" in one', id);
		throw pf('Error [middle.one]: execute for id:"%s" unknown', id);
	}
	if(!of(match, 'function')){
		var _match = match;
		match = function(request, response, aliasCall){
			return middleOneMatch(id, _match, request);
		};
	}
	order = of(order, 'array') ? order : of(order, 'string') ? [order] : [];
	alias = !of(alias, 'object') ? {} : alias;
	var m = new middle(_log, manager, id);
	m.execute = function(request, response, aliasCall, next){
		log('debug', 'execute("%s")', id);
		var result = execute.apply(m, [request, response, aliasCall, next]);
		log('info', 'execute("%s") -> %s', id, uis(result, {depth: 0}));
		return result;
	};
	m.match = function(request, response, aliasCall){
		log('debug', 'match("%s")', id);
		var result = match.apply(m, [request, response, aliasCall]);
		log('info', 'match("%s") -> %s', id, result);
		return result;
	};
	m.order = function(middleId){
		var result;
		if(middleId==undefined) result = order;
		else result = middleOneOrder.apply(m, [id, order, middleId]);
		log('info', 'order("%s"), middle("%s") -> %j', id, middleId, result);
		return result;
	};
	m.ordered = function(ordered){
		var result = middleOneOrdered.apply(m, [id, order, ordered]);
		log('info', 'ordered("%s") -> %j', id, result);
		return result;
	};
	m.alias = function(){
		return alias;
	};
	return m;
};

var middleOneMatch = function(id, match, request){
	switch(of(match)){
		case 'array':
			for(var index in match){
				if(middleOneMatch(id, match[index], request)) return true;
			}
		case 'boolean':
			return match==true;
		case 'object':
			var rm = of(request.z, 'object') && of(request.z.URL, 'object') ? request.z.URL : meta(request);
			if(('method' in match) && !middleOneMatchObjectEqual(match.method, rm.method)) return false;
			if(('m' in match) && !middleOneMatchObjectEqual(match.m, rm.method)) return false;
			if(('host' in match) && !middleOneMatchObjectEqual(match.host, rm.hostname)) return false;
			if(('h' in match) && !middleOneMatchObjectEqual(match.h, rm.hostname)) return false;
			if(('path' in match) && !middleOneMatchObjectLLike(match.path, rm.pathname)) return false;
			if(('p' in match) && !middleOneMatchObjectLLike(match.p, rm.pathname)) return false;
			return true;
		case 'regexp':
			var rm = of(request.z, 'object') && of(request.z.URL, 'object') ? request.z.URL : meta(request);
			var result = match.exec(rm.pathname);
			return result && (result.index==0);
		case 'string':
			var rm = of(request.z, 'object') && of(request.z.URL, 'object') ? request.z.URL : meta(request);
			// get://host1.host2.host3.host4/path1/path2/path3/path4
			var RE = /^(?:([\w]+|[\*])[\:])?(?:[\/]{2}([\w\.\_\-]+|[\*]))?(?:[\/]([^\/]+(?:[\/][^\/]+)*|[\*])?)?$/i;
			if(match==''){
				return false;
			}
			else if(rm.pathname.indexOf(match, 0)==0){
				return true;
			}
			else if(match=='*'){
				return true;
			}
			else if(RE.test(match)){
				var m = RE.exec(match);
				var matched = {};
				if(m[1]) matched.method = m[1];
				if(m[2]) matched.host = m[2];
				if(m[3]) matched.path = m[3]=='*' ? '*' : '/' + m[3];
				return middleOneMatch(id, matched, request);
			}
			return false;
	}
	return false;
};

var middleOneMatchObjectEqual = function(match, value){
	if(match=='*') return true;
	switch(of(match)){
		case 'array':
			if(!match.find(function(m){return (m=='*')||(m==value);})) return false;
		case 'regexp':
			if(!match.test(value)) return false;
		case 'string':
			if(!(match==value)) return false;
	}
	return true;
};

var middleOneMatchObjectLLike = function(match, value){
	if(match=='*') return true;
	switch(of(match)){
		case 'array':
			if(!match.find(function(m){return (m=='*')||(value.indexOf(m, 0)==0);})) return false;
		case 'regexp':
			if(!match.test(value)) return false;
		case 'string':
			if(!(value.indexOf(match, 0)==0)) return false;
	}
	return true;
};

var middleOneOrder = function(id, order, middleId){
	switch(of(order)){
		case 'array':
			for(var index in order){
				if(middleOneOrder(id, order[index], middleId)==1) return 1;
			}
			return 0;
		case 'string':
			return (order.toLowerCase()==middleId) ? 1 : 0;
		default:
			throw pf('Error [middleOneOrder]: order for id:"%s" unknown', id);
	}
};

var middleOneOrdered = function(id, order, ordered){
	for(var index in order){
		if(ordered.indexOf(order[index])==-1) return false;
	}
	return true;
};
