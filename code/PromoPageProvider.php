<?php 

class PromoPageProvider extends Object implements PromoItemsProvider {
	function __construct($class = 'Page') {
		$this->itemClass = $class;
	}
	
	function Item($idOrRecord) {
		return is_numeric($idOrRecord) ? DataObject::get_by_id($this->itemClass, $idOrRecord) : new $this->itemClass($idOrRecord);
	}
	
	function Label($idOrItem) {
		if (!($idOrItem instanceof $this->itemClass)) $idOrItem = $this->Item($idOrItem);
		return $idOrItem ? $idOrItem->Title : "$this->itemClass  Removed";
	}
	
	function Query($page, $searchTerms = null) {
		$query = singleton($this->itemClass)->buildSQL();
		if ($searchTerms) $this->SearchContext()->getQuery($searchTerms, '', '', $query);
		
		return $query;
	}
	
	function SearchContext() {
		return singleton($this->itemClass)->getDefaultSearchContext();
	}
}

