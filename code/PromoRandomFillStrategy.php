<?php

class PromoRandomFillStrategy extends Object implements PromoFillStrategy {
	function Fill($template, $section, $spot) {
		$query = $template->ItemProvider()->Query($section->Page());
		
		$query->orderby('RAND()'); $query->limit('1');
		foreach ($query->execute() as $record) return $template->ItemProvider()->Item($record);
	}
}