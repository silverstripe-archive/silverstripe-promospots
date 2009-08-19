<?php 

interface PromoItemsProvider {
	function Item($idOrRecord);
	function Label($idOrItem);

	function Query($Page, $searchTerms = null);
	function SearchContext();
}
