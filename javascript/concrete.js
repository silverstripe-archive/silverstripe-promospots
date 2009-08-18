/**
 * Very basic Class utility. Based on base and jquery.class.
 * 
 * Class definition: var Foo = Base.extend({ init: function(){ Constructor }; method_name: function(){ Method } });
 *
 * Inheritance: var Bar = Foo.extend({ method_name: function(){ this._super(); } });
 * 
 * new-less Constructor: new Foo(arg) <-same as-> Foo(arg)
 */  	
Base = (function(){
	
	var marker = {}, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

	// The base Class implementation (does nothing)
	Base = function(){};
 
	Base.addMethod = function(name, func) {
		var _super = this._super;
		if (_super && fnTest.test(func))	 {
			this.prototype[name] = function(){
				var tmp = this._super;
				this._super = _super[name];
				try {
					var ret = func.apply(this, arguments);
				}
				finally {
					this._super = tmp;
				}
				return ret;
			}
		}
		else this.prototype[name] = func;
	}
 
	// Create a new Class that inherits from this class
	Base.extend = function(prop) {
  	
		// The dummy class constructor
		var Kls = function() {
			if (arguments[0] === marker) return;
			
			if (this instanceof Kls) {
				if (this.init) this.init.apply(this, arguments);
			}
			else {
				var ret = new Kls(marker); if (ret.init) ret.init.apply(ret, arguments); return ret;
			}
		}
   
		Kls.constructor = Kls;
		Kls.extend = Base.extend;
		Kls.addMethod = Base.addMethod;
		Kls._super = this.prototype;
	
		Kls.prototype = new this(marker);
	
		// Copy the properties over onto the new prototype
		for (var name in prop) {
			if (typeof prop[name] == 'function') Kls.addMethod(name, prop[name]);
			else Kls.prototype[name] = prop;
		}
		
		return Kls;
	}; 

	return Base;
})();

(function($){

	var tokens = {
		UNICODE: /\\[0-9a-f]{1,6}(?:\r\n|[ \n\r\t\f])?/,
		ESCAPE: /(?:UNICODE)|\\[^\n\r\f0-9a-f]/,
		NONASCII: /[^\x00-\x7F]/,
		NMSTART: /[_a-z]|(?:NONASCII)|(?:ESCAPE)/,
		NMCHAR: /[_a-z0-9-]|(?:NONASCII)|(?:ESCAPE)/,
		IDENT: /-?(?:NMSTART)(?:NMCHAR)*/,
		
		NL: /\n|\r\n|\r|\f/,

		STRING: /(?:STRING1)|(?:STRING2)|(?:STRINGBARE)/,
		STRING1: /"(?:(?:ESCAPE)|\\(?:NL)|[^\n\r\f\"])*"/,
		STRING2: /'(?:(?:ESCAPE)|\\(?:NL)|[^\n\r\f\'])*'/,
		STRINGBARE: /(?:(?:ESCAPE)|\\(?:NL)|[^\n\r\f\]])*/,
		
		FUNCTION: /(?:IDENT)\(\)/,
		
		INTEGER: /[0-9]+/,
		
		WITHN: /([-+])?(INTEGER)?(n)\s*(?:([-+])\s*(INTEGER))?/,
		WITHOUTN: /([-+])?(INTEGER)/
	}
	
	var rx = {
		not: /:not\(/,
		not_end: /\)/,
		
 		tag: /((?:IDENT)|\*)/,
		id: /#(IDENT)/,
		cls: /\.(IDENT)/,
		attr: /\[\s*(IDENT)\s*(?:([^=]?=)\s*(STRING)\s*)?\]/,
		pseudo_el: /(?::(first-line|first-letter|before|after))|(?:::((?:FUNCTION)|(?:IDENT)))/,
		pseudo_cls_nth: /:nth-child\(\s*(?:(?:WITHN)|(?:WITHOUTN)|(odd|even))\s*\)/,
		pseudo_cls: /:(IDENT)/,

		comb: /\s*(\+|~|>)\s*|\s+/,
		comma: /\s*,\s*/,
		important: /\s+!important\s*$/
	}

	/* Replace placeholders with actual regex, and mark all as case insensitive */
	var token = /[A-Z][A-Z0-9]+/;
	for (var k in rx) {
		var src = rx[k].source;
		while (m = src.match(token)) src = src.replace(m[0], tokens[m[0]].source);
		rx[k] = new RegExp(src, 'gi');
	}

	/**
	 * A string that matches itself against regexii, and keeps track of how much of itself has been matched
	 */
	var ConsumableString = Base.extend({
		init: function(str) {
			this.str = str;
			this.pos = 0;
		},
		match: function(rx) {
			var m;
			rx.lastIndex = this.pos;
			if ((m = rx.exec(this.str)) && m.index == this.pos ) {
				this.pos = rx.lastIndex ? rx.lastIndex : this.str.length ;
				return m;
			}
			return null;
		},
		peek: function(rx) {
			var m;
			rx.lastIndex = this.pos;
			if ((m = rx.exec(this.str)) && m.index == this.pos ) return m;
			return null;
		},
		showpos: function() {
			return this.str.slice(0,this.pos)+'<HERE>' + this.str.slice(this.pos);
		},
		done: function() {
			return this.pos == this.str.length;
		}
	})
	
	/* A base class that all Selectors inherit off */
	var SelectorBase = Base.extend({});
	
	/**
	 * A class representing a Simple Selector, as per the CSS3 selector spec
	 */
	var SimpleSelector = SelectorBase.extend({
		init: function() {
			this.tag = null;
			this.id = null;
			this.classes = [];
			this.attrs = [];
			this.nots = [];
			this.pseudo_classes = [];
			this.pseudo_els = [];
		},
		parse: function(selector) {
			var m;
			
			/* Pull out the initial tag first, if there is one */
			if (m = selector.match(rx.tag)) this.tag = m[1];
			
			/* Then for each selection type, try and find a match */
			do {
				if (m = selector.match(rx.not)) {
					this.nots[this.nots.length] = SelectorsGroup().parse(selector)
					if (!(m = selector.match(rx.not_end))) {
						throw 'Invalid :not term in selector';
					}
				}
				else if (m = selector.match(rx.id))         this.id = m[1];
				else if (m = selector.match(rx.cls))        this.classes[this.classes.length] = m[1];
				else if (m = selector.match(rx.attr))       this.attrs[this.attrs.length] = [ m[1], m[2], m[3] ];
				else if (m = selector.match(rx.pseudo_el))  this.pseudo_els[this.pseudo_els.length] = m[1] || m[2];
				else if (m = selector.match(rx.pseudo_cls_nth)) {
					if (m[3]) {
						var a = parseInt((m[1]||'')+(m[2]||'1'));
						var b = parseInt((m[4]||'')+(m[5]||'0'));
					}
					else {
						var a = m[8] ? 2 : 0;
						var b = m[8] ? (4-m[8].length) : parseInt((m[6]||'')+m[7]);
					}
					this.pseudo_classes[this.pseudo_classes.length] = ['nth-child', [a, b]];
				}
				else if (m = selector.match(rx.pseudo_cls)) this.pseudo_classes[this.pseudo_classes.length] = [m[1]];
				
			} while(m && !selector.done());
			
			return this;
		}
	})

	/**
	 * A class representing a Selector, as per the CSS3 selector spec
	 */
	var Selector = SelectorBase.extend({ 
		init: function(){
			this.parts = [];
		},
		parse: function(cons){
			this.parts[this.parts.length] = SimpleSelector().parse(cons);
			
			while (!cons.done() && !cons.peek(rx.comma) && (m = cons.match(rx.comb))) {
				this.parts[this.parts.length] = m[1] || ' ';
				this.parts[this.parts.length] = SimpleSelector().parse(cons);
			}
			
			return this.parts.length == 1 ? this.parts[0] : this;
		}
	});
	
	/**
	 * A class representing a sequence of selectors, as per the CSS3 selector spec
	 */
	var SelectorsGroup = SelectorBase.extend({ 
		init: function(){
			this.parts = [];
		},
		parse: function(cons){
			this.parts[this.parts.length] = Selector().parse(cons);
			
			while (!cons.done() && (m = cons.match(rx.comma))) {
				this.parts[this.parts.length] = Selector().parse(cons);
			}
			
			return this.parts.length == 1 ? this.parts[0] : this;
		}
	});

	
	$.selector = function(s){
		var cons = ConsumableString(s);
		var res = SelectorsGroup().parse(cons); 
		
		res.selector = s;
		
		if (!cons.done()) throw 'Could not parse selector - ' + cons.showpos() ;
		else return res;
	}
	
	$.selector.SelectorBase = SelectorBase;
	$.selector.SimpleSelector = SimpleSelector;
	$.selector.Selector = Selector;
	$.selector.SelectorsGroup = SelectorsGroup;
	
})(jQuery);

(function($){

	$.selector.SimpleSelector.addMethod('specifity', function() {
		if (this.spec) return this.spec;
		
		var spec = [
			this.id ? 1 : 0, 
			this.classes.length + this.attrs.length + this.pseudo_classes.length, 
			((this.tag && this.tag != '*') ? 1 : 0) + this.pseudo_els.length
		];
		$.each(this.nots, function(i,not){
			var ns = not.specifity(); spec[0] += ns[0]; spec[1] += ns[1]; spec[2] += ns[2]; 
		});
		
		return this.spec = spec;
	})

	$.selector.Selector.addMethod('specifity', function(){
		if (this.spec) return this.spec;
		
		var spec = [0,0,0];
		$.each(this.parts, function(i,part){
			if (i%2) return;
			var ps = part.specifity(); spec[0] += ps[0]; spec[1] += ps[1]; spec[2] += ps[2]; 
		});
		
		return this.spec = spec;	
	})
	
	$.selector.SelectorsGroup.addMethod('specifity', function(){
		if (this.spec) return this.spec;
		
		var spec = [0,0,0];
		$.each(this.parts, function(i,part){
			var ps = part.specifity(); spec[0] += ps[0]; spec[1] += ps[1]; spec[2] += ps[2]; 
		});
		
		return this.spec = spec;	
	})
	
	
})(jQuery);

/*
This attempts to do the opposite of Sizzle.
Sizzle is good for finding elements for a selector, but not so good for telling if an individual element matches a selector
*/
(function($){
	
	/**** CAPABILITY TESTS ****/
	var div = document.createElement('div');
	div.innerHTML = '<form id="test"><input name="id" type="text"/></form>';
	
	// In IE 6-7, getAttribute often does the wrong thing (returns similar to el.attr), so we need to use getAttributeNode on that browser
	var getAttributeDodgy = div.firstChild.getAttribute('id') !== 'test';
	
	// Does browser support Element.firstElementChild, Element.previousElementSibling, etc.
	var hasElementTraversal = div.firstElementChild && div.firstElementChild.tagName == 'FORM';
	
	// Does browser support Element.children
	var hasChildren = div.children && div.children[0].tagName == 'FORM';

	var FUNC_IN  = /^\s*function\s*\([^)]*\)\s*{/;
	var FUNC_OUT = /}\s*$/;

	var funcToString = function(f) {
		return (''+f).replace(FUNC_IN,'').replace(FUNC_OUT,'');
	}

	// Can we use Function#toString ?
	try {
		var testFunc = function(){ return 'good' };
		if ((new Function('',funcToString(testFunc)))() != 'good') funcToString = false;
	}
	catch(e) { funcToString = false; console.log(e.message);/*pass*/ }

	/**** INTRO ****/
	
	var GOOD = /GOOD/g;
	var BAD = /BAD/g;
	
	var STARTS_WITH_QUOTES = /^['"]/g;
	
	var join = function(js) {
		return js.join('\n');
	}
	
	var join_complex = function(js) {
		code = new String(js.join('\n')); // String objects can have properties set. strings can't
		code.complex = true;
		return code;
	}
	
	/**** ATTRIBUTE ACCESSORS ****/
	
	var getAttr;
	
	// Good browsers
	if (!getAttributeDodgy) {
		getAttr = function(attr){ return 'var _'+attr+' = el.getAttribute("'+attr+'");' ; }
	}
	// IE 6, 7
	else {
		// On IE 6 + 7, getAttribute still has to be called with DOM property mirror name, not attribute name. Map attributes to those names
		var getAttrIEMap = { 'class': 'className', 'for': 'htmlFor' };
		
		getAttr = function(attr) {
			var ieattr = getAttrIEMap[attr] || attr;
			return 'var _'+attr+' = el.getAttribute("'+ieattr+'",2) || (el.getAttributeNode("'+attr+'")||{}).nodeValue;';
		}
	}
	
	/**** ATTRIBUTE COMPARITORS ****/
	
	var attrchecks = {
		'-':  '!_K',
		'=':  '_K != "V"',
		'!=': '_K == "V"',
		'~=': '__K.indexOf(" V ") == -1',
		'^=': '!_K || _K.indexOf("V") != 0',
		'*=': '!_K || _K.indexOf("V") == -1',
		'$=': '!_K || _K.substr(_K.length-"V".length) != "V"'
	}

	/**** STATE TRACKER ****/
	
	var State = $.selector.State = Base.extend({
		init: function(){ 
			this.reset(); 
		},
		reset: function() {
			this.attrs = {}; this.wsattrs = {};
		},

		prev: function(){
			this.reset();
			if (hasElementTraversal) return 'el = el.previousElementSibling';
			return 'while((el = el.previousSibling) && el.nodeType != 1) {}';
		},
		next: function() {
			this.reset();
			if (hasElementTraversal) return 'el = el.nextElementSibling';
			return 'while((el = el.nextSibling) && el.nodeType != 1) {}';
		},
		prevLoop: function(body){
			this.reset();
			if (hasElementTraversal) return join([ 'while(el = el.previousElementSibling){', body]);
			return join([
				'while(el = el.previousSibling){',
					'if (el.nodeType != 1) continue;',
					body,
			]);
		},
		parent: function() {
			this.reset();
			return 'el = el.parentNode;';
		},
		parentLoop: function(body) {
			this.reset();
			return join([
				'while((el = el.parentNode) && el.nodeType == 1){',
					body,
				'}'
			]);
		},
		
		uses_attr: function(attr) {
			if (this.attrs[attr]) return;
			this.attrs[attr] = true;
			return getAttr(attr); 
		},
		uses_wsattr: function(attr) {
			if (this.wsattrs[attr]) return;
			this.wsattrs[attr] = true;
			return join([this.uses_attr(attr), 'var __'+attr+' = " "+_'+attr+'+" ";']); 
		},
		
		save: function(lbl) {
			return 'var el'+lbl+' = el;';
		},
		restore: function(lbl) {
			this.reset();
			return 'el = el'+lbl+';';
		}
	});
	
	/**** PSEUDO-CLASS DETAILS ****/
	
	var pseudoclschecks = {
		'first-child': join([
			'var cel = el;',
			'while(cel = cel.previousSibling){ if (cel.nodeType === 1) BAD; }',
		]),
		'last-child': join([
			'var cel = el;',
			'while(cel = cel.nextSibling){ if (cel.nodeType === 1) BAD; }'
		]),
		'nth-child': function(a,b) {
			var get_i = join([
				'var i = 1, cel = el;',
				'while(cel = cel.previousSibling){',
					'if (cel.nodeType === 1) i++;',
				'}',
			]);
			
			if (a == 0) return join([
				get_i,
				'if (i- '+b+' != 0) BAD;'
			]);
			else if (b == 0 && a >= 0) return join([
				get_i,
				'if (i%'+a+' != 0 || i/'+a+' < 0) BAD;'
			]);
			else if (b == 0 && a < 0) return join([
				'BAD;'
			]);
			else return join([
				get_i,
				'if ((i- '+b+')%'+a+' != 0 || (i- '+b+')/'+a+' < 0) BAD;'
			]);
		}
	};
	
	// Needs to refence contents of object, so must be injected after definition
	pseudoclschecks['only-child'] = join([
		pseudoclschecks['first-child'],
		pseudoclschecks['last-child']
	]);
	
	/**** SimpleSelector ****/
	
	$.selector.SimpleSelector.addMethod('compile', function(el) {
		var js = [];
		
		/* Check against element name */			
		if (this.tag && this.tag != '*') {
			js[js.length] = 'if (el.tagName != "'+this.tag.toUpperCase()+'") BAD;';
		}

		/* Check against ID */
		if (this.id) {
			js[js.length] = el.uses_attr('id');
			js[js.length] = 'if (_id !== "'+this.id+'") BAD;';
		}
		
		/* Build className checking variable */
		if (this.classes.length) {
			js[js.length] = el.uses_wsattr('class');
			
			/* Check against class names */
			$.each(this.classes, function(i, cls){
				js[js.length] = 'if (__class.indexOf(" '+cls+' ") == -1) BAD;';
			})
		}
		
		/* Check against attributes */
		$.each(this.attrs, function(i, attr){
			js[js.length] = (attr[1] == '~=') ? el.uses_wsattr(attr[0]) : el.uses_attr(attr[0]);
			var check = attrchecks[ attr[1] || '-' ];
			check = check.replace( /K/g, attr[0]).replace( /V/g, attr[2] && attr[2].match(STARTS_WITH_QUOTES) ? attr[2].slice(1,-1) : attr[2] );
			js[js.length] = 'if ('+check+') BAD;';
		});
		
		/* Check against nots */
		$.each(this.nots, function(i, not){
			var lbl = ++lbl_id;
			var func = join([
				'l'+lbl+':{',
					not.compile(el).replace(BAD, 'break l'+lbl).replace(GOOD, 'BAD'),
				'}'
			]);
			
			if (!(not instanceof $.selector.SimpleSelector)) func = join([
				el.save(lbl),
				func,
				el.restore(lbl)
			])
				
			js[js.length] = func;
		});
		
		/* Check against pseudo-classes */
		$.each(this.pseudo_classes, function(i, pscls){
			var check = pseudoclschecks[pscls[0]];
			if (check) {
				js[js.length] = ( typeof check == 'function' ? check.apply(this, pscls[1]) : check );
			}
			else if (check = $.find.selectors.filters[pscls[0]]) {
				if (funcToString) {
					js[js.length] = funcToString(check).replace(/elem/g,'el').replace(/return([^;]+);/,'if (!($1)) BAD;');
				}
				else {
					js[js.length] = 'if (!$.find.selectors.filters.'+pscls[0]+'(el)) BAD;'
				}
			}
		});
		
		js[js.length] = 'GOOD';
		
		/* Pass */
		return join(js);
	});
	
	var lbl_id = 0;
	/** Turns an compiled fragment into the first part of a combination */
	function as_subexpr(f) {
		if (f.complex)
			return join([
				'l'+(++lbl_id)+':{',
					f.replace(GOOD, 'break l'+lbl_id),
				'}',
			]);
		else
			return f.replace(GOOD, '');
	}
	
	var combines = {
		' ': function(el, f1, f2) {
			return join_complex([
				f2,
				'while(true){',
					el.parent(),
					'if (!el || el.nodeType !== 1) BAD;',
					f1.compile(el).replace(BAD, 'continue'),
				'}'
			]);
		},
		
		'>': function(el, f1, f2) {
			return join([
				f2,
				el.parent(),
				'if (!el || el.nodeType !== 1) BAD;',
				f1.compile(el)
			]);
		},
		
		'~': function(el, f1, f2) {
			return join_complex([
				f2,
				el.prevLoop(),
					f1.compile(el).replace(BAD, 'continue'),
				'}',
				'BAD;'
			]);
		},
		
		'+': function(el, f1, f2) {
			return join([
				f2,
				el.prev(),
				'if (!el) BAD;',
				f1.compile(el)
			]);
		}
	};
	
	$.selector.Selector.addMethod('compile', function(el) {
		l = this.parts.length;
		
		expr = this.parts[--l].compile(el);
		while (l) {
			combinator = this.parts[--l];
			expr = combines[combinator](el, this.parts[--l], as_subexpr(expr));
		}
		
		return expr;
	});

	$.selector.SelectorsGroup.addMethod('compile', function(el) {
		var expr = [], lbl = ++lbl_id;
		
		for (var i=0; i < this.parts.length; i++) {
			expr[expr.length] = join([
				i == 0 ? el.save(lbl) : el.restore(lbl), 
				'l'+lbl+'_'+i+':{',
					this.parts[i].compile(el).replace(BAD, 'break l'+lbl+'_'+i),
				'}'
			]);
		}
		
		expr[expr.length] = 'BAD;';
		return join(expr);
	});

	$.selector.SelectorBase.addMethod('matches', function(el){	
		this.matches = new Function('el', join([ 
			'if (!el) return false;',
			this.compile(new State()).replace(BAD, 'return false').replace(GOOD, 'return true')
		]));
		return this.matches(el);
	});
	
})(jQuery);

/*
 * Provides a per-node data store that is automatically cloned when dom node is clone() or cloneNode()'d.
 */

(function($){
 	var data_store = {};
 	var check_name = 'com.silverstripe:check_id';
 	
	var expando = 'data_id:';
	var id = 0;

	/**
	 * Clone a data object. Currently uses jQuery's deep copy routine
	 */
	var cloneData = function(data) {
		return $.extend(true, {}, data);
	}
 
	/**
	 * Set the data object for an element.
	 * Picks a new ID, sets the tracking attribute and value on the DOM node and stores data in the data_store
	 * 
	 * @param {jQuery selection} el - The element to store this data on
	 * @param {Object} data - The object to use as data, or undefined / null for an empty object
	 */
 	var setData = function(el, data) {
		if (!data) data = {};
		
		id += 1;
		var data_id = expando + id;
		
		el.attr('data', data_id); el.data(check_name, data_id);
		return data_store[data_id] = data;
	}
 
 
	/**
	 * Delete the data object for an element
	 * It's important this is called when the related element is deled, or memory could leak. We monkey-patch jQuery.removeData to make sure this happens
	 * @param {jQuery selection} el - The element to remove the data for
	 */
 	var clearData = function(el) {
		var data_id = el.attr('data');
		if (!data_id) return;
		
		el.removeAttr('data');
		// Only remove the data if this is the last element with a data reference to it. This is so removing an element
		// doesn't delete the data before any cloned elements have a chance to copy it
		if ($('[data='+data_id+']').length == 0) delete data_store[data_id];
	}
 
	/**
	 * Get the data object for an element
	 * Sets an empty data object if the element does not have one yet
	 * Clones the data object if the element it's attached to has been cloned
	 * @param {jQuery selection} el - The element to retrieve the data of
	 */
	var getData = function(el) {
		// If the data_id is missing, the element has no data
		var data_id = el.attr('data');
		if (!data_id) return setData(el);
		
		var check_id = el.data(check_name);
		if (!check_id || check_id != data_id) {
			// If the check_id is missing, the element has been cloned. So clone the data too
			var newdata = cloneData(data_store[data_id]); 
			setData(el, newdata);
			// If we were the last element holding on to a reference to that old data, delete it now that we're done with it
			if ($('[data='+data_id+']').length == 0) delete data_store[data_id];
			return newdata;
		}	
			
		// Otherwise, this element has some data, so return it
		return data_store[data_id];
	}

	$.dat = {};
	/**
	 * Check all data in data_store, removing any that are not longer referenced in the DOM
	 * Returns number of garbage-collected entries, for finding memory leaks 
	 */
	$.dat.vacuum = function() {
		var i = 0;
		for (var k in data_store) {
			if ($('[data='+k+']').length == 0) { delete data_store[k]; i++; }
		}
		return i;
	}
	/**
	 * Return count of items in data_store.
	 * Used in tests
	 */
	$.dat.size = function() {
		var i = 0;
		for (var k in data_store) i++;
		return i;
	}
	
	/**
	 * Get the data object for the current element
	 */
	$.fn.d = function(a){
		return getData(this.eq(0));
	};
	
	// Monkey patch removeData to also remove dat
	var removeData_without_dat = $.removeData
	$.removeData = function(elem, name) {
		if (!name) clearData($(elem));
		return removeData_without_dat.apply(this, arguments);
	}
	
 })(jQuery);
 
var console;

(function($) {	

	/** What to call to run a function 'soon'. Normally setTimeout, but for syncronous mode we override so soon === now */
	var runSoon = window.setTimeout;
	
	/** Stores a count of definitions, so that we can sort identical selectors by definition order */
	var rulecount = 0;

	/** Utility to optionally display warning messages depending on level */
	var warn = function(message, level) {
		if (level <= $.concrete.warningLevel && console && console.log) { 
			console.warn(message);
			if (console.trace) console.trace();
		}
	}

   /** A property definition */
	$.property = function(options) {
		if (this instanceof $.property) this.options = options;
		else return new $.property(options);
	}
	$.extend($.property, {
		/**
		 * Strings for how to cast a value to a specific type. Used in some nasty meta-programming stuff below to try and
		 * keep property access as fast as possible
		 */
		casters: {
			'int': 'Math.round(parseFloat(v));',
			'float': 'parseFloat(v);',
			'string': '""+v;'
		},
		
		getter: function(options) {
			options = options || {};
			
			if (options.initial === undefined) return function(){ return this.d()[arguments.callee.pname] };
			
			var getter = function(){ 
				var d = this.d(); var k = arguments.callee.pname;
				return d.hasOwnProperty(k) ? d[k] : (d[k] = arguments.callee.initial);
			};
			var v = options.initial;
			getter.initial = options.restrict ? eval($.property.casters[options.restrict]) : v;
			
			return getter;
		},
		
		setter: function(options){
			options = options || {};
			if (options.restrict) {
				var restrict = options.restrict;
				return new Function('v', 'return this.d()[arguments.callee.pname] = ' + $.property.casters[options.restrict]);
			}
			
			return function(v){ return this.d()[arguments.callee.pname] = v; }
		}
	});
	$.extend($.property.prototype, {
		getter: function(){
			return $.property.getter(this.options);
		},
		setter: function(){
			return $.property.setter(this.options);
		}
	});

	var Rule = Base.extend({
		init: function(selector, name) {
			this.selector = selector;
			this.specifity = selector.specifity();
			this.important = 0;
			this.name = name;
			this.rulecount = rulecount++;
		}
	});
	
	Rule.compare = function(a, b) {
		var as = a.specifity, bs = b.specifity;
		
		return (a.important - b.important) ||
		       (as[0] - bs[0]) ||
		       (as[1] - bs[1]) ||
		       (as[2] - bs[2]) ||
		       (a.rulecount - b.rulecount) ;
	}

	$.fn._super = function(){
		var rv, i = this.length;
		while (i--) {
			var el = this[0];
			rv = el.f(el, arguments, el.i);
		}
		return rv;
	}

	var namespaces = {};

	var Namespace = Base.extend({
		init: function(name){
			if (name && !name.match(/^[A-Za-z0-9.]+$/)) warn('Concrete namespace '+name+' is not formatted as period seperated identifiers', $.concrete.WARN_LEVEL_BESTPRACTISE);
			name = name || '__base';
			
			this.name = name;
			this.store = {};
			
			namespaces[name] = this;
			
			if (name == "__base") {
				this.injectee = $.fn
				this.$ = $;
			}
			else {
				// We're in a namespace, so we build a Class that subclasses the jQuery Object Class to inject namespace functions into
				var subfn = function(){};
				this.injectee = subfn.prototype = new $();
				
				// And then we provide an overriding $ that returns objects of our new Class, and an overriding pushStack to catch further selection building
				var bound$ = this.$ = function(a) {
					// Try the simple way first
					var jq = $.fn.init.apply(new subfn(), arguments);
					if (jq instanceof subfn) return jq;
					
					// That didn't return a bound object, so now we need to copy it
					var rv = new subfn();
					rv.selector = jq.selector; rv.context = jq.context; var i = rv.length = jq.length;
					while (i--) rv[i] = jq[i];
					return rv;
				}
				this.injectee.pushStack = function(elems, name, selector){
					var ret = bound$(elems);

					// Add the old object onto the stack (as a reference)
					ret.prevObject = this;
					ret.context = this.context;
					
					if ( name === "find" ) ret.selector = this.selector + (this.selector ? " " : "") + selector;
					else if ( name )       ret.selector = this.selector + "." + name + "(" + selector + ")";
					
					// Return the newly-formed element set
					return ret;
				}
				
				// Copy static functions through from $ to this.$ so e.g. $.ajax still works
				// @bug, @cantfix: Any class functions added to $ after this call won't get mirrored through 
				$.extend(this.$, $);
				
				// We override concrete to inject the name of this namespace when defining blocks inside this namespace
				var concrete_wrapper = this.injectee.concrete = function() {
					var args = arguments;
					
					if (!args[0] || typeof args[0] != 'string') { args = $.makeArray(args); args.unshift(name); }
					else if (args[0].charAt(0) != '.') args[0] = name+'.'+args[0];
					
					return $.fn.concrete.apply(this, args);
				}
				
				this.$.concrete = function() {
					concrete_wrapper.apply(null, arguments);
				}
			}
		},
		
		/**
		 * Returns a function that does selector matching against the function list for a function name
		 * Used by proxy for all calls, and by ctorProxy to handle _super calls
		 * @param {String} name - name of the function as passed in the construction object
		 * @param {String} funcprop - the property on the Rule object that gives the actual function to call
		 */
		one: function(name, funcprop) {
			var namespace = this;
			var funcs = this.store[name];
			
			var one = function(el, args, i){
				if (i === undefined) i = funcs.length;
				while (i--) {
					if (funcs[i].selector.matches(el)) {
						var ret, tmp_i = el.i, tmp_f = el.f;
						el.i = i; el.f = one;
						try { ret = funcs[i][funcprop].apply(namespace.$(el), args); }
						finally { el.i = tmp_i; el.f = tmp_f; }
						return ret;
					}
				}
			}
			
			return one;
		},
		
		/**
		 * A proxy is a function attached to a callable object (either the base jQuery.fn or a subspace object) which handles
		 * finding and calling the correct function for each member of the current jQuery context
		 * @param {String} name - name of the function as passed in the construction object
		 */
		build_proxy: function(name) {
			var one = this.one(name, 'func');
			
			var prxy = function() {
				var rv, ctx = $(this); 
				
				var i = ctx.length;
				while (i--) rv = one(ctx[i], arguments);
				return rv;
			};
			
			return prxy;
		},
		
		bind_proxy: function(selector, name, func) {
			var funcs = this.store[name] || (this.store[name] = []) ;
			
			var rule = funcs[funcs.length] = Rule(selector, name); rule.func = func;
			funcs.sort(Rule.compare);
			
			if (!this.injectee.hasOwnProperty(name)) {
				this.injectee[name] = this.build_proxy(name);
				this.injectee[name].concrete = true;
			}

			if (!this.injectee[name].concrete) {
				warn('Warning: Concrete function '+name+' clashes with regular jQuery function - concrete function will not be callable directly on jQuery object', $.concrete.WARN_LEVEL_IMPORTANT);
			}
		},
		
		bind_event: function(selector, name, func, event) {
			var funcs = this.store[name] || (this.store[name] = []) ;
			
			var rule = funcs[funcs.length] = Rule(selector, name); rule.func = func;
			funcs.sort(Rule.compare);
			
			if (!funcs.proxy) { 
				funcs.proxy = this.build_proxy(name);
				$(selector.selector).live(event, funcs.proxy);
			}
		},
		
		bind_condesc: function(selector, name, func) {
			var ctors = this.store.ctors || (this.store.ctors = []) ;
			
			var rule;
			for (var i = 0 ; i < ctors.length; i++) {
				if (ctors[i].selector.selector == selector.selector) {
					rule = ctors[i]; break;
				}
			}
			if (!rule) {
				rule = ctors[ctors.length] = Rule(selector, 'ctors');
				ctors.sort(Rule.compare);
			}
			
			rule[name] = func;
			
			if (!ctors[name+'proxy']) {
				var one = this.one('ctors', name);
				var namespace = this;
				
				var proxy = function(els, i, func) {
					var j = els.length;
					while (j--) {
						var el = els[j];
						
						var tmp_i = el.i, tmp_f = el.f;
						el.i = i; el.f = one;
						try { func.call(namespace.$(el)); }
						catch(e) { el.i = tmp_i; el.f = tmp_f; }					
					}
				}
				
				ctors[name+'proxy'] = proxy;
			}
		},
		
		add: function(selector, data) {
			var k, v, match, event;
			
			for (k in data) {
				v = data[k];
				
				if ($.isFunction(v) && v !== $.property) {
					if (k == 'onmatch' || k == 'onunmatch') {
						this.bind_condesc(selector, k, v);
					}
					else if (match = k.match(/^on(.*)/)) {
						event = match[1];
						
						if (!$.fn.liveHover && $.concrete.event_needs_extensions[event]) {
							warn('Event '+event+' requires live-extensions to function, which does not seem to be present', $.concrete.WARN_LEVEL_IMPORTANT);
						}
						else if (event == 'submit') {
							warn('Event submit not currently supported', $.concrete.WARN_LEVEL_IMPORTANT);
						}
						else if (event == 'focus' || event == 'blur') {
							warn('Event '+event+' not supported - use focusin / focusout instead', $.concrete.WARN_LEVEL_IMPORTANT);
						}
						
						this.bind_event(selector, k, v, event);
					}
					else {
						this.bind_proxy(selector, k, v);
					}
				}
				else {
					var g, s, p;

					if (k.charAt(0) != k.charAt(0).toUpperCase()) warn('Concrete property '+k+' does not start with a capital letter', $.concrete.WARN_LEVEL_BESTPRACTISE);
					
					if (v == $.property || v instanceof $.property) {
						g = v.getter(); s = v.setter();
					}
					else {
						p = $.property({initial: v}); g = p.getter(); s = p.setter(); 
					}
					
					g.pname = s.pname = k;
					this.bind_proxy(selector, k, g);
					this.bind_proxy(selector, 'set'+k, s);
				}
			}
		},
		
		has: function(ctx, name) {
			var rulelist = this.store[name];
			if (!rulelist) return false;
			
			/* We go forward this time, since low specifity is likely to knock out a bunch of elements quickly */
			for (var i = 0 ; i < rulelist.length; i++) {
				ctx = ctx.not(rulelist[i].selector);
				if (!ctx.length) return true;
			}
			return false;
		}
	});

	/**
	 * Main concrete function. Used for new definitions, calling into a namespace (or forcing the base namespace) and entering a using block
	 * 
	 */
	$.fn.concrete = function() {
		var i = 0;
		var selector = this.selector ? $.selector(this.selector) : null;
		
		var namespace = namespaces.__base || Namespace();
		if (typeof arguments[i] == 'string') {
			if (arguments[i].charAt('0') == '.') arguments[i] = arguments[i].substr(1);
			if (arguments[i]) namespace = namespaces[arguments[i]] || Namespace(arguments[i]);
			i++;
		}
		
		while (i < arguments.length) {
			var res = arguments[i];
			// If it's a function, call it - either it's a using block or it's a concrete definition builder
			if ($.isFunction(res)) {
				if (res.length != 1) warn('Function block inside concrete definition does not take $ argument properly', $.concrete.WARN_LEVEL_IMPORTANT);
				res = res.call(namespace.$(this), namespace.$);
			}
			//else if (namespace.name != '__base') warn('Raw object inside namespaced ('+namespace.name+') concrete definition - namespace lookup will not work properly', $.concrete.WARN_LEVEL_IMPORTANT);
				
			// Now if we still have a concrete definition object, inject it into namespace
			if (res) {
				if (selector) namespace.add(selector, res);
				else warn('Concrete block given to concrete call without selector. Make sure you call $(selector).concrete when defining blocks', $.concrete.WARN_LEVEL_IMPORTANT);
			}
			i++
		}
		
		return namespace.$(this);
	}
	
	$.concrete = function() {
		$.fn.concrete.apply(null, arguments);
	}
	
	/**
	 * A couple of utility functions for accessing the store outside of this closure, and for making things
	 * operate in a little more easy-to-test manner
	 */
	$.extend($.concrete, {
		
		/**
		 * Get all the namespaces. Usefull for introspection? Internal interface of Namespace not guaranteed consistant
		 */
		namespaces: function() { return namespaces; },
		
		/**
		 * Remove all concrete rules
		 */
		clear_all_rules: function() { 
			// Remove proxy functions
			for (var k in $.fn) { if ($.fn[k].concrete) delete $.fn[k] ; }
			// Remove namespaces, and start over again
			namespaces = [];
		},
		
		/**
		 * Make onmatch and onunmatch work in synchronous mode - that is, new elements will be detected immediately after
		 * the DOM manipulation that made them match. This is only really useful for during testing, since it's pretty slow
		 * (otherwise we'd make it the default).
		 */
		synchronous_mode: function() {
			if (check_id) clearTimeout(check_id); check_id = null;
			runSoon = function(func, delay){ func.call(this); return null; }
		},
		
		/**
		 * Trigger onmatch and onunmatch now - usefull for after DOM manipulation by methods other than through jQuery.
		 * Called automatically on document.ready
		 */
		triggerMatching: function() {
			matching();
		},
		
		WARN_LEVEL_NONE: 0,
		WARN_LEVEL_IMPORTANT: 1,
		WARN_LEVEL_BESTPRACTISE: 2,
		
		/** 
		 * Warning level. Set to a higher level to get warnings dumped to console.
		 */
		warningLevel: 0,
		
		/**
		 * These events need the live-extensions plugin
		 */
		event_needs_extensions: { mouseenter: true, mouseleave: true, change: true, focusin: true, focusout: true }
	});
	
	var check_id = null;

	/**
	 * Finds all the elements that now match a different rule (or have been removed) and call onmatch on onunmatch as appropriate
	 * 
	 * Because this has to scan the DOM, and is therefore fairly slow, this is normally triggered off a short timeout, so that
	 * a series of DOM manipulations will only trigger this once.
	 * 
	 * The downside of this is that things like:
	 *   $('#foo').addClass('tabs'); $('#foo').tabFunctionBar();
	 * won't work.
	 */
	function matching() {
		// For every namespace
		for (var k in namespaces) {
			// That has constructors or destructors
			var ctors = namespaces[k].store.ctors;
			if (ctors) {
			
				// Keep a record of elements that have matched already
				var matched = $([]), match, add, rem;
				// Stepping through each selector from most to least specific
				var j = ctors.length;
				while (j--) {
					// Build some quick-acccess variables
					var sel = ctors[j].selector.selector, ctor = ctors[j].onmatch; dtor = ctors[j].onunmatch;
					// Get the list of elements that match this selector, that haven't yet matched a more specific selector
					res = add = $(sel).not(matched);
					
					// If this selector has a list of elements it matched against last time					
					if (ctors[j].cache) {
						// Find the ones that are extra this time
						add = res.not(ctors[j].cache);
						// Find the ones that are gone this time
						rem = ctors[j].cache.not(res);
						// And call the desctructor on them
						if (rem.length && dtor) ctors.onunmatchproxy(rem, j, dtor);
					}
					
					// Call the constructor on the newly matched ones
					if (add.length && ctor) ctors.onmatchproxy(add, j, ctor);
					
					// Add these matched ones to the list tracking all elements matched so far
					matched = matched.add(res);
					// And remember this list of matching elements again this selector, so next matching we can find the unmatched ones
					ctors[j].cache = res;
				}
			}
		}
		
		check_id = null;
	}
	
	function registerMutateFunction() {
		$.each(arguments, function(i,func){
			var old = $.fn[func];
			$.fn[func] = function() {
				var rv = old.apply(this, arguments);
				if (!check_id) check_id = runSoon(matching, 100);
				return rv;
			}
		})
	}
	
	function registerSetterGetterFunction() {
		$.each(arguments, function(i,func){
			var old = $.fn[func];
			$.fn[func] = function(a, b) {
				var rv = old.apply(this, arguments);
				if (!check_id && (b !== undefined || typeof a != 'string')) check_id = runSoon(matching, 100);
				return rv;
			}
		})
	}

	// Register core DOM manipulation methods
	registerMutateFunction('append', 'prepend', 'after', 'before', 'wrap', 'removeAttr', 'addClass', 'removeClass', 'toggleClass', 'empty', 'remove');
	registerSetterGetterFunction('attr');
	
	// And on DOM ready, trigger matching once
	$(function(){ matching(); })
	
})(jQuery);

