(function($){

var cache = {};

$.i = function(str) {
	if (cache[str]) return cache[str];
	
	var mode = 0;
	var out = "'";
	for (var i = 0 ; i < str.length; i++) {
		var chr = str.charAt(i);
		
		if (mode == 0) {
			switch(chr) {
				case '{':
					mode = 1;
					out += "'+(";
					break;
				case "'":
					out += "\\'";
					break;
				default:
					out += chr;
			}
		}
		else {
			switch(chr) {
				case '{':
					mode += 1;
					out += chr;
					break;
				case '}':
					mode -= 1;
					if (mode == 0) out += ")+'";
					else out += chr;
					break;
				default:
					out += chr;
			}
		}
	}
	
	out += "'";
	return cache[str] = out;
}

})(jQuery);
