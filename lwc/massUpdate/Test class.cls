@isTest
public class Test_EposMassUpdateController {
@isTest
    static void testUpdateEposRecords() {
        // Create test data
        List<PLN_Plan__c> eposRecords = new List<PLN_Plan__c>();
        for(Integer i = 0; i < 5; i++) {
            PLN_Plan__c eposRecord = new PLN_Plan__c();
            eposRecord.Name = 'Test Epos ' + i;
            eposRecord.PLN_Period__c='28';
            eposRecord.DOM_30__c=false;
            eposRecord.DOM_40__c=false;
            eposRecord.DOM_50__c=false;
            eposRecord.Plan_Notification__c=false;
            // Set other required fields as needed
            eposRecords.add(eposRecord);
        }
        insert eposRecords;

        // Prepare CSV data with record IDs
        String csvData = '';
        for(PLN_Plan__c eposRecord : eposRecords) {
            csvData += eposRecord.Id + ',\n';
        }

        // Call the method under test
        Test.startTest();
        String result = EposMassUpdateController.updateEposRecords(csvData, new List<String>{'DOM_30', 'DOM_40'});
        Test.stopTest();

        // Verify the result
        System.assertEquals('Success', result, 'Expected the update operation to be successful');

        // Verify that the checkbox fields are updated on the Epos records
        for(PLN_Plan__c eposRecord : [SELECT Id,Plan_Notification__c, DOM_30__c, DOM_40__c FROM PLN_Plan__c WHERE Id IN :eposRecords]) {
            System.assertEquals(true,eposRecord.DOM_30__c, 'Expected PDL30 checkbox to be checked');
            System.assertEquals(false,eposRecord.DOM_40__c, 'Expected PDL40 checkbox to be checked');
            System.assertEquals(false,eposRecord.DOM_50__c, 'Expected PDL50 checkbox to be checked');
            System.assertEquals(true,eposRecord.Plan_Notification__c, 'Expected Plan Notification checkbox to be checked');
        }
    }
    
    @isTest
    static void testValidateIds() {
        // Test data setup
        List<PLN_Plan__c> plans = new List<PLN_Plan__c>();
        for (Integer i = 0; i < 5; i++) {
            plans.add(new PLN_Plan__c(Name = 'Test Plan ' + i));
        }
        insert plans;

        // Mark some records as deleted
        List<PLN_Plan__c> plansToDelete = [SELECT Id FROM PLN_Plan__c LIMIT 2];
        delete plansToDelete;

        // Prepare list of IDs to validate
        List<String> idsToValidate = new List<String>();
        for (PLN_Plan__c acc : plansToDelete) {
            idsToValidate.add(acc.Id);
        }
        idsToValidate.add(plans[2].Id); // Valid
        idsToValidate.add(plans[3].Id); // Valid
        idsToValidate.add('a0Z5g000009zXYZAAA'); // Invalid

        // Invoke the method to test
        Test.startTest();
        Map<String, List<String>> result = EposMassUpdateController.validateIds(idsToValidate);
        Test.stopTest();

        // Assertions
        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertEquals(2, result.get('validIds').size(), 'There should be 2 valid IDs');
        System.assertEquals(3, result.get('invalidIds').size(), 'There should be 3 invalid IDs');
        System.assert(result.get('validIds').contains(plans[2].Id), 'Valid IDs should contain the third account ID');
        System.assert(result.get('validIds').contains(plans[3].Id), 'Valid IDs should contain the fourth account ID');
        System.assert(result.get('invalidIds').contains(plansToDelete[0].Id), 'Invalid IDs should contain the first deleted account ID');
        System.assert(result.get('invalidIds').contains(plansToDelete[1].Id), 'Invalid IDs should contain the second deleted account ID');
        System.assert(result.get('invalidIds').contains('a0Z5g000009zXYZAAA'), 'Invalid IDs should contain the made-up invalid ID');
    }

}
