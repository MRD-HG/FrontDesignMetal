# William Metal Management System - Project Outline

## Project Structure
```
/mnt/okcomputer/output/
├── index.html              # Main dashboard page
├── products.html           # Product management page  
├── inventory.html          # Inventory management page
├── sales.html              # Sales and invoice management page
├── purchases.html          # Purchases and suppliers page
├── main.js                 # Core JavaScript functionality
├── products_catalog.json   # Product data structure
├── resources/              # Images and assets folder
│   ├── hero-metal.jpg      # Hero image for metal products
│   ├── bg-texture.jpg      # Background texture
│   └── product-*.jpg       # Product category images
└── README.md              # Project documentation
```

## Page Descriptions

### 1. index.html - Main Dashboard
- **Purpose**: Central hub with analytics and quick actions
- **Features**:
  - Sales metrics and revenue charts
  - Stock alerts and low inventory warnings
  - Recent transactions overview
  - Quick action buttons for common tasks
  - Interactive data visualizations using ECharts.js
- **Design**: Modern dashboard with cards, charts, and real-time data

### 2. products.html - Product Management
- **Purpose**: Complete product catalog management
- **Features**:
  - Product grid with images and specifications
  - Add/edit/delete products
  - Product variants management
  - Category filtering and search
  - Bulk operations
- **Design**: Grid layout with product cards and detailed modals

### 3. inventory.html - Inventory Management  
- **Purpose**: Stock tracking and inventory control
- **Features**:
  - Real-time stock levels
  - Stock movement history
  - Low stock alerts
  - Stock adjustment tools
  - Inventory reports
- **Design**: Table-based layout with filtering and sorting

### 4. sales.html - Sales Management
- **Purpose**: Invoice generation and sales tracking
- **Features**:
  - Create new invoices
  - Customer management
  - Product selection with auto-complete
  - Automatic stock deduction
  - Sales history and reports
- **Design**: Form-based interface with invoice preview

### 5. purchases.html - Purchases Management
- **Purpose**: Supplier and purchase order management
- **Features**:
  - Record purchases from suppliers
  - Supplier management
  - Automatic stock addition
  - Purchase history
  - Cost tracking
- **Design**: Form-based with supplier selection and history

## Technical Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS for responsive design
- **Charts**: ECharts.js for data visualization
- **Icons**: Font Awesome
- **Animations**: Anime.js for smooth transitions
- **Data**: JSON-based storage with localStorage persistence
- **UI Components**: Custom-built with Tailwind CSS

## Key Features
1. **Responsive Design**: Mobile-first approach
2. **Real-time Updates**: Live data synchronization
3. **Search & Filter**: Advanced filtering across all modules
4. **Data Export**: CSV/PDF export capabilities
5. **User Management**: Role-based access control
6. **Analytics**: Comprehensive reporting and insights