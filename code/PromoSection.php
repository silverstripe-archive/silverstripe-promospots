<?php

class PromoSection extends DataObject {
	
	static $default_sort = '`Order`';
	
	static $db = array(
		'Space' => 'Varchar(50)',
		'Name' => 'Varchar(100)',
		'TemplateClass' => 'Varchar(100)',
		'Order' => 'Int',
	);
	
	static $has_one = array(
		'Page' => 'Page'
	);
	
	static $has_many = array(
		'PromoSpots' => 'PromoSpot'
	);
	
	function spot($i) {
		$spots = $this->PromoSpots()->toArray();
		return $spots[$i];
	}

	function Template() {
		return singleton($this->TemplateClass);
	}
	
	function Info() {
		$info = $this->Template()->Info();
		$info['id'] = $this->ID;
		$info['spots'] = array();
		
		$spots = $this->UnexpiredSpots();
		if ($spots) foreach ($spots as $spot) {
			$info['spots'][$spot->Spot][] = $spot->Info();
		}
		return $info;
	}

	function UnexpiredSpots() {
		return DataObject::get(
			'PromoSpot', 
			"PromoSectionID = {$this->ID} && DATE(FROM_UNIXTIME((Start+Length)*24*60*60)) > DATE(NOW())",
			'Start DESC'
		);
	}
	
	/**
	 * Get the current active spots.
	 * We could do this with a GROUP BY subselect, but that gets messy and can't be used with DataObject::get
	 * @return unknown_type
	 */
	function ActiveSpots() {
		$spots = DataObject::get(
			'PromoSpot', 
			"PromoSectionID = {$this->ID} && DATE(FROM_UNIXTIME(Start*24*60*60)) <= DATE(NOW()) AND DATE(FROM_UNIXTIME((Start+Length)*24*60*60)) > DATE(NOW())",
			'Start DESC'
		);
		
		$seen = array();
		$grouped = new DataObjectSet();
		if ($spots) foreach ($spots as $spot) {
			if (!isset($seen[$spot->Spot])) { $seen[$spot->Spot] = true; $grouped->push($spot); }
		}
		
		return $grouped;
	}
	
	function Render() {
		$template = $this->Template()->stat('live_template');
		$data = new ArrayData(array('Spots' => $this->ActiveSpots()));
		return $data->renderWith('PromoSections/'.$template);
	}
	
}