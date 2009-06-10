<?php 

class PromoAdmin extends LeftAndMainJQuery13 {

	static $url_segment = 'promos';
	static $menu_title = 'Promos';

	public function init() {
		parent::init();
		
		/* UI theme. Should this be in JQuery13? */
		Requirements::css('promo/css/theme_ss/ui.tabs.css');
		$ui = array('core', 'theme', 'resizable', 'datepicker');
		foreach ($ui as $css) Requirements::css("promo/css/cupertino/ui.$css.css");		
		
		/* Require the UI code I need */
		$ui = array('ui.core', 'ui.tabs', 'ui.draggable', 'ui.droppable', 'ui.sortable', 'ui.resizable', 'ui.datepicker', 'effects.core', 'effects.scale');
		foreach ($ui as $lib) JQuery13::requireUI($lib);
		
		/* And a single extra library */
		Requirements::javascript('promo/javascript/jquery.json.js');
		
		/* My (Hamish Friedlander's) code. This should be pulled into a different module or something once I'm done with it */
		Requirements::javascript('promo/javascript/jquery.stringinterp.js');
		Requirements::javascript('promo/javascript/jquery.dat.js');
		Requirements::javascript('promo/javascript/jquery.specifity.js');
		Requirements::javascript('promo/javascript/jquery.fastis.js');
		Requirements::javascript('promo/javascript/jquery.concrete.js');
		
		Requirements::css('promo/css/PromoAdmin.css');
		Requirements::javascript('promo/javascript/PromoAdmin.js');
		
		Requirements::customScript($this->PromoSections());
	}
	
	public function PageSelectorField() {
		$optionsetField = new DropdownField('PageID', 'PageID', HasPromosDecorator::getPromoPages()->toDropDownMap());
		return $optionsetField->Field();
	}	
	
	public function Page($req) {
		$id = $req->param('ID');
		$id = is_numeric($id) ? (int)$id : 0;
		
		if ($req->isPOST()) {
			$page = DataObject::get_by_id('SiteTree', $id);
			$foundSections = array();
			
			$data = Convert::json2obj($req->postVar('data'));
			//Debug::dump($data);exit();
			
			foreach ($data as $sectionData) {
				if (isset($sectionData->id)) {
					$section = DataObject::get_by_id('PromoSection', $sectionData->id);
				}
				else {
					$section = singleton($sectionData->templateClass)->NewInstance();	
					$section->PageID = $id;
				}
				
				$section->Order = $sectionData->order;
				$section->write();
				$foundSections[] = $section->ID;
				
				$section->PromoSpots()->removeAll();
				
				foreach ($sectionData->spots as $spotName => $spotItems) {
					foreach ($spotItems as $spotItem) {
						$info = explode(':', $spotItem->ID);
						$spot = new PromoSpot(array(
							'Spot' => $spotName,
							'Start' => $spotItem->Start,
							'Length' => $spotItem->Length,
							'ItemClassName' => $info[0],
							'ItemID' => $info[1],
							'PromoSectionID' => $section->ID
						));
						$spot->write();
					}
				}
			}
			
			foreach ($page->PromoSections() as $section) {
				if (!in_array($section->ID, $foundSections)) {
					$section->PromoSpots()->removeAll();
					$section->delete();
				}
			}
		}
		else {
			$page = DataObject::get_by_id('Page', $id);
			$sections = array();
			foreach ($page->PromoSections() as $section) $sections[] = $section->Info();
			$res = array(
				'PromoSections' => $sections
			);
			
			return Convert::raw2json($res);
		}
	}
	
	public function PromoSections() {
		$sections = array();
		
		foreach (ClassInfo::subclassesFor('PromoSectionTemplate') as $class) {
			if ($class == 'PromoSectionTemplate' || !singleton($class)->stat('name')) continue;
			$sections[] = singleton($class)->Info();
		}
		
		return 'jQuery(function($){$("#PromoAvailableSections").$display('.Convert::raw2json(array( 'sections' => $sections )).');})';
	}
	
	public function AvailableItems($req) {
		$pageID = (int)$req->param('ID');
		$template = $req->param('OtherID');
		return singleton($template)->ItemProvider()->AvailableItems(DataObject::get_by_id('Page', $pageID));
	}
}