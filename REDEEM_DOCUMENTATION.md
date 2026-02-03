# Redeem System Documentation

## Overview
The redeem system allows store owners to create and manage discount codes (coupons) that customers can use during checkout to receive discounts on their purchases.

## Features
- **Flexible Discount Types**: Percentage-based or fixed amount discounts
- **Usage Limits**: Set maximum usage counts per code
- **Date Validity**: Configure start and end dates for codes
- **Minimum Purchase**: Require minimum purchase amounts
- **Product/Category Restrictions**: Apply codes to specific products or categories
- **Usage Tracking**: Track who used the code and when

## API Endpoints

### Admin Operations (Authentication Required)

#### Create Redeem Code
```
POST /api/redeems/:storeId/redeems
```
Body:
```json
{
  "code": "SUMMER2024",
  "discountType": "percentage",
  "discountValue": 20,
  "minPurchaseAmount": 100,
  "maxDiscountAmount": 50,
  "maxUsageCount": 100,
  "validFrom": "2024-06-01",
  "validUntil": "2024-08-31",
  "description": "Summer sale discount",
  "applicableProducts": [],
  "applicableCategories": []
}
```

#### Update Redeem Code
```
PUT /api/redeems/:storeId/redeems/:redeemId
```

#### Delete Redeem Code
```
DELETE /api/redeems/:storeId/redeems/:redeemId
```

#### Get All Redeem Codes
```
GET /api/redeems/:storeId/redeems?page=1&limit=10&isActive=true&search=SUMMER
```

#### Get Single Redeem Code
```
GET /api/redeems/:storeId/redeems/:redeemId
```

### Public Operations (No Authentication Required)

#### Validate Redeem Code
```
POST /api/redeems/:storeId/redeems/validate
```
Body:
```json
{
  "code": "SUMMER2024",
  "totalAmount": 150,
  "products": [
    {
      "productId": "60f7b3b3b3b3b3b3b3b3b3b3",
      "quantity": 2
    }
  ]
}
```

Response:
```json
{
  "valid": true,
  "message": "الكود صالح",
  "discountAmount": 30,
  "discountType": "percentage",
  "discountValue": 20,
  "redeemId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

#### Apply Redeem Code
```
POST /api/redeems/:storeId/redeems/:redeemId/apply
```
Body:
```json
{
  "customerId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "orderId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

## Model Schema

### Redeem Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| storeId | ObjectId | Yes | Reference to the store |
| code | String | Yes | Unique code (4-20 characters, uppercase) |
| discountType | String | Yes | "percentage" or "fixed" |
| discountValue | Number | Yes | Discount value (% or fixed amount) |
| minPurchaseAmount | Number | No | Minimum purchase amount (default: 0) |
| maxDiscountAmount | Number | No | Maximum discount cap for percentage discounts |
| maxUsageCount | Number | No | Maximum times code can be used |
| usageCount | Number | Yes | Current usage count (default: 0) |
| validFrom | Date | Yes | Start date of validity |
| validUntil | Date | Yes | End date of validity |
| isActive | Boolean | Yes | Whether code is active (default: true) |
| description | String | No | Description of the offer |
| applicableProducts | [ObjectId] | No | Specific products this code applies to |
| applicableCategories | [ObjectId] | No | Specific categories this code applies to |
| usedBy | Array | No | Array of usage records with customer, order, and timestamp |

## Usage Examples

### Example 1: Create a 20% off code
```javascript
const response = await fetch('/api/redeems/storeId123/redeems', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    code: 'SAVE20',
    discountType: 'percentage',
    discountValue: 20,
    validUntil: '2024-12-31'
  })
});
```

### Example 2: Create a fixed $10 discount
```javascript
const response = await fetch('/api/redeems/storeId123/redeems', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    code: 'SAVE10',
    discountType: 'fixed',
    discountValue: 10,
    minPurchaseAmount: 50,
    validUntil: '2024-12-31'
  })
});
```

### Example 3: Validate a code during checkout
```javascript
const response = await fetch('/api/redeems/storeId123/redeems/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'SAVE20',
    totalAmount: 100,
    products: [
      { productId: 'prod123', quantity: 2 }
    ]
  })
});

const result = await response.json();
if (result.valid) {
  console.log(`Discount: ${result.discountAmount}`);
}
```

## Validation Rules

The system validates the following when checking a redeem code:

1. **Code Exists**: The code must exist in the database
2. **Active Status**: The code must be active (isActive: true)
3. **Date Validity**: Current date must be between validFrom and validUntil
4. **Usage Limit**: If maxUsageCount is set, current usageCount must be less than it
5. **Minimum Purchase**: Total amount must be >= minPurchaseAmount
6. **Product/Category Restrictions**: If applicable products or categories are set, at least one item in the order must match
7. **Maximum Discount**: For percentage discounts, the discount is capped at maxDiscountAmount if set

## Integration with Orders

To integrate the redeem system with your order flow:

1. **During Checkout**: Call the validate endpoint to check if the code is valid
2. **Display Discount**: Show the discount amount to the customer
3. **After Order Creation**: Call the apply endpoint to record the usage
4. **Store Discount**: Save the discountAmount and redeemId in your order record

## Security Considerations

- Admin operations (create, update, delete, list) require authentication
- Public operations (validate, apply) are accessible without authentication for store customers
- Store access is validated to ensure users can only manage their own store's codes
- Codes are automatically converted to uppercase for consistency
- Usage tracking prevents fraud by recording customer and order IDs

## Error Handling

The API returns appropriate HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad request (invalid data)
- 403: Forbidden (not authorized)
- 404: Not found
- 500: Server error

Error responses include a descriptive message in Arabic to help identify the issue.
