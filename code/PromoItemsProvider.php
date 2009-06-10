<?php 

interface PromoItemsProvider {
	function ItemForID($id);
	function LabelForID($id);

	function AvailableItems($Page) ;
	function AvailableItemFilterForm() ;
}
