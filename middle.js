
var pu = require('url').parse;
var pf = require('util').format;
var uis = require('util').inspect;
var of = require('zanner-typeof').of;
var logger = require('zanner-logger')('middle');
var _middle = require('./_middle');

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
			return _middle.match(__match, request);
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
		var result = _middle.order(_order, middleId);
		log('info', 'order("%s"), middle("%s") -> %j', self.id(), middleId, result);
		return result;
	};

	// orderCheck for middle
	// orderCheck -> return (bool){ true ( all requirements ok ) | false ( not all ) };
	this.orderCheck = function(ordered){
		log('debug', 'ordered("%s")', self.id());
		var result = _middle.orderCheck(_order, ordered);
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
