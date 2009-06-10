(function($) {	
	/* Store holds the non-namespaced functions. This object is keyed by function name, and each value is an array of [selector, function, specifity] arrays */
	var store = {};
	var onmatches = [];
	
	/* Stores a count of definitions, so that we can sort identical selectors by definition order */
	var rulecount = 0;

	/* A couple of utility functions for accessing the store outside of this closure */
	$.concrete = {
		rules: function() { return store; },
		clear_all_rules: function() { 
			// Remove proxy functions and namespace functions
			for (var k in $.fn) {
				if ($.fn[k].concrete) delete $.fn[k] ;
			}
			// Remove base stored rules
			for (var k in store) delete store[k];
			// And blow away _all_ livequery rules (not just ours)
			$.livequery.queries = []; $.livequery.queue = []; 
			onmatches = []; onunmatches = {};
		}
	}

   /* A property definition */
	$.property = function(options) {
		if (this instanceof $.property) {
			this.options = options;
		}
		else return new $.property(options);
	}
	$.extend($.property, {
		generate: function(options){
			options = options || {};
			var getter, setter;
			if (options.initial) {
				var initial = options.initial;
				getter = function(){ 
					var d = this.d(); var k = arguments.callee.pname;
					if (!d.hasOwnProperty(k)) d[k] = initial;
					return d[k];
				};
			}
			else getter = function(){ return this.d()[arguments.callee.pname] }
			
			if (options.restrict == 'int')
				setter = function(v){ return this.d()[arguments.callee.pname] = Math.round(parseFloat(v)); }
				
			else if (options.restrict == 'string')
				setter =	function(v){ return this.d()[arguments.callee.pname] = ''+v; }
			else
				setter = function(v){ return this.d()[arguments.callee.pname] = v; }

			return [getter, setter];
		}
	});
	$.extend($.property.prototype, {
		generate: function(){
			return $.property.generate(this.options);
		}
	});

	function Rule(o, important) {
		if (o instanceof Rule) {
			$.extend(this, o);
		}
		else {
			this.selector = o.selector;
			this.specifity = o.specifity(important);
			this.rulecount = ++rulecount;
		}
	}
	$.extend(Rule,{
		compare: function(a, b) {
			var r, i;
			for (i = 0 ; i < 4; i++ ) {
				if (r = a.specifity[i] - b.specifity[i]) return r;
			}
			return a.rulecount - b.rulecount;
		}
	});
	$.extend(Rule.prototype, {
		bind: function(func){
			var nr = new Rule(this);
			nr.func = func;
			return nr;
		},
		bind_cd: function(create, destroy) {
			var nr = new Rule(this);
			nr.create = create;
			nr.destroy = destroy;
			return nr;
		}
	})
	
	function Namespace(injectable, store, _prepend) {
		this.injectable = injectable;
		this.store = store;
		this.prepend = _prepend || '';
	}
	$.extend(Namespace.prototype, {
		
		/**
		 * A proxy is a function attached to a callable object (either the base jQuery.fn or a subspace object) which handles
		 * finding and calling the correct function for each member of the current jQuery context
		 * @param {String} name - name of the function as passed in the construction object
		 */
		proxy: function(name) {
			if (!this.injectable[name]) {
				var f = function() {
					var rv, args = arguments, funcs = args.callee.store[args.callee.fname], ctx = $(this.__context || this), match; 
					if (!funcs) return;
					
					if (ctx.length == 1) {
						for (var j = funcs.length-1; j >= 0 && ctx.length; j--) {
							if (ctx.fastis(funcs[j].selector)) return rv = funcs[j].func.apply(ctx, args);
						}
						return rv;
					}
					
					for (var j = funcs.length-1; j >= 0 && ctx.length; j--) {
						var match = ctx.filter(funcs[j].selector);
						if (match.length){
							for (var i = 0; i < match.length; i++) rv = funcs[j].func.apply($(match[i]), args);
							ctx = ctx.not(match);
						}
					}
					return rv;
				};
				f.concrete = true;
				f.fname = name;
				f.store = this.store;
				this.injectable[name] = f;
			}
			
			return this.injectable[name];
		},
		
		/**
		 * A subspace is a seperate set of functions. This function creates a subspace get function, which 
		 * is attached to a callable object and handles passing the current "this" context through to the 
		 * proxy functions attached to this subspace
		 * @param {Object} name
		 */
		subspace: function(name) {
			var f;
			if (!(f = this.injectable[name])) {
				f = function() {
					return new arguments.callee.subspace(this.__context || this);
				}
				f.subspace = function(context){ this.__context = context; }
				f.store = {};
				f.concrete = true;
				f.fname = name;
				this.injectable[name] = f;
			}
			
			return new Namespace(f.subspace.prototype, f.store); 
		},
		
		bind_proxy: function(ctx, name, rule) {
			var rulelist = this.store[name] || (this.store[name] = []) ;
			
			rulelist[rulelist.length] = rule;
			rulelist.sort(Rule.compare);
			
			return this.proxy(name);
		},
		
		add: function(ctx, rule, data) {
			if (data['onmatch'] || data['onunmatch'])
			onmatches.push(rule.bind_cd(data['onmatch'], data['onunmatch']));
			
			for (var k in data) {
				if (k == 'onmatch' || k == 'onunmatch') continue;
				
				var v = data[k];
				
				if (v == $.property || v instanceof $.property) {
					var gs = v.generate();
					gs[0].pname = gs[1].pname = k;
					this.bind_proxy(ctx, k, rule.bind(gs[0]));
					this.bind_proxy(ctx, 'set'+k, rule.bind(gs[1]));
				} 
				else if ($.isFunction(v)) {
					var proxy = this.bind_proxy(ctx, (k.match(/^[a-z]/) ? this.prepend+k : k), rule.bind(v));
			
					if (match = k.match(/^on(.*)/)) {
						ctx.livequery(match[1], proxy);
					}
				}
				else {
					var subspace = this.subspace(k);
					subspace.add(ctx, rule, v);
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

	var base = new Namespace($.fn, store, '$');
	
	/* The main rule definition function */
	$.fn.concrete = function(important, functions) {
		/* Handle one-argument version */
		if (important && typeof important == 'object') { functions = important; important = ''; }

		/* Create rule and pass off to base Namespace */
		var rule = new Rule(this, important=='!important') ;
		base.add(this, rule, functions);
	};
	
	/** Check if every member of the jQuery object has the passed function defined */
	$.fn.hasConcrete = function(name) {
		return base.has(this, name);
	};


	var check_id = null;
	var match_cache = {};

	function processqueue() {
		var matched = $([]);
		for (var j = onmatches.length-1; j >= 0; j--) {
			var sel = onmatches[j].selector;
			var res = $(sel).not(matched);
			if (res.length) {
				matched.add(res);
				
				
				if (match_cache[sel]) {
					nw = res.not(match_cache[sel]);
					old = match_cache[sel].not(res);
					if (onmatches[j].destroy) old.each(function(){onmatches[j].destroy.call($(this))});
				}
				else nw = res;
				
				if (onmatches[j].create) nw.each(function(){
					onmatches[j].create.call($(this));
				})
				match_cache[sel] = res;
			}
		}
				
		check_id = null;
	}
	
	mutinf = {};
	
	function registerMutateFunction() {
		$.each(arguments, function(i,func){
			var old = $.fn[func];
			$.fn[func] = function() {
				mutinf[func] = ( mutinf[func] ? mutinf[func] + 1 : 1 ); 
				var rv = old.apply(this, arguments);
				if (!check_id) check_id = setTimeout(processqueue, 100);
				return rv;
			}
		})
	}
	
	function registerSetterGetterFunction() {
		$.each(arguments, function(i,func){
			var old = $.fn[func];
			$.fn[func] = function() {
				var rv = old.apply(this, arguments);
				if (arguments.length > 1 || typeof arguments[0] != 'string') {
					mutinf[func] = ( mutinf[func] ? mutinf[func] + 1 : 1 ); 
					if (!check_id) check_id = setTimeout(processqueue, 100);
				}
				return rv;
			}
		})
	}

	// Register core DOM manipulation methods
	registerMutateFunction('append', 'prepend', 'after', 'before', 'wrap', 'removeAttr', 'addClass', 'removeClass', 'toggleClass', 'empty', 'remove');
	registerSetterGetterFunction('attr');
	
})(jQuery);
