# William Metal - Database Schema Design

## Data Structure Overview
The application uses a JSON-based data structure stored in localStorage for persistence. This provides a lightweight, client-side database solution perfect for a metal products management system.

## Core Data Models

### 1. Products Collection
```javascript
{
  "products": [
    {
      "id": "prod_001",
      "name_ar": "تيب روند مويان 1.5",
      "name_en": "Medium Round Tube 1.5",
      "category": "أنابيب دائرية (Round Tubes)",
      "description": "أنبوب دائري متوسط السمك 1.5 ملم",
      "image": "resources/product-tube.jpg",
      "variants": [
        {
          "id": "var_001_001",
          "specification": "1.5/16",
          "sku": "WM-0001",
          "price": 25.50,
          "cost": 18.00,
          "stock": 150,
          "min_stock": 20,
          "max_stock": 200
        }
      ],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ]
}
```

### 2. Inventory Collection
```javascript
{
  "inventory": [
    {
      "id": "inv_001",
      "product_id": "prod_001",
      "variant_id": "var_001_001",
      "type": "IN", // IN, OUT, ADJUSTMENT
      "quantity": 50,
      "reference_type": "PURCHASE", // PURCHASE, SALE, ADJUSTMENT
      "reference_id": "pur_001",
      "notes": "Purchase from supplier XYZ",
      "created_at": "2024-01-20T10:00:00Z",
      "created_by": "user_001"
    }
  ]
}
```

### 3. Sales Collection
```javascript
{
  "sales": [
    {
      "id": "sale_001",
      "invoice_number": "INV-2024-001",
      "customer": {
        "name": "شركة البناء الحديث",
        "phone": "+212612345678",
        "address": "الدار البيضاء، المغرب"
      },
      "items": [
        {
          "product_id": "prod_001",
          "variant_id": "var_001_001",
          "quantity": 10,
          "unit_price": 25.50,
          "total_price": 255.00
        }
      ],
      "subtotal": 255.00,
      "tax": 25.50,
      "total": 280.50,
      "payment_method": "CASH", // CASH, CREDIT, CHECK
      "status": "COMPLETED", // PENDING, COMPLETED, CANCELLED
      "created_at": "2024-01-20T15:30:00Z",
      "created_by": "user_001"
    }
  ]
}
```

### 4. Purchases Collection
```javascript
{
  "purchases": [
    {
      "id": "pur_001",
      "purchase_number": "PO-2024-001",
      "supplier": {
        "name": "موردون الحديد والصلب",
        "contact": "أحمد محمد",
        "phone": "+212633456789",
        "address": "مراكش، المغرب"
      },
      "items": [
        {
          "product_id": "prod_001",
          "variant_id": "var_001_001",
          "quantity": 50,
          "unit_cost": 18.00,
          "total_cost": 900.00
        }
      ],
      "subtotal": 900.00,
      "tax": 90.00,
      "total": 990.00,
      "payment_status": "PAID", // PENDING, PAID, PARTIAL
      "delivery_status": "DELIVERED", // PENDING, DELIVERED, PARTIAL
      "created_at": "2024-01-18T09:00:00Z",
      "created_by": "user_001"
    }
  ]
}
```

### 5. Users Collection
```javascript
{
  "users": [
    {
      "id": "user_001",
      "username": "admin",
      "full_name": "مدير النظام",
      "email": "admin@williammetal.com",
      "role": "ADMIN", // ADMIN, MANAGER, EMPLOYEE
      "permissions": ["all"],
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 6. Settings Collection
```javascript
{
  "settings": {
    "company": {
      "name": "William Metal",
      "address": "الدار البيضاء، المغرب",
      "phone": "+212522123456",
      "email": "info@williammetal.com",
      "tax_rate": 10,
      "currency": "MAD"
    },
    "inventory": {
      "low_stock_threshold": 20,
      "auto_reorder_point": 50,
      "default_supplier": "sup_001"
    },
    "notifications": {
      "low_stock_alert": true,
      "daily_report": true,
      "email_notifications": true
    }
  }
}
```

## Data Relationships

### Product-Variant Relationship
- One product can have multiple variants
- Each variant has unique specifications (size, thickness, etc.)
- Stock is tracked at the variant level

### Inventory-Transaction Relationship
- Inventory movements are linked to sales, purchases, or manual adjustments
- Each movement updates the stock level of the corresponding variant

### Sales-Customer Relationship
- Each sale is associated with a customer
- Customer information is stored directly in the sale record for historical accuracy

### Purchase-Supplier Relationship
- Each purchase is associated with a supplier
- Supplier information is stored directly in the purchase record

## Data Validation Rules

### Product Validation
- Product name (Arabic) is required
- Category must be from predefined list
- At least one variant is required

### Variant Validation
- Specification must be unique within product
- SKU must be unique across all variants
- Price must be positive number

### Transaction Validation
- Quantity must be positive integer
- Reference ID must exist (for linked transactions)
- Stock cannot go below zero for sales

### User Validation
- Username must be unique
- Email must be valid format
- Role must be from predefined list

## Performance Considerations

### Indexing Strategy
- Primary keys: id fields for all collections
- Foreign keys: product_id, variant_id for relationships
- Search keys: name_ar, name_en, category for products

### Data Access Patterns
- Products: Frequently read, occasionally updated
- Inventory: High read/write frequency
- Sales/Purchases: Write-once, read-many
- Users: Low frequency, mostly reads

### Storage Optimization
- Use compression for large text fields
- Store images as file paths, not base64
- Implement pagination for large datasets
- Cache frequently accessed data in memory