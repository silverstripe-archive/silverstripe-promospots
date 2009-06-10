
/* Monkeypatch fixRightWidth */
var fixRightWidthWithoutEvents = fixRightWidth;
var fixRightWidth = function() {
	fixRightWidthWithoutEvents();
	jQuery('#right').trigger('resize');
};

(function($){
	
	$.fn.shadow = function() {
		this.prepend(
			'<div class="shadow-one">'+
				'<div class="corner-a"></div>'+
				'<div class="corner-b"></div>'+
				'<div class="shadow-two"></div>'+
			'</div>'
		);
		return this;
	}
	
	var date_selector = '#PromoSpotStartDate';
	var one_day_in_milliseconds = 24*60*60*1000;

	var item_line_height = 20;
	var item_left_margin = 65;
	var item_right_margin = 80;
	var empty_days_to_show = 5;

	var promo_url = 'admin/promos';
	
	var today = Math.floor((new Date).getTime() / one_day_in_milliseconds);
	
   /**********************************
    * SCHEDULER FOR PROMOTIONAL ITEMS
    **********************************/

	function makePromoItem() {
		return $('<div class="PromoItem" style="position:absolute;"><div class="labels"><h4></h4><h5></h5></div>').shadow();
	}
	
	$('.PromoItem').concrete({
		/* Properties */
		ID:     $.property,
		Label:  $.property,
		Offset: $.property({restrict: 'int', initial: 0}),
		Index:  $.property({restrict: 'int', initial: 0}),
		Start:  $.property({restrict: 'int', initial: -1}),
		Length: $.property({restrict: 'int', initial: 2}),
		
		/* Getters */
		End: function(){
			return this.Start() + this.Length();
		},

		/* Functions */
		
		set_info: function( id, label, start, length ) {
			this.setID(id);
			this.setLabel(label);
			if (start) this.setStart(start);
			if (length) this.setLength(length);
			
			this.$update_text();
			return this;
		},
		
		update_text: function() {
			var start = this.Start();
			var length = this.Length(); 

			if (start != -1) {
				var date = new Date(start * one_day_in_milliseconds);
				var txt  = eval($.i('{$.datepicker.formatDate("d M y", date)} for {length} {length == 1 ? "day" : "days"}'));
			}
			else txt = '';
			
			this.find('h4').text(this.Label());
			this.find('h5').text(txt);
			
			this.parent().$build_days();
		},
		
		over: function(what) {
			what ? this.data('over', $(what)) : this.removeData('over');
		},
		
		schedule: function() {
			return this.parent().is('.PromoSchedule') ? this.parent() : this.data('over');
		},
		
		/* Expects list to exist one way or the other */
		reposition: function() {
			var list = this.$schedule();
			
			var day = this.Start() - list.StartDay();
			var y = day * item_line_height;
			var x = item_left_margin + this.Offset();
			
			if (!this.offsetParent().is(list)) {
				list_offset = list.offset();
				prnt_offset = this.offsetParent().offset();
				x = x + list_offset.left - prnt_offset.left;
				y = y + list_offset.top - prnt_offset.top;
			}
				
			this.css({width: list.width() - (item_left_margin + item_right_margin), height: this.Length() * item_line_height - 2});
			this.css({top: y, left: x, zIndex: 1000 + this.Index() });
			
			return {top:y, left:x};
		},
		
		start: function(ev, ui) {
			if (this.$schedule()) this.$schedule().$opacityOn(this);
		},
		
		// If we're over a list, snap to that list. Don't otherwise. Either way, enforce width.
		drag: function(ev, ui) {
			var day = -1, schedule = this.$schedule();
			
			if (schedule) {
				day = schedule.StartDay() + Math.round((ui.offset.top - schedule.offset().top) / item_line_height);
				if (day < today) day = today;
			}
			
			this.setStart(day);
			this.$update_text();
			if (schedule) { schedule.$sort_items(); schedule.$opacityOn(this); ui.position = this.$reposition(); }
		},
		
		stop: function(ev, ui) {
			if (!this.data('over')) this.remove();
			else {
				this.$schedule().$sort_items();
				this.$schedule().$opacityOff();
			}
		},
		
		resize: function(ev, ui) {
			// Figure out how many days this item takes up
			var length = Math.max(1, Math.round(ui.size.height / item_line_height));
			
			// Update the text
			this.setLength(length);
			this.$update_text();
			this.$schedule().$sort_items(); this.$schedule().$opacityOn(this);
			
			// Update the size of the helper
			ui.size.height = length * item_line_height - 2;
		},
		
		attach: function(schedule) {
			this.appendTo(schedule)
			return this;
		}
	});

	$('.PromoSchedule .PromoItem').concrete({
		onmatch: function(){
			this
				.prepend('<img class="remove" src="promospots/images/cross-small.png" />')
				.draggable({
					distance: 0,
					start: function(ev, ui) {
						ui.helper.$start(ev, ui);
					},
					drag: function(ev, ui) {
						ui.helper.$drag(ev, ui);
					},
					stop: function(ev, ui) {
						ui.helper.$stop(ev, ui);
					}
				})
				.resizable({
					handles: 's',
					distance: 0,
					start: function(ev, ui) {
						ui.helper.$start(ev, ui);
					},
					resize: function(ev, ui) {
						ui.helper.$resize(ev, ui);
					},
					stop: function(ev, ui) {
						ui.helper.$schedule().$sort_items();
						ui.helper.$schedule().$opacityOff();
					}
				});
				
			var self = this;
			this.find('.remove').bind('click', function(){self.remove();}); 
		}
	})

	$('.PromoSchedule').concrete({
		StartDay: $.property({restrict: 'int', initial: today}),
		
		init: function() {
			this.droppable({
				tolerance:'intersect',
				over: function(ev, ui) {
					ui.helper.$over(this);
				},
				out: function(ev, ui) {
					ui.helper.$over(null);
				},
				drop: function(ev, ui) {
					$(this).$drop(ev, ui);
				}
			});
			this.$build_days();
			return this;
		},
		
		decode: function(data) {
			for (var i = 0; i < data.length; i++) {
				var info = data[i];
				var el = makePromoItem();
				el.$set_info(info.id, info.label, info.start, info.length);
				el.$attach(this);
			}
			this.$sort_items();
			this.$build_days();
		},
		
		drop: function(ev, ui) {
			item = ui.draggable;
			if (!item.parent().is('.PromoSchedule')) {
				var item = ui.helper.clone();
				item.$attach(this);
			}
			item.$reposition();
		},

		build_days: function() {
			/* Find wanted days from last scheduled item + some extra */
			var first_day = today;
			var last_day = today;
			
			this.find('.PromoItem').each(function(i,item){
				if ($(item).Start() > 0) first_day = Math.min(first_day, $(item).Start());
				last_day = Math.max(last_day, $(item).End()); 
			})
			
			first_day -= 1;
			last_day += empty_days_to_show;
			
			first_day = Math.min(first_day, this.StartDay());
			
			if (first_day - today < 0) {
				wanted_history_days = today - first_day;
				var current_days = this.find('li.history').length;
				
				for (var i = current_days; i < wanted_history_days; i++) {
					var day = today - i - 1;
					var date = $.datepicker.formatDate('d M', new Date(day * one_day_in_milliseconds));
					this.prepend('<li class="history" ref="'+day+'">'+date+'</li>');
				}
				
				this.setStartDay(first_day);
			}
			

			wanted_days = last_day - today;

			/* Find number of days that will fit without a scrollbar */
			var visible_days = Math.floor( this.parent().height() / item_line_height );
			
			/* Use the greater of the two */
			wanted_days = Math.max(visible_days, wanted_days)

			/* Make sure we have that many days */
			var current_days = this.find('li:not(.history)').length;
			
			if (current_days > wanted_days ) {
				/* We just remove one at a time. This gives us a nice smooth contraction when dragging, not a sudden jump */
				this.find('li:last-child').remove();
			}
			else {
				for (var i = current_days; i < wanted_days; i++) {
					var day = today + i;
					var date = $.datepicker.formatDate('d M', new Date(day * one_day_in_milliseconds));
					this.append('<li ref="'+day+'">'+date+'</li>');
				}
			}
			
			return this;
		},
		
		sort_items: function() {
			var items = this.children('.PromoItem').get();
			items.sort(function(a,b){ return $(a).Start() - $(b).Start() });
			
			var ends = [] ;
			
			$(items).each(function(i){
				var item = $(this);
				
				while (ends.length && ends[ends.length-1] <= item.Start()) ends.pop();
				
				item.setOffset(ends.length*20);
				item.setIndex(i);
				item.$reposition();
				
				ends.push(item.End());
			})
		},
		
		opacityOn: function(active) {
			this.$opacityOff();
			this.find('.PromoItem').each(function(){
				if (active.Index() < $(this).Index() && active.End() > $(this).Start()) $(this).css('opacity', 0.7);
			});
		},
		
		opacityOff: function() {
			this.find('.PromoItem').css('opacity', 1);
		}
	});
	
	$('#PromoItems').concrete({
		create_list: function() {
			itemlist = $('<ul class="PromoSchedule"></ul>').css({display:'none'});
			this.append(itemlist); 
			itemlist.$init();
			return itemlist;
		},
		show: function(schedule) {
			this.find('p, ul').css({display: 'none'});
			schedule.css({display: 'block'});
			schedule.$sort_items();
		},
		show_none: function() {
			this.find('ul').css({display: 'none'});
			this.find('p').css({display: 'block'});
		}
	})
	
	$('#AvailableItems').concrete({
		load: function(pageid, template) {
			this.html('<div class="loading">Loading...</div>');
			this.load(promo_url+'/AvailableItems/'+pageid+'/'+template);
		}
	});
	
	$('#AvailableItems li').concrete({
		onmatch: function(){
			$(this).draggable({
				appendTo: 'body',
				zIndex: 1000,
				helper: function() {
					var el = makePromoItem();
					el.$set_info($(this).attr('alt'), $(this).text());
					return el;
				},
				drag: function(ev, ui) {
					ui.helper.$drag(ev, ui);
				},
				stop: function(ev, ui) {
					ui.helper.$stop(ev, ui);
				}
			});
		}
	});
	
   /**********************************
    * EDITOR FOR PROMOTIONAL SECTIONS
    **********************************/
	
	$('.promospot').concrete({
		schedule: function(){
			if (!this.d().schedule) this.d().schedule = $('#PromoItems').$create_list();
			return this.d().schedule;
		},
		
		activate: function(){
			$('#PromoItems').$show(this.$schedule());
			
			this.$promoSection().$load_available_items();
			this.$promoSection().$focus();
		},
		
		name: function() {
			var match = this.attr('class').match(/(^|\s)spot-([^\s]+)/);
			return match[2];
		},
		
		encode: function() {
			console.dir(this.d());
			var schedule = this.$schedule(), data = [];
			if (schedule) schedule.find('.PromoItem').each(function(i,el){
				data[data.length] = $(this).d();
			})
			return data;
		},
		
		decode: function(data) {
			this.$schedule().$decode(data);
		},
		
		promoSection: function() {
			return this.parents('li.PromoSection');
		}
	});
	
	$('#PromoPageSections:not(.editing) .promospot').concrete({
		onmouseenter: function(){ 
			$(this).addClass('hover');
		},
		onmouseleave: function(){ 
			$(this).removeClass('hover');
		},
		onclick: function(){
			$('.promospot').removeClass('selected');
			$(this).addClass('selected');
			$(this).$activate();
		}
	});
	
	$('#PromoPageSections.editing .promospot').concrete({
		onmatch: function(){
			$(this).removeClass('hover').removeClass('selected');
		}
	});

	
	$('.PromoSection').concrete({
		load_available_items: function(){
			$('#AvailableItems').$load($('#PromoPageSections').d().pageID, this.d().templateClass);
		},
		
		encode: function(){
			var data = { id: this.d().id, templateClass: this.d().templateClass, order: this.prevAll('.PromoSection').length, spots: {} };
			this.find('.promospot').each(function(i,spot){
				data.spots[$(spot).$name()] = $(spot).$encode();
			});
			return data;
		},
		
		decode: function(data){
			this.html(data.preview)
			$.extend(this.d(), data);
			for (var name in data.spots) {
				this.find('.spot-'+name).$decode(data.spots[name]);
			}
		},
		
		focus: function(){}
	});

	$('#PromoPageSections:not(.editing) .PromoSection').concrete({
		onmatch: function(){
			$(this).find('.remove').css({visibility: 'hidden'});
		},
		focus: function() {
		}
	});
	$('#PromoPageSections.editing .PromoSection').concrete({
		onmatch: function(){
			if ($(this).find('.remove').length == 0) {
				$(this).find('.promosection').prepend('<img class="remove" src="promospots/images/cross-circle.png" />');
				$(this).find('.remove').bind('click', function(){ 
					var list = $(this).parents('#PromoPageSections');
					$(this).parent().remove(); 
					list.$resize();
				});
			}
			
			$(this).find('.remove').css({visibility: 'visible'});
		}
	})
	
	
	$('#PromoAvailableSections').concrete({
		display: function(data) {
			var el = this;	
			$.each(data.sections, function(i,section){
				var title = $('<li><h4>'+section.name+'</h4></li>');
				var sel = $('<li class="PromoSection typography">'+section.preview+'</li>');
				$.extend(sel.d(), section);
				el.append(title);
				el.append(sel);
			})
		},
		
		make_draggable: function() {
			this.find('.PromoSection')
				.draggable({
					helper: 'clone',
					connectToSortable:'#PromoPageSections'
				});
		},
		
		resize: function() {
			this.css({'font-size': (($('#PromoSectionsWidthDetector').width() - 20) / 50.1) + 'px'}); 
		}
	});

	$('#PromoAvailableSections:not(.editing)').concrete({
		onmatch: function() {
			$(this).find('.PromoSection').draggable('destroy');
		}
	});

	$('#PromoAvailableSections.editing').concrete({
		onmatch: function() {
			$(this).$resize();
			$(this).$make_draggable();
		}
	});

	// Load page view when page dropdown is changed and on first view

	$('#PromoPageSections').concrete({
		load: function(id) {
			var self = this;
			this.d().pageID = id;
			$.getJSON(promo_url+'/Page/'+id, function(data){
				self.$display(data);
			});
		},

		display: function(data) {	
			var self = this;
			this.empty();
			$.each(data.PromoSections, function(i, section){
				var sel = $('<li class="PromoSection typography"></li>');
				self.append(sel);
				sel.$decode(section);
			});
			this.$check_empty();
		},
		
		save: function() {
			var promoSections = []
			this.find('.PromoSection').each(function(){ 
				promoSections.push($(this).$encode());
			})
			$.post(
				promo_url+'/Page/'+this.d().pageID,
				{'data': $.json.encode(promoSections)},
				function(data){ console.log(data); },
				'text'
			);
		},
		
		check_empty: function() {
			var has_empty_message = this.find('li.is-empty-message').length;
			var has_items = this.find('li:not(.is-empty-message)').length;
			
			if (has_items && has_empty_message) this.find('li.is-empty-message').remove();
			if (!has_items && !has_empty_message) this.append(
				"<li class='is-empty-message' style='font-size:10px !important;'>No promotion sections added yet. Drag and drop from the 'Sections' tab on right to here to add.</li>"
			);
		},
		
		pxPerEm: function() {
			return parseFloat(this.css('font-size'));
		},
		
		resize: function() {
			/* Figure out the font pixel size to make the children fit in the current width */
			var width = $('#PromoPage').width(); 
			width -= 20 /* Margin */
			width /= 50.1 /* Internal width in em */
			
			/* Figure out the font pixel size to make the children fit in the current height - harder because children have varying heights */
			var pxPerEm = this.$pxPerEm();
			var height = $('#PromoPage').height();
			var em = 0;
			
			this.children('.PromoSection, .ui-sortable-placeholder').each(function(){
				if ($(this).css('display') != 'none' && $(this).css('position') != 'absolute') em += 2 + $(this).height() / pxPerEm ;
			});

			height = pxPerEm * height / ( em * pxPerEm );

			this.css({'font-size': Math.min(width, height) + 'px'}); 
		}
	});

	$('#PromoPageSections:not(.editing)').concrete({
		onmatch: function(){
			$(this).sortable('destroy');
		}
	});

	$('#PromoPageSections.editing').concrete({
		onmatch: function(){
			$(this).sortable({
				axis:'y', 
				placeholder: { 
					element: function(original) {
						var el = $('<li class="ui-sortable-placeholder"></li>');
						el.d().original = original;
						return el;
					},
					update: function(container, p) {
						var pxPerEm = p.d().original.parent().$pxPerEm()
						p.css({
							height: p.d().original.height() / pxPerEm + 'em',
							width: '50em'
						})
					}
				},
				helper: 'clone',
				stop: function(event, ui) {
					$(this).$check_empty();
					$(this).$resize();
				}
			});
		}
	});
	
	$('#PromoPageSections.editing *').concrete({
		onmatch: function(){
			/* If this item doesn't have a height in em, make it do so so that scaling works properly */
			if (!$(this).css('height').match(/em$/)) {
				$(this).css('height', $(this).height() / $(this).parent().$pxPerEm + 'em');
			}
			
			$(this).data('sortable', $(this).parent());
			$(this).data('sortable').$resize();
		},
		onunmatch: function(){
			if ($(this).data('sortable')) $(this).data('sortable').$resize();
		}
	});
	
	$('#PromoControls').concrete({
		init: function(){
			this.tabs({
				show: function(ev, ui) {
					$('#PromoPageSections, #PromoAvailableSections').toggleClass('editing', $(ui.tab).attr('hash') == '#PromoSections');
					//calculate_previewsizes();
				}
			})
		}
	});
	
	$('#PageID').concrete({
		init: function() {
			this
				.bind('change', function(){ $(this).$update(); })
				.$update();
		},
		
		update: function() {
			$('#PromoPageSections').$load(this.val());
		}
	});
	
})(jQuery);



jQuery(function($){
	$('#PromoControls').$init();
	$('#PageID').$init();
	
	// Handle resizing
	$('#right')
		.bind('resize', function(){ $('#PromoAvailableSections, #PromoPageSections').$resize() })
		.trigger('resize');
	
	$('.action[value=Save]').bind('click', function(){ $('#PromoPageSections').$save(); });
});
