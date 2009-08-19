<?php

class PromoRankedPick extends DataObject {
	
	static $db = array(
		'Spot' => 'Varchar(20)',
		'Day' => 'Int',
		'ItemID' => 'Int'
	);
	
	/** Can't have calculations in static declarations, so put here instead (called at bottom of file) */
	public static function init_db_fields() {
		self::$db['ItemClassName'] = "Enum('" . implode(', ', ClassInfo::subclassesFor('DataObject')) . "')"; 		
	}
	
	static $has_one = array(
		'PromoSection' => 'PromoSection' 
	);
	
	static $rank = 'IF(PromoRank IS NOT NULL AND PromoRank > 0, PromoRank, IF(Content IS NOT NULL, POW(LENGTH(Content)/$max, 0.25)*50, 0)) / FLOOR(DATEDIFF(NOW(), Created) / 7)+1'; 
	
	// Make a new set of picks
	static function recalculate() {
		DB::query('DELETE FROM PromoRankedPick');

		$date = getdate();
		$ids = array();
		
		$maxes = array();
		
		foreach (HasPromosDecorator::getPromoPages() as $page) {
			foreach ($page->AllSections() as $section) {
				$template = $section->Template();
				$itemProvider = $template->ItemProvider();
								
				// If we don't know the maximum length for this itemProvider yet, we need to calculate it so we can assign an automatic rank from 0..50 later based on length.
				if (!isset($maxes[$itemProvider->class])) {
					$query = $itemProvider->Query($page);
					$query->select = array('MAX(LENGTH(Content)) as MaxLength');

					foreach ($query->execute() as $record) { $maxes[$itemProvider->class] = array_shift($record); break; }
				}
				
				if ($template->stat('fill_strategy') == 'PromoRankedPickFillStrategy') foreach ($template->Spots() as $spot) {
					
					$query = $itemProvider->Query($page);
					$table = array_shift(array_keys($query->from));
					if (@$ids[$table]) $query->where("`{$table}`.ID NOT IN (".implode(',', $ids[$table]).')'); 
					
					$query->orderby(str_replace('$max', 40000, self::$rank) . ' DESC');
					$query->limit('1');
					singleton($table)->extend('augmentSQL', $query);
					
					$item = null;
					foreach ($query->execute() as $record) {
						$item = $itemProvider->Item($record);
						break; 
					}
					
					if ($item) {
						$rankedPick = new PromoRankedPick(array('PromoSectionID' => $section->ID, 'Spot' => $spot, 'Day' => $date['yday'], 'ItemID' => $item->ID, 'ItemClassName' => $item->ClassName));
						$rankedPick->write();
						
						if (!isset($ids[$table])) $ids[$table] = array();
						$ids[$table][] = $item->ID;
					}
					else {
						$rankedPick = new PromoRankedPick(array('PromoSectionID' => $section->ID, 'Spot' => $spot, 'Day' => $date['yday'], 'ItemID' => 0));
						$rankedPick->write();
					}
				}
			}
		}
	}
	
	function Item() {
		return $this->ItemID ? DataObject::get_by_id($this->ItemClassName, $this->ItemID) : null;
	}
}

PromoRankedPick::init_db_fields();