(function($) {
	
	/* We need to know if a pseudo selector is a pseudo-class or a pseudo-element to calculate specifity correctly */
	var pseudo_elements = [':first-letter', ':first-line', ':before', ':after'];

	/**
	 * Returns the specifity of this selector - how specific the rule is.
	 * This is used by concrete to determine which rules override which
	 * @param {Boolean} important - true if this rule should be considered 'important' as per the CSS spec
	 * 
	 * @todo: Handle the case of :not(tag) which currently doesn't give a score for the tag
	 * @todo: Write tests
	 */
	$.fn.specifity = function (important) {
		var spec = [(important ? 1 : 0), 0, 0, 0] ;
		var res ;
		
		/* IDs */
		res = this.selector.match( /#/g ) ;
		if (res) spec[1] += res.length ;
		
		/* Classes + Attributes */
		res = this.selector.match( /[.\[]/g ) ;
		if (res) spec[2] += res.length ;
		
		/* Elements */
		res = this.selector.match( /(^|\s)[a-z]/gi ) ;
		if (res) spec[3] += res.length ;
		
		/* Pseudo classes / elements */
		res = this.selector.match( /:[\-a-z0-9_]+/gi ) ;
		if (res) $.each(res, function(i, name){
			if (name != ':not') $.inArray(name, pseudo_elements) ? spec[3]++ : spec[2]++ ;
		}) ;
		
		/* New style pseudo elements */
		res = this.selector.match( /::[\-a-z0-9_]+/gi ) ;
		if (res) spec[3] += res.length ;
		
		return spec ;
	}
})(jQuery);
