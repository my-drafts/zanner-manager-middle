/**/
var http = require('http');
var _middle = require('../_middle');

http.createServer(function(req, res){
	_middle.match('/a', req)
		.then(function(value){
			console.log('then: ', value);
			res.end('1');
		})
		.catch(function(error){
			console.log('catch: ', error);
			res.end('2');
		});
}).listen(3001);
/**/

/*
var middleManager = require('../');

var core = {name: 'core'}, log = undefined;
var mm = new middleManager(core, log);

console.log(mm.core());
var m1 = mm.build('m1', function(z, req, res, next){}, '*', [], {})
var m2 = mm.build('m2', function(z, req, res, next){}, '*', [], {})
var m3 = mm.build('m1', function(z, req, res, next){}, '*', [], {})
console.log(mm.set(m1));
console.log(mm.set(m2));
console.log(mm.set(m3));
console.log(mm.count());
console.log(mm.get('m1'));
console.log(mm);
*/
