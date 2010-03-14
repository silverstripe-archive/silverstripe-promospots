<?php

class PromoAdminTest extends FunctionalTest {
	
	static $fixture_file = 'promospots/tests/PromoAdminTest.yml';
	

	function testPromoAdminOpens() {
		$this->autoFollowRedirection = false;
		$this->logInAs('admin');
		$this->assertTrue((bool)Permission::check("ADMIN"));
		$this->assertEquals($this->get('PromoAdminTest_Admin')->getStatusCode(),200);
	}
	
	function testPageSelectorField() {
		
		$this->autoFollowRedirection = false;
		$this->logInAs('admin');
		$this->assertEquals($this->get('PromoAdminTest_Admin/PageSelectorField')->getBody(),'<select id="PageID" name="PageID"></select>');
	}

	
	
	
}

class PromoAdminTest_Admin extends PromoAdmin {
	static $url_segment = 'testpromoadmin';
	
	public static $managed_models = array(
		'PromoAdminTest_Promo',
	);
}

class PromoAdminTest_Promo extends DataObject {
	static $db = array(
		"Name" => "Varchar"
	);
}


?>