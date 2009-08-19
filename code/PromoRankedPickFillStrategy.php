<?php

class PromoRankedPickFillStrategy extends Object implements PromoFillStrategy {
	function Fill($template, $section, $spot) {
		$date = getdate();
		
		// If there is a match, return it
		$cache = DataObject::get_one('PromoRankedPick', "PromoSectionID = {$section->ID} AND Spot = '{$spot}' AND Day = {$date['yday']}");
		if ($cache) return $cache->Item();

		// Otherwise, recalculate and return new one
		PromoRankedPick::recalculate();
		$pick = DataObject::get_one('PromoRankedPick', "PromoSectionID = {$section->ID} AND Spot = '{$spot}' AND Day = {$date['yday']}");
		return $pick->Item();
	}
}