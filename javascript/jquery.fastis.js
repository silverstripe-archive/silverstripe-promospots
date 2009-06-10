/*
This attempts to do the opposite of Sizzle.
Sizzle is good for finding elements for a selector, but not so good for telling if an individual element matches a selector
*/

(function($) {	
	var chunk_rx = /(\s*\+|\s*>|\s*~|\s)\s*/
	
	var not_rx = /:not\(([^)]+)\)/
	var id_rx = /#(\w+)/
	var tag_rx = /^(\w+)/
	var cls_rx = /\.(\w+)/g
	
	var lbl_id = 0;

	function compile_sub(frag) {
		var m, code = "";
		
		if (m = frag.match(tag_rx)) {
			code += 'if (el.tagName != "'+m[1].toUpperCase()+'") BAD;';
		}
		if (m = frag.match(id_rx)) {
			code += 'if (el.id != "'+m[1]+'") BAD;';
		}
		if (frag.match(cls_rx)) {
			cls_rx.lastIndex = 0;
			while (m = cls_rx.exec(frag)) code += 'if (cls.indexOf(" '+m[1]+' ")==-1) BAD;';
		}
		
		return code;
	}
	
	function compile_fragment(frag) {
		var m, code = "";
		
		if (frag.match(cls_rx)) {
			code += 'var cls = " "+el.className+" ";'
		}
				
		while (m = frag.match(not_rx)) {
			code += compile_sub(m[1]).replace(/!=|==/, function(r){return(r=='==') ? '!=' : '==';});
			frag = frag.replace(m[0], '');
		}
		
		code += compile_sub(frag);
		
		code += 'GOOD;';
		return code;
	}
	
	
	function first_stanza(f) {
		if (f.complex)
			return ''+
				'l'+(++lbl_id)+':{' +
					f.replace(/GOOD/g, 'break l'+lbl_id) +
				'}';
		else
			return f.replace(/GOOD/g, '');
	}
	
	function combine_frag_ascendant(f1, f2) {
		code  = first_stanza(f2);
		code += 'while(true){'
		code += 'el = el.parentNode;'
		code += 'if (!el || el == document) BAD;'
		code += f1.replace(/BAD/g, 'continue').replace(/GOOD/g, '');
		code += 'GOOD;'
		code += '}';
		
		code = new String(code);
		code.complex = true;
		return code;
	}
	
	function combine_frag_parent(f1, f2) {
		code  = first_stanza(f2);
		code += 'el = el.parentNode;'
		code += 'if (!el || el == document) BAD;'
		code += f1;
		return code;
	}
	
	function combine_frag_previous_siblings(f1, f2) {
		code  = first_stanza(f2);
		code += 'while(true){'
		code += 'el = el.previousSibling;'
		code += 'if (!el) BAD;'
		code += 'if (el.nodeType != 1) continue;'
		code += f1.replace(/BAD/g, 'continue').replace(/GOOD/g, '');
		code += 'GOOD;'
		code += '}';
		
		code = new String(code);
		code.complex = true;
		return code;
	}
	
	function combine_frag_previous_sibling(f1, f2) {
		code  = first_stanza(f2);
		code += 'while(true){'
		code += 'el = el.previousSibling;'
		code += 'if (!el) BAD;'
		code += 'if (el.nodeType != 1) continue;'
		code += f1
		code += '}';
		
		code = new String(code);
		code.complex = true;
		return code;
	}
	
	var combines = {
		' ': combine_frag_ascendant,
		'>': combine_frag_parent,
		'~': combine_frag_previous_siblings,
		'+': combine_frag_previous_sibling
	};
	
	$.fn.compile_fastis = compile_fast_is = function (selector) {
		parts = selector.split(chunk_rx);
		
		expr = compile_fragment(parts.pop());
		while (parts.length) {
			combinator = parts.pop().slice(-1);
			expr = combines[combinator](compile_fragment(parts.pop()), expr);
		}
		
		return expr.replace(/BAD/g, 'return false').replace(/GOOD/g, 'return true');
	}
	
	var cache = {};
	
	$.fn.fastis = function(selector) {
		var m;
		if (!cache[selector]) {
			if (selector.match(/:[^n]|\[/)) return this.is(selector);
			cache[selector] = new Function('el', compile_fast_is(selector));
		}
		return cache[selector](this[0]);
	}
	
})(jQuery);
