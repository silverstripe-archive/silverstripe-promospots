<?php

class PromoSpotTest extends FunctionalTest {

	static $fixture_file = 'promospots/tests/PromoSpotsTest.yml';
	
	function testItem() {
		
		$promoSpot = $this->objFromFixture('PromoSpot', 'spot1');
		$this->assertEquals($promoSpot->Item()->ClassName, 'ArticlePage');
		
	}
	
	function testInfo() {
		
		$promoSpot = $this->objFromFixture('PromoSpot', 'spot1');
		$this->assertEquals($promoSpot->Info(), array('start' => "14678", "length" => "12", "id" => "Page:100", "label" => "article 100" ));
	
	}
	
}

?>