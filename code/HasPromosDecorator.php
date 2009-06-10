<?php 

class HasPromosDecorator extends DataObjectDecorator {
	
	function extraStatics() {
		return array(
			'has_many' => array(
				'PromoSections' => 'PromoSection'
			)
		);
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