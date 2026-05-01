"""
Phase 1 Backend API Testing Suite
Tests B2B/Vendor registration, approval workflows, and RBAC
"""

import requests
import sys
import time
from datetime import datetime
import uuid

class Phase1APITester:
    def __init__(self, base_url="https://ecom-dashboard-pro-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        
    def log(self, msg, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {msg}")
    
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        
        self.tests_run += 1
        self.log(f"\n{'='*60}")
        self.log(f"Test #{self.tests_run}: {name}")
        if description:
            self.log(f"Description: {description}")
        self.log(f"Endpoint: {method} {endpoint}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)
            
            self.log(f"Response Status: {response.status_code}")
            
            # Try to parse JSON response
            try:
                response_data = response.json()
                self.log(f"Response: {response_data}")
            except:
                response_data = response.text
                self.log(f"Response (text): {response_data[:200]}")
            
            # Check status code
            if response.status_code == expected_status:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status {response.status_code} matches expected {expected_status}", "SUCCESS")
                return True, response_data if isinstance(response_data, dict) else {}
            else:
                self.tests_failed += 1
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response_data
                })
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", "ERROR")
                return False, response_data if isinstance(response_data, dict) else {}
        
        except Exception as e:
            self.tests_failed += 1
            self.failed_tests.append({
                'name': name,
                'expected': expected_status,
                'actual': 'Exception',
                'error': str(e)
            })
            self.log(f"❌ FAILED - Exception: {str(e)}", "ERROR")
            return False, {}
    
    def test_admin_login(self):
        """Test legacy admin login"""
        self.log("\n" + "="*60)
        self.log("PHASE 1A: ADMIN LOGIN (Legacy Compatibility)")
        self.log("="*60)
        
        # Test with correct credentials
        success, response = self.run_test(
            "Admin Login (Legacy)",
            "POST",
            "auth_v2/login",
            200,
            data={
                "email": "admin@sattva.in",
                "password": "admin@1234"
            },
            description="Legacy admin should be able to login via new auth_v2 endpoint"
        )
        
        if success and response.get('data', {}).get('access_token'):
            self.admin_token = response['data']['access_token']
            self.log(f"Admin token obtained: {self.admin_token[:20]}...", "SUCCESS")
            return True
        else:
            self.log("Failed to obtain admin token", "ERROR")
            return False
    
    def test_b2b_registration(self):
        """Test B2B user registration"""
        self.log("\n" + "="*60)
        self.log("PHASE 1B: B2B REGISTRATION")
        self.log("="*60)
        
        # Generate unique identifiers
        timestamp = int(time.time())
        test_email = f"b2b_test_{timestamp}@example.com"
        test_gst = f"27AABCU{timestamp % 10000:04d}R1ZX"
        test_pan = f"AABCU{timestamp % 10000:04d}R"
        
        # Test successful B2B registration
        success, response = self.run_test(
            "B2B Registration - Success",
            "POST",
            "auth_v2/register-b2b",
            200,
            data={
                "email": test_email,
                "password": "Test@1234",
                "name": "Test B2B User",
                "phone": "9876543210",
                "company_name": "Test Company Pvt Ltd",
                "gst_number": test_gst,
                "pan_number": test_pan,
                "business_street": "123 Test Street",
                "business_city": "Mumbai",
                "business_state": "Maharashtra",
                "business_pincode": "400001",
                "contact_name": "Test Contact",
                "contact_designation": "Manager",
                "contact_phone": "9876543210",
                "contact_email": test_email,
                "business_type": "DISTRIBUTOR",
                "annual_turnover": 5000000,
                "years_in_business": 5
            },
            description="B2B user should be created with PENDING status"
        )
        
        if success:
            user_id = response.get('data', {}).get('user_id')
            approval_status = response.get('data', {}).get('approval_status')
            self.log(f"B2B User ID: {user_id}, Status: {approval_status}", "INFO")
            
            # Store for later tests
            self.b2b_user_id = user_id
            self.b2b_email = test_email
            self.b2b_password = "Test@1234"
            self.b2b_gst = test_gst
        
        # Wait a bit to avoid rate limiting
        time.sleep(1)
        
        # Test duplicate email
        self.run_test(
            "B2B Registration - Duplicate Email",
            "POST",
            "auth_v2/register-b2b",
            400,
            data={
                "email": test_email,  # Same email
                "password": "Test@1234",
                "name": "Another User",
                "phone": "9876543211",
                "company_name": "Another Company",
                "gst_number": "27AABCU9999R1ZX",
                "pan_number": "AABCU9999R",
                "business_street": "456 Test Street",
                "business_city": "Delhi",
                "business_state": "Delhi",
                "business_pincode": "110001",
                "contact_name": "Contact 2",
                "contact_designation": "Director",
                "contact_phone": "9876543211",
                "contact_email": "contact2@example.com"
            },
            description="Should reject duplicate email"
        )
        
        time.sleep(1)
        
        # Test duplicate GST
        self.run_test(
            "B2B Registration - Duplicate GST",
            "POST",
            "auth_v2/register-b2b",
            400,
            data={
                "email": f"another_{timestamp}@example.com",
                "password": "Test@1234",
                "name": "Another User",
                "phone": "9876543211",
                "company_name": "Another Company",
                "gst_number": test_gst,  # Same GST
                "pan_number": "AABCU9999R",
                "business_street": "456 Test Street",
                "business_city": "Delhi",
                "business_state": "Delhi",
                "business_pincode": "110001",
                "contact_name": "Contact 2",
                "contact_designation": "Director",
                "contact_phone": "9876543211",
                "contact_email": "contact2@example.com"
            },
            description="Should reject duplicate GST number"
        )
    
    def test_vendor_registration(self):
        """Test Vendor registration"""
        self.log("\n" + "="*60)
        self.log("PHASE 1B: VENDOR REGISTRATION")
        self.log("="*60)
        
        # Generate unique identifiers
        timestamp = int(time.time())
        test_email = f"vendor_test_{timestamp}@example.com"
        test_gstin = f"29AAACA{timestamp % 10000:04d}B1Z7"
        test_pan = f"AAACA{timestamp % 10000:04d}B"
        
        # Test successful vendor registration
        success, response = self.run_test(
            "Vendor Registration - Success",
            "POST",
            "auth_v2/register-vendor",
            200,
            data={
                "email": test_email,
                "password": "Test@1234",
                "name": "Test Vendor",
                "phone": "9876543210",
                "business_name": "Test Vendor Business",
                "store_name": f"Test Store {timestamp}",
                "gstin": test_gstin,
                "pan": test_pan,
                "account_holder_name": "Test Vendor",
                "account_number": "1234567890",
                "ifsc_code": "HDFC0001234",
                "bank_name": "HDFC Bank",
                "branch": "Test Branch",
                "account_type": "CURRENT",
                "identity_type": "PAN",
                "identity_number": test_pan
            },
            description="Vendor should be created with PENDING status and unique store_slug"
        )
        
        if success:
            vendor_id = response.get('data', {}).get('vendor_id')
            store_slug = response.get('data', {}).get('store_slug')
            approval_status = response.get('data', {}).get('approval_status')
            self.log(f"Vendor ID: {vendor_id}, Store Slug: {store_slug}, Status: {approval_status}", "INFO")
            
            # Store for later tests
            self.vendor_id = vendor_id
            self.vendor_email = test_email
            self.vendor_password = "Test@1234"
            self.vendor_gstin = test_gstin
        
        time.sleep(1)
        
        # Test duplicate GSTIN
        self.run_test(
            "Vendor Registration - Duplicate GSTIN",
            "POST",
            "auth_v2/register-vendor",
            400,
            data={
                "email": f"another_vendor_{timestamp}@example.com",
                "password": "Test@1234",
                "name": "Another Vendor",
                "phone": "9876543211",
                "business_name": "Another Business",
                "store_name": "Another Store",
                "gstin": test_gstin,  # Same GSTIN
                "pan": "AAACA9999B",
                "account_holder_name": "Another Vendor",
                "account_number": "9876543210",
                "ifsc_code": "ICIC0001234",
                "bank_name": "ICICI Bank",
                "branch": "Another Branch",
                "account_type": "CURRENT",
                "identity_type": "PAN",
                "identity_number": "AAACA9999B"
            },
            description="Should reject duplicate GSTIN"
        )
    
    def test_pending_login_blocking(self):
        """Test that PENDING users cannot login"""
        self.log("\n" + "="*60)
        self.log("PHASE 1C: LOGIN BLOCKING FOR PENDING USERS")
        self.log("="*60)
        
        # Test B2B pending login
        if hasattr(self, 'b2b_email'):
            success, response = self.run_test(
                "B2B Pending User Login - Should Block",
                "POST",
                "auth_v2/login",
                403,
                data={
                    "email": self.b2b_email,
                    "password": self.b2b_password
                },
                description="PENDING B2B user should get 403 with code B2B_NOT_APPROVED"
            )
            
            if not success and response.get('detail', {}).get('code') == 'B2B_NOT_APPROVED':
                self.log("✅ Correct error code: B2B_NOT_APPROVED", "SUCCESS")
        
        time.sleep(1)
        
        # Test Vendor pending login
        if hasattr(self, 'vendor_email'):
            success, response = self.run_test(
                "Vendor Pending User Login - Should Block",
                "POST",
                "auth_v2/login",
                403,
                data={
                    "email": self.vendor_email,
                    "password": self.vendor_password
                },
                description="PENDING vendor should get 403 with code VENDOR_NOT_APPROVED"
            )
            
            if not success and response.get('detail', {}).get('code') == 'VENDOR_NOT_APPROVED':
                self.log("✅ Correct error code: VENDOR_NOT_APPROVED", "SUCCESS")
    
    def test_admin_get_pending_queues(self):
        """Test admin can view pending queues"""
        self.log("\n" + "="*60)
        self.log("PHASE 1D: ADMIN PENDING QUEUES")
        self.log("="*60)
        
        if not self.admin_token:
            self.log("Skipping - no admin token", "WARNING")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get B2B pending users
        success, response = self.run_test(
            "Get B2B Pending Users",
            "GET",
            "admin_users/b2b-users?status=PENDING",
            200,
            headers=headers,
            description="Admin should see pending B2B users"
        )
        
        if success:
            count = len(response.get('data', []))
            self.log(f"Found {count} pending B2B users", "INFO")
        
        time.sleep(0.5)
        
        # Get Vendor pending users
        success, response = self.run_test(
            "Get Vendor Pending Users",
            "GET",
            "admin_users/vendors?status=PENDING",
            200,
            headers=headers,
            description="Admin should see pending vendors"
        )
        
        if success:
            count = len(response.get('data', []))
            self.log(f"Found {count} pending vendors", "INFO")
    
    def test_admin_approve_b2b(self):
        """Test admin can approve B2B user"""
        self.log("\n" + "="*60)
        self.log("PHASE 1E: ADMIN APPROVE B2B USER")
        self.log("="*60)
        
        if not self.admin_token or not hasattr(self, 'b2b_user_id'):
            self.log("Skipping - no admin token or B2B user", "WARNING")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Approve B2B user
        success, response = self.run_test(
            "Approve B2B User",
            "POST",
            f"admin_users/b2b-users/{self.b2b_user_id}/approve",
            200,
            data={"approval_note": "Test approval"},
            headers=headers,
            description="Admin should be able to approve B2B user"
        )
        
        if success:
            self.log("B2B user approved successfully", "SUCCESS")
            time.sleep(1)
            
            # Now test that approved user can login
            success, response = self.run_test(
                "Approved B2B User Login - Should Succeed",
                "POST",
                "auth_v2/login",
                200,
                data={
                    "email": self.b2b_email,
                    "password": self.b2b_password
                },
                description="Approved B2B user should be able to login"
            )
            
            if success:
                user_data = response.get('data', {}).get('user', {})
                b2b_status = user_data.get('b2b_status')
                company_name = user_data.get('company_name')
                self.log(f"B2B Status: {b2b_status}, Company: {company_name}", "INFO")
    
    def test_admin_approve_vendor(self):
        """Test admin can approve vendor"""
        self.log("\n" + "="*60)
        self.log("PHASE 1E: ADMIN APPROVE VENDOR")
        self.log("="*60)
        
        if not self.admin_token or not hasattr(self, 'vendor_id'):
            self.log("Skipping - no admin token or vendor", "WARNING")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Approve vendor
        success, response = self.run_test(
            "Approve Vendor",
            "POST",
            f"admin_users/vendors/{self.vendor_id}/approve",
            200,
            data={"approval_note": "Test approval"},
            headers=headers,
            description="Admin should be able to approve vendor"
        )
        
        if success:
            self.log("Vendor approved successfully", "SUCCESS")
            time.sleep(1)
            
            # Now test that approved vendor can login
            success, response = self.run_test(
                "Approved Vendor Login - Should Succeed",
                "POST",
                "auth_v2/login",
                200,
                data={
                    "email": self.vendor_email,
                    "password": self.vendor_password
                },
                description="Approved vendor should be able to login"
            )
            
            if success:
                user_data = response.get('data', {}).get('user', {})
                vendor_status = user_data.get('vendor_status')
                store_name = user_data.get('store_name')
                self.log(f"Vendor Status: {vendor_status}, Store: {store_name}", "INFO")
    
    def test_admin_reject_flow(self):
        """Test admin rejection flow"""
        self.log("\n" + "="*60)
        self.log("PHASE 1F: ADMIN REJECTION FLOW")
        self.log("="*60)
        
        if not self.admin_token:
            self.log("Skipping - no admin token", "WARNING")
            return
        
        # Create a new B2B user to reject
        timestamp = int(time.time())
        reject_email = f"b2b_reject_{timestamp}@example.com"
        reject_gst = f"27AABCU{timestamp % 10000:04d}R2ZX"
        
        success, response = self.run_test(
            "Create B2B User for Rejection Test",
            "POST",
            "auth_v2/register-b2b",
            200,
            data={
                "email": reject_email,
                "password": "Test@1234",
                "name": "Reject Test User",
                "phone": "9876543210",
                "company_name": "Reject Test Company",
                "gst_number": reject_gst,
                "pan_number": f"AABCU{timestamp % 10000:04d}R",
                "business_street": "123 Test Street",
                "business_city": "Mumbai",
                "business_state": "Maharashtra",
                "business_pincode": "400001",
                "contact_name": "Test Contact",
                "contact_designation": "Manager",
                "contact_phone": "9876543210",
                "contact_email": reject_email
            }
        )
        
        if success:
            reject_user_id = response.get('data', {}).get('user_id')
            time.sleep(1)
            
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            
            # Test rejection without reason (should fail)
            self.run_test(
                "Reject B2B User - No Reason (Should Fail)",
                "POST",
                f"admin_users/b2b-users/{reject_user_id}/reject",
                400,
                data={},
                headers=headers,
                description="Rejection should require a reason"
            )
            
            time.sleep(0.5)
            
            # Test rejection with reason
            success, response = self.run_test(
                "Reject B2B User - With Reason",
                "POST",
                f"admin_users/b2b-users/{reject_user_id}/reject",
                200,
                data={"rejection_reason": "Test rejection reason"},
                headers=headers,
                description="Admin should be able to reject with reason"
            )
            
            if success:
                time.sleep(1)
                
                # Test that rejected user gets proper error on login
                success, response = self.run_test(
                    "Rejected B2B User Login - Should Block",
                    "POST",
                    "auth_v2/login",
                    403,
                    data={
                        "email": reject_email,
                        "password": "Test@1234"
                    },
                    description="Rejected user should get B2B_REJECTED error with reason"
                )
                
                if not success:
                    error_code = response.get('detail', {}).get('code')
                    error_details = response.get('detail', {}).get('details', '')
                    if error_code == 'B2B_REJECTED' and 'Test rejection reason' in error_details:
                        self.log("✅ Correct rejection error with reason", "SUCCESS")
    
    def test_audit_logs(self):
        """Test audit logs endpoint"""
        self.log("\n" + "="*60)
        self.log("PHASE 1G: AUDIT LOGS")
        self.log("="*60)
        
        if not self.admin_token:
            self.log("Skipping - no admin token", "WARNING")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        success, response = self.run_test(
            "Get Audit Logs",
            "GET",
            "admin_users/audit-logs?limit=50",
            200,
            headers=headers,
            description="Admin should be able to view audit logs"
        )
        
        if success:
            logs = response.get('data', [])
            self.log(f"Found {len(logs)} audit log entries", "INFO")
            
            # Check for expected actions
            actions = [log.get('action') for log in logs]
            expected_actions = ['USER_LOGIN', 'B2B_USER_REGISTERED', 'VENDOR_REGISTERED', 
                              'APPROVE_B2B_USER', 'APPROVE_VENDOR', 'REJECT_B2B_USER']
            
            found_actions = [a for a in expected_actions if a in actions]
            self.log(f"Found actions: {found_actions}", "INFO")
    
    def test_legacy_endpoints(self):
        """Test that legacy B2C endpoints still work"""
        self.log("\n" + "="*60)
        self.log("PHASE 1H: LEGACY B2C ENDPOINTS (No Regression)")
        self.log("="*60)
        
        # Test legacy endpoints
        endpoints = [
            ("GET", "products", 200, "Get products"),
            ("GET", "banners", 200, "Get banners"),
            ("GET", "categories", 200, "Get categories"),
            ("GET", "blog", 200, "Get blog posts"),
        ]
        
        for method, endpoint, expected, desc in endpoints:
            self.run_test(
                f"Legacy: {desc}",
                method,
                endpoint,
                expected,
                description=f"Legacy endpoint should still work: {endpoint}"
            )
            time.sleep(0.3)
    
    def test_rbac_enforcement(self):
        """Test RBAC enforcement on admin endpoints"""
        self.log("\n" + "="*60)
        self.log("PHASE 1I: RBAC ENFORCEMENT")
        self.log("="*60)
        
        # Try to access admin endpoint without token
        self.run_test(
            "Admin Endpoint - No Token (Should Fail)",
            "GET",
            "admin_users/b2b-users",
            401,
            description="Admin endpoint should require authentication"
        )
        
        time.sleep(0.5)
        
        # Create a B2C user and try to access admin endpoint
        timestamp = int(time.time())
        b2c_email = f"b2c_test_{timestamp}@example.com"
        
        # Register B2C user
        success, response = self.run_test(
            "Register B2C User for RBAC Test",
            "POST",
            "auth_v2/register",
            200,
            data={
                "email": b2c_email,
                "password": "Test@1234",
                "name": "B2C Test User",
                "phone": "9876543210"
            }
        )
        
        if success:
            time.sleep(1)
            
            # Login as B2C user
            success, response = self.run_test(
                "B2C User Login",
                "POST",
                "auth_v2/login",
                200,
                data={
                    "email": b2c_email,
                    "password": "Test@1234"
                }
            )
            
            if success:
                b2c_token = response.get('data', {}).get('access_token')
                time.sleep(0.5)
                
                # Try to access admin endpoint with B2C token
                self.run_test(
                    "Admin Endpoint - B2C Token (Should Fail)",
                    "GET",
                    "admin_users/b2b-users",
                    403,
                    headers={'Authorization': f'Bearer {b2c_token}'},
                    description="B2C user should not have access to admin endpoints"
                )
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*80)
        self.log("TEST SUMMARY")
        self.log("="*80)
        self.log(f"Total Tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed} ✅")
        self.log(f"Failed: {self.tests_failed} ❌")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            self.log("\n" + "="*80)
            self.log("FAILED TESTS DETAILS")
            self.log("="*80)
            for i, test in enumerate(self.failed_tests, 1):
                self.log(f"\n{i}. {test['name']}")
                self.log(f"   Expected: {test['expected']}")
                self.log(f"   Actual: {test['actual']}")
                if 'response' in test:
                    self.log(f"   Response: {test['response']}")
                if 'error' in test:
                    self.log(f"   Error: {test['error']}")
        
        return 0 if self.tests_failed == 0 else 1


def main():
    """Main test runner"""
    print("\n" + "="*80)
    print("PHASE 1 BACKEND API TEST SUITE")
    print("Dr MediScie Unified Commerce Platform")
    print("="*80)
    
    tester = Phase1APITester()
    
    # Run all tests
    if not tester.test_admin_login():
        print("\n❌ CRITICAL: Admin login failed. Cannot proceed with admin tests.")
        print("Please check admin credentials and backend status.")
        return 1
    
    tester.test_b2b_registration()
    tester.test_vendor_registration()
    tester.test_pending_login_blocking()
    tester.test_admin_get_pending_queues()
    tester.test_admin_approve_b2b()
    tester.test_admin_approve_vendor()
    tester.test_admin_reject_flow()
    tester.test_audit_logs()
    tester.test_legacy_endpoints()
    tester.test_rbac_enforcement()
    
    # Print summary
    return tester.print_summary()


if __name__ == "__main__":
    sys.exit(main())
