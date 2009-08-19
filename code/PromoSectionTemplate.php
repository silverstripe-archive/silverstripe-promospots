<?php 

abstract class PromoSectionTemplate extends ViewableData {
	
	/** @var string - A human readable descriptive name for this Promotion Section */
	static $name = '';
	
	/** 
	 * @var string - Template names for rendering this section in live and preview mode. 
	 * If these are blank, the camel cased $name variable will be used, appended with _preview for the preview template
	 */
	static $preview_template = '';
	static $live_template = '';
	
	/** 
	 * @var string or array - CSS files for including. ALL css files for all previews will be included, so make sure the selectors in the css
	 * are specific to this preview 
	 */
	static $preview_css = '';
	
	/** @var array(string) - An array of strings giving names for each spot in this section */
	static $spots = array();

	/** @var PromoItemsProvider - A class implementing PromoItemsProvider as a string */
	static $items_provider = '';
	
	/** @var PromoFillStrategry - A class implementing PromoFillStrategy as a string */
	static $fill_strategy = 'PromoRandomFillStrategy';
	
	function Spots() {
		return $this->stat('spots');
	}
	
	function NewInstance() {
		return new PromoSection(array(
			'Name' => $this->stat('name'),
			'TemplateClass' => $this->class
		));
	}
	
	function Name() {
		$name = $this->stat('name');
		return empty($name) ? $this->class : $name;
	}
	
	function Preview() {
		$css = $this->stat('preview_css');
		if (!empty($css)) {
			if (is_string($css)) Requirements::themedCSS($css);
			else foreach ($css as $c) Requirements::themedCSS($c);
		}
		
		$template = $this->stat('preview_template');
		if (empty($template)) $template = $this->stat('name') . '_preview'; 
		
		$spots = new DataObjectSet();
		foreach ($this->stat('spots') as $spot) {
			$spots->push(new ArrayData(array(
				'Spot' => $spot
			)));
		}
		
		$data = new ArrayData(array('Spots' => $spots));
		return $data->renderWith('PromoSections/'.$template);
	}

	function ItemProvider() {
		return singleton($this->stat('items_provider'));
	}
	
	function Info() {
		return array(
			'name' => $this->Name(),
			'templateClass' => $this->class,
			'preview' => $this->Preview()
		);
	}
	
	function FillSpot($section, $spot) {
		$rv = singleton($this->stat('fill_strategy'))->Fill($this, $section, $spot);
		return $rv;
	}
}