<?php 

class PromoSpot extends DataObject {
	
	static $db = array(
		'Spot' => 'Varchar(20)',
		'Start' => 'Int',
		'Length' => 'Int',
		'ItemClassName' => 'Varchar(100)',
		'ItemID' => 'Int'
	);
	
	static $has_one = array(
		'Page' => 'Page',
		'PromoSection' => 'PromoSection'
	);

	function Item() {
		return $this->PromoSection()->Template()->ItemProvider()->ItemForID($this->ItemID);
	}
	
	function Info() {
		$label = $this->PromoSection()->Template()->ItemProvider()->LabelForID($this->ItemID);
		return array(
			'start' => $this->Start,
			'length' => $this->Length,
			'id' => $this->ItemClassName . ':' . $this->ItemID,
			'label' => $label
		);
	}
	
}

