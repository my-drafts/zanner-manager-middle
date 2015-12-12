
var pf = require('util').format;
var logger = require('zanner-logger')('middleManager');
var of = require('zanner-typeof').of;
var middle = require('./middle');

var middleManager = module.exports = function(_core, _log){
	var self = this;
	var items = self._items = [];

	var log = function(){
		(_log ? _log : logger.log).apply(self, arguments);
	};

	// core for middleManager
	if(!of(_core, 'object')){
		log('error', '[middleManager.constructor]: CORE is undefined');
		throw pf('Error [middleManager.constructor]: CORE is undefined');
	}
	this._core = _core;
	this.core = function(){
		return _core;
	};

	// count for middleManager
	this.count = function(){
		return items.length;
	};

	// build for middleManager
	this.build = function(id, execute, match, order, alias){
		if(of(id, 'object')){
			var _of = 'function';
			execute = of(execute, _of) ? execute : of(id.execute, _of) ? id.execute : of(id.e, _of) ? id.e : undefined;
			var _of = ['function', 'regexp', 'string', 'array', 'object'];
			match = of(match, _of) ? match : of(id.match, _of) ? id.match : of(id.m, _of) ? id.m : undefined;
			var _of = 'array';
			order = of(order, _of) ? order : of(id.order, _of) ? id.order : of(id.o, _of) ? id.o : undefined;
			var _of = 'object';
			alias = of(alias, _of) ? alias : of(id.alias, _of) ? id.alias : of(id.a, _of) ? id.a : undefined;
			var _of = 'string';
			id = of(id.id, _of) ? id.id : undefined;
		}
		log('debug', 'build(id:"%s", match:"%s", order:"%s", alias:{%s})', id, match, order, of(alias, 'object') ? Object.keys(alias) : '');
		return new middle(_log, self, id, execute, match, order, alias);
	};

	// done for middleManager: reordering after all set's & check requirements
	this.done = function(){
		log('debug', 'done');
		if(middleManagerOrder(items)===true) log('debug', 'done ordering');
		if(middleManagerOrderCheck(items)===true) log('debug', 'done dependence check');
	};

	// get for middleManager
	this.get = function(id){
		var result = middleManagerGet(items, id);
		log('debug', 'get("%s") -> %j', id, result ? 'ok' : 'undefined');
		return result;
	};

	// IDs for middleManager
	this.ids = function(){
		var result = middleManagerIds(items);
		log('debug', 'ids() -> %j', result);
		return result;
	};

	// index for middleManager
	this.index = function(id){
		var result = middleManagerIndex(items, id);
		log('debug', 'index("%s") -> %j', id, result);
		return result;
	};

	// run for middleManager
	this.run = function(z, request, response){
		var runPrepare = function(next){
			next(null, z, request, response);
		};
		var runItem = function(itemIndex){
			var item = items[itemIndex];
			return function(z, request, response, next){
				middleManagerRunItem(item, z, request, response, next);
			};
		};
		return [runPrepare].concat(middleManagerMatch(items, z, request, response).map(runItem));
	};

	// set for middleManager
	this.set = function(middleItem){
		var result = middleManagerSet(items, middleItem);
		switch(of(result)){
			case 'number':
				log('debug', 'set(id:"%s")', middleItem.id());
				return result;
			case 'boolean':
				if(result!==false) break;
				log('warning', 'set(id:"%s"): middle already exists', middleItem.id());
				return false;
			case 'undefined':
				log('error', 'set(%j): not middle given', middleItem);
				return undefined;
		}
		log('error', 'set(%j): unknown', middleItem);
		return undefined;
	};

	// storeAlias for middleManager: alias register
	this.storeAlias = function(_id, _action){
		log('debug', 'storeAlias("%s")', _id);
		var item = middleManagerGet(items, _id);
		var aliases = item ? item.alias() : [];
		for(var index in aliases){
			_action({
				name: aliases[index],
				run: function(_arguments){
					return middleManagerAliasApply(items, _id, aliases[index], _arguments, log);
				},
				type: 'middle'
			});
		}
		log('info', 'storeAlias("%s"): done', _id);
	};

	// storeAliasUndo for middleManager: alias register undo
	this.storeAliasUndo = function(_id, _action){
		log('debug', 'storeAliasUndo("%s")', _id);
		var item = middleManagerGet(items, _id);
		var aliases = item ? item.alias() : [];
		for(var index in aliases){
			_action(aliases[index]);
		}
		log('info', 'storeAliasUndo("%s"): done', _id);
	};

	// unset for middleManager
	this.unset = function(id){
		log('debug', 'unset("%s")', id);
		return middleManagerUnset(items, id);
	};
};

middleManager.prototype.inspect = function(depth){
	return pf('middleManager(%j)', this.ids());
};



var middleManagerAliasApply = function(_items, _id, _name, _arguments, _log){
	try{
		var item = middleManagerGet(_items, _id);
		_log('debug', 'alias(id:"%s", name:"%s", args:%j)', _id, _name, _arguments);
		var result = item ? item.alias(_name).apply(item, _arguments) : 'id not found';
		_log('info', 'alias(id:"%s", name:"%s", args:%j) -> %j', _id, _name, _arguments, result);
		return result;
	}
	catch (e){
		_log('warning', 'alias(id:"%s", name:"%s", args:%j): unknown exception %j', _id, _name, _arguments, e);
		return undefined;
	}
};

var middleManagerGet = function(_items, _id){
	return _items.find(function(item){
		return item.id()==_id;
	});
};

var middleManagerIds = function(_items){
	return Object.keys(_items).map(function(index){
		return _items[index].id();
	});
};

var middleManagerIndex = function(_items, _id){
	return Object.keys(_items).find(function(index){
		return _items[index].id()==_id;
	});
};

var middleManagerMatch = function(_items, _z, _request, _response){
	return Object.keys(_items).filter(function(index){
		return _items[index].match(_z, _request, _response);
	});
};

var middleManagerOrder = function(_items){
	/*
	 *  ab | ba -> return    ab | ba -> return    ab | ba -> return
	 *  -1 | -1 -> error      0 | -1 ->  1         1 | -1 ->  1
	 *  -1 |  0 -> -1         0 |  0 ->  0         1 |  0 ->  1
	 *  -1 |  1 -> -1         0 |  1 -> -1         1 |  1 -> error
	 *
	 *  ab | ba -> return    ab | ba -> return
	 *   0 |  0 ->  0         1 |  0 ->  1
	 *   0 |  1 -> -1         1 |  1 ->  0 (error)
	 */
	var compareOrders = function(ab, ba, a, b){
		if(ab<ba) return -1;
		else if(ab>ba) return 1;
		else if(ab==ba && ab==0)return 0;
		else throw pf('[middleManagerOrder]: id:("%s", "%s")', a, b);
	};
	var itemsCompre = function(_items, i, j){
		var a = _items[i], b = _items[j];
		return compareOrders(a.order(b.id()), b.order(a.id()), a.id(), b.id());
	};
	var itemsSwap = function(_items, i, j){
		var item = _items[i];
		_items[i] = _items[j];
		_items[j] = item;
	};
	for(var i=0; i<_items.length; i++)
		for(var j=0; j<_items.length; j++)
			if(i==j) continue;
			else if(itemsCompre(_items, i, j)<0) itemsSwap(_items, i, j);
	return true;
};

var middleManagerOrderCheck = function(_items){
	var ordered = [];
	for(var i=0; i<_items.length; i++){
		var item = _items[i], id = item.id();
		if(item.orderCheck(ordered)) ordered.push(id);
		else throw pf('[middleManagerOrderCheck]: not all dependence set for (id:"%s")', id);
	}
	return true;
};

var middleManagerRunItem = function(_item, _z, _request, _response, _next){
	var next = function(err, z){
		//console.log(_item.id()); // !!!
		_next(err, Object.assign({}, _z, of(z, 'object') ? z : {}), _request, _response);
	};
	// execute CALLS CALLBACK(error, z) or RETURNS NEW Z-OBJECT as result or throw error
	try{
		var result = _item.execute(_z, _request, _response, next);
		if(of(result, 'object')) next(null, result);
		else if(result===true) next(null);
	}
	catch (e){
		next(e);
	}
};

var middleManagerSet = function(_items, _value){
	if(!(_value instanceof middle)) return undefined;
	else if(_items.some(function(item){return item.id()==_value.id();})) return false;
	else return _items.push(_value);
};

var middleManagerUnset = function(_items, _id){
	var index = middleManagerIndex(_items, _id);
	if(index!=-1) delete _items[index];
};
