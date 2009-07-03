<?php 

class HasPromosDecorator extends DataObjectDecorator {
	
	function __construct() {
		$this->spaces = func_get_args(); 
		if (!$this->spaces) $this->spaces = array('PromoSections');
		parent::__construct();
	}
	
	function extraStatics() {
		return array(
			'has_many' => array(
				'AllSections' => 'PromoSection'
			)
		);
	}
	
	function setOwner(Object $owner, $ownerBaseClass = null) {
		parent::setOwner($owner, $ownerBaseClass);
		foreach ($this->spaces as $space) {
			$this->owner->addWrapperMethod($space, 'getPromoSpace');
		}
	}

	function getPromoSpaces() {
		return $this->spaces;
	}
	
	function getPromoSpace($space) {
		return $this->owner->getComponents('AllSections', "`PromoSection`.`Space` = '$space'");
	}
	
	static function getPromoClasses() {
		$classes = array();
		foreach (ClassInfo::getValidSubClasses() as $class) {
			if (Object::has_extension($class, 'HasPromosDecorator')) $classes[] = $class;
		}
		return $classes;
	}
	
	static function getPromoPages() {
		$pages = new DataObjectSet();
		foreach (self::getPromoClasses() as $class) {
			$pages->merge(DataObject::get($class));
		}
		return $pages;
	}
}