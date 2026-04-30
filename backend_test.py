#!/usr/bin/env python3
"""
Sattva E-commerce Backend API Test Suite
Tests all backend endpoints for functionality and integration
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SattvaAPITester:
    def __init__(self, base_url: str = "https://ecom-dashboard-pro-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Test data
        self.admin_token = None
        self.user_token = None
        self.test_product_id = None
        self.test_order_id = None
        self.test_category_id = None
        
        # Test results
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status}  {name}")
        if details:
            print(f"      {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    token: str = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make API request and validate response"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text, "status_code": response.status_code}
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test basic API health"""
        print("\n🔍 Testing API Health...")
        
        success, data = self.make_request('GET', '', expected_status=200)
        self.log_test("API Root Endpoint", success, 
                     f"Response: {data.get('message', 'No message')}")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication...")
        
        # Test admin login
        admin_data = {
            "email": "admin@sattva.in",
            "password": "Admin@1234"
        }
        
        success, response = self.make_request('POST', 'auth/login', admin_data)
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.log_test("Admin Login", True, "Token received")
        else:
            self.log_test("Admin Login", False, f"Response: {response}")
        
        # Test user registration (skip if already exists)
        test_user = {
            "name": "Test User",
            "email": "test@sattva.com",
            "password": "test123456",
            "phone": "9876543210"
        }
        
        success, response = self.make_request('POST', 'auth/register', test_user, expected_status=201)
        if success and 'user' in response:
            self.log_test("User Registration", True, 
                         f"User ID: {response.get('user', {}).get('id', 'Not found')}")
        elif response.get('detail') == 'Email already registered':
            self.log_test("User Registration", True, "User already exists (expected)")
        else:
            self.log_test("User Registration", False, f"Response: {response}")
        
        # Test user login
        user_login = {
            "email": "test@sattva.com",
            "password": "test123456"
        }
        
        success, response = self.make_request('POST', 'auth/login', user_login)
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            self.log_test("User Login", True, "Token received")
        else:
            self.log_test("User Login", False, f"Response: {response}")

    def test_categories_endpoints(self):
        """Test categories endpoints"""
        print("\n🔍 Testing Categories...")
        
        # Get categories (public)
        success, response = self.make_request('GET', 'categories')
        self.log_test("Get Categories", success, 
                     f"Found {len(response) if isinstance(response, list) else 0} categories")
        
        if not self.admin_token:
            self.log_test("Admin Category Operations", False, "No admin token available")
            return
        
        # Create category (admin only)
        category_data = {
            "name": "Test Category",
            "slug": "test-category",
            "description": "Test category for API testing",
            "isActive": True
        }
        
        success, response = self.make_request('POST', 'admin/categories', category_data, 
                                            self.admin_token, expected_status=201)
        if success and 'id' in response:
            self.test_category_id = response.get('id')
            self.log_test("Create Category", True, f"Category ID: {self.test_category_id}")
        else:
            self.log_test("Create Category", False, f"Response: {response}")

    def test_products_endpoints(self):
        """Test products endpoints"""
        print("\n🔍 Testing Products...")
        
        # Get products (public)
        success, response = self.make_request('GET', 'products')
        self.log_test("Get Products", success, 
                     f"Found {len(response.get('products', [])) if isinstance(response, dict) else 0} products")
        
        if not self.admin_token:
            self.log_test("Admin Product Operations", False, "No admin token available")
            return
        
        # Create product (admin only)
        product_data = {
            "name": "Test Product",
            "description": "Test product for API testing",
            "price": 999,
            "discountPrice": 799,
            "stock": 100,
            "category": "Wellness",
            "brand": "Test Brand",
            "tags": ["test", "api"],
            "isActive": True,
            "isFeatured": False
        }
        
        success, response = self.make_request('POST', 'admin/products', product_data, 
                                            self.admin_token, expected_status=201)
        if success and 'id' in response:
            self.test_product_id = response.get('id')
            self.log_test("Create Product", True, f"Product ID: {self.test_product_id}")
        else:
            self.log_test("Create Product", False, f"Response: {response}")

    def test_cart_endpoints(self):
        """Test cart endpoints"""
        print("\n🔍 Testing Cart...")
        
        if not self.user_token:
            self.log_test("Cart Operations", False, "No user token available")
            return
        
        # Generate a test cart ID
        test_cart_id = "test-cart-123"
        
        # Get cart
        success, response = self.make_request('GET', f'cart/{test_cart_id}')
        self.log_test("Get Cart", success, f"Cart items: {len(response.get('items', []))}")
        
        if not self.test_product_id:
            self.log_test("Add to Cart", False, "No test product available")
            return
        
        # Add to cart
        cart_item = {
            "product_id": self.test_product_id,
            "quantity": 2
        }
        
        success, response = self.make_request('POST', f'cart/{test_cart_id}/items', cart_item, 
                                            expected_status=200)
        self.log_test("Add to Cart", success, f"Response: {response.get('message', 'No message')}")

    def test_orders_endpoints(self):
        """Test orders endpoints"""
        print("\n🔍 Testing Orders...")
        
        if not self.user_token:
            self.log_test("Order Operations", False, "No user token available")
            return
        
        # Create order
        if not self.test_product_id:
            self.log_test("Create Order", False, "No test product available")
            return
            
        order_data = {
            "items": [
                {
                    "productId": self.test_product_id,
                    "quantity": 1
                }
            ],
            "shippingAddress": {
                "name": "Test User",
                "phone": "9876543210",
                "addressLine1": "123 Test Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            },
            "paymentMethod": "cod"
        }
        
        success, response = self.make_request('POST', 'orders', order_data, 
                                            self.user_token, expected_status=201)
        if success:
            self.test_order_id = response.get('id')
            self.log_test("Create Order", True, f"Order ID: {self.test_order_id}")
        else:
            self.log_test("Create Order", False, f"Response: {response}")
        
        # Get user orders
        success, response = self.make_request('GET', 'orders', token=self.user_token)
        self.log_test("Get User Orders", success, 
                     f"Found {len(response) if isinstance(response, list) else 0} orders")

    def test_admin_endpoints(self):
        """Test admin-specific endpoints"""
        print("\n🔍 Testing Admin Endpoints...")
        
        if not self.admin_token:
            self.log_test("Admin Operations", False, "No admin token available")
            return
        
        # Get admin dashboard stats
        success, response = self.make_request('GET', 'admin/dashboard/stats', token=self.admin_token)
        self.log_test("Admin Dashboard", success, f"Stats: {list(response.keys()) if isinstance(response, dict) else 'No data'}")
        
        # Get all orders (admin)
        success, response = self.make_request('GET', 'admin/orders', token=self.admin_token)
        self.log_test("Admin Get Orders", success, 
                     f"Found {len(response.get('orders', [])) if isinstance(response, dict) else 0} orders")
        
        # Get all users (admin)
        success, response = self.make_request('GET', 'admin/customers', token=self.admin_token)
        self.log_test("Admin Get Users", success, 
                     f"Found {len(response.get('customers', [])) if isinstance(response, dict) else 0} users")

    def test_public_endpoints(self):
        """Test public endpoints that don't require auth"""
        print("\n🔍 Testing Public Endpoints...")
        
        # Test banners
        success, response = self.make_request('GET', 'banners')
        self.log_test("Get Banners", success, 
                     f"Found {len(response) if isinstance(response, list) else 0} banners")
        
        # Test blog posts
        success, response = self.make_request('GET', 'blog')
        self.log_test("Get Blog Posts", success, 
                     f"Found {len(response) if isinstance(response, list) else 0} posts")

    def run_all_tests(self):
        """Run complete test suite"""
        print("╔══════════════════════════════════════════╗")
        print("║       SATTVA BACKEND API TEST SUITE     ║")
        print("╚══════════════════════════════════════════╝")
        
        # Run tests in order
        self.test_health_check()
        self.test_public_endpoints()
        self.test_auth_endpoints()
        self.test_categories_endpoints()
        self.test_products_endpoints()
        self.test_cart_endpoints()
        self.test_orders_endpoints()
        self.test_admin_endpoints()
        
        # Print results
        print(f"\n━━━━ RESULTS: {self.tests_passed}/{self.tests_run} passed ━━━━")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"   • {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Backend API tests mostly successful!")
            return 0
        else:
            print("⚠️  Multiple backend issues detected")
            return 1

def main():
    tester = SattvaAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())