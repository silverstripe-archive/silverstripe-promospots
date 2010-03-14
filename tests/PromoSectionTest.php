<?php

class PromoSectionTest extends FunctionalTest {

	static $fixture_file = 'promospots/tests/PromoSectionTest.yml';
	
	function testspot() {
		
		$promoSection = $this->objFromFixture('PromoSection', 'section1');
		$this->assertEquals(count($promoSection->PromoSpots()->toArray()), 2);
		
		$promoSection2 = $this->objFromFixture('PromoSection', 'section2');
		$this->assertEquals(count($promoSection2->PromoSpots()->toArray()), 0);
		
	}
	
	function testTemplate() {
		
		$promoSection = $this->objFromFixture('PromoSection', 'section1');
		$this->assertEquals($promoSection->Template()->class, 'PromoSectionSingleWithPhoto');

	}
	
	function testInfo() {
		
		$promoSection = $this->objFromFixture('PromoSection', 'section1');
		$resp = $promoSection->Template()->Info();
		$this->assertEquals(count($resp), 3);
		$this->assertEquals($resp['name'], 'SingleWithPhoto');
		
	}
	
	function testUnexpiredSpots() {
		
		$this->setUnexpiredSpots();
		$promoSection = $this->objFromFixture('PromoSection', 'section1');
		$resp = $promoSection->UnexpiredSpots();
		$this->assertEquals($resp->Count(),2);
		
		$this->setUnexpiredSpots();
		$promoSection = $this->objFromFixture('PromoSection', 'section1');
		$resp = $promoSection->UnexpiredSpots();
		$this->assertEquals($resp->Count(),2);
		
		$this->setExpiredSpots();
		$promoSection = $this->objFromFixture('PromoSection', 'section1');
		$resp = $promoSection->UnexpiredSpots();
		$this->assertNull($resp);
		
	}
	
	
	//change promospot start
	private function setUnexpiredSpots(){
		
		$today = gmmktime(0, 0, 0, date('m'), date('d'), date('Y'));
		$today = $today/86400;
		
		for($i=1;$i<3;$i++){
			${"PromoSpot$i"} = DataObject::get_one('PromoSpot', "ID = $i");
		}
		
		$PromoSpot1->Start = $today;
		$PromoSpot1->length = 3;
		$PromoSpot1->write();
		
		$PromoSpot2->Start = $today;
		$PromoSpot2->length = 3;
		$PromoSpot2->write();
		
	}
	
	//change promospot start
	private function setExpiredSpots(){
		
		$past = gmmktime(0, 0, 0, date('m'), date('d'), date('Y')-1);
		$past = $past/86400;
		
		for($i=1;$i<3;$i++){
			${"PromoSpot$i"} = DataObject::get_one('PromoSpot', "ID = $i");
		}
		
		$PromoSpot1->Start = $past;
		$PromoSpot1->length = 3;
		$PromoSpot1->write();
		
		$PromoSpot2->Start = $past;
		$PromoSpot2->length = 3;
		$PromoSpot2->write();
		
	}
	
	
}

?>