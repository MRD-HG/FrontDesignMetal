// William Metal Management System - Main JavaScript
// Core functionality for the entire application

// Flag: use remote backend if available
const USE_REMOTE_API = true; // set false to force localStorage-only

async function remoteAvailable() {
    if (!USE_REMOTE_API) return false;
    try {
        // quick ping - adjust endpoint if backend exposes /health
        const base = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : (window.location ? window.location.origin : '');
        const res = await fetch(`${base}/api/health`, { method: 'GET' });
        return res.ok;
    } catch (e) {
        return false;
    }
}

// Provide lightweight bridging methods used by UI managers
async function fetchProductsRemote() {
    try {
        return await API.Products.list();
    } catch (e) {
        throw e;
    }
}

async function fetchProductRemote(id) {
    return API.Products.get(id);
}

async function createProductRemote(body) {
    return API.Products.create(body);
}

async function updateProductRemote(id, body) {
    return API.Products.update(id, body);
}

async function deleteProductRemote(id) {
    return API.Products.delete(id);
}

class WilliamMetalApp {
    constructor() {
        this.currentUser = null;
        this.data = {
            products: [],
            inventory: [],
            sales: [],
            purchases: [],
            users: [],
            settings: {}
        };
        this.init();
    }

    init() {
        this.loadData();
        this.initDefaultData();
        this.setupEventListeners();
        this.updateUI();
    }

    // Data Management
    loadData() {
        try {
            const savedData = localStorage.getItem('william_metal_data');
            if (savedData) {
                this.data = JSON.parse(savedData);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    saveData() {
        try {
            localStorage.setItem('william_metal_data', JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    initDefaultData() {
        // Initialize default settings
        if (!this.data.settings.company) {
            this.data.settings = {
                company: {
                    name: 'William Metal',
                    address: 'الدار البيضاء، المغرب',
                    phone: '+212522123456',
                    email: 'info@williammetal.com',
                    tax_rate: 10,
                    currency: 'MAD'
                },
                inventory: {
                    low_stock_threshold: 20,
                    auto_reorder_point: 50
                }
            };
        }

        // Initialize default admin user
        if (this.data.users.length === 0) {
            this.data.users.push({
                id: 'user_001',
                username: 'admin',
                password: 'admin123',
                full_name: 'مدير النظام',
                email: 'admin@williammetal.com',
                role: 'ADMIN',
                is_active: true,
                created_at: new Date().toISOString()
            });
        }

        // Initialize sample products if none exist
        if (this.data.products.length === 0) {
            this.loadSampleProducts();
        }

        this.saveData();
    }

    loadSampleProducts() {
        // Load products from the JSON catalog
        fetch('products_catalog.json')
            .then(response => {
                if (!response.ok) throw new Error('catalog missing');
                return response.json();
            })
            .then(products => {
                this.data.products = products.map((product, index) => ({
                    id: `prod_${String(index + 1).padStart(3, '0')}`,
                    ...product,
                    variants: (product.variants || []).map((variant, vIndex) => ({
                        ...variant,
                        id: `var_${String(index + 1).padStart(3, '0')}_${String(vIndex + 1).padStart(3, '0')}`,
                        price: variant.price || (Math.random() * 100 + 20),
                        cost: variant.cost || (Math.random() * 50 + 10),
                        stock: typeof variant.stock === 'number' ? variant.stock : Math.floor(Math.random() * 200),
                        min_stock: variant.min_stock ?? 20,
                        max_stock: variant.max_stock ?? 200
                    })),
                }));
                this.saveData();
            })
            .catch(err => {
                console.warn('products_catalog.json not available, using fallback data', err?.message || err);
                this.createFallbackProducts();
            });
    }

    createFallbackProducts() {
        this.data.products = [
            {
                id: 'prod_001',
                name_ar: 'تيب روند مويان 1.5',
                name_en: 'Medium Round Tube 1.5',
                category: 'أنابيب دائرية (Round Tubes)',
                description: 'أنبوب دائري متوسط السمك 1.5 ملم',
                image: 'https://kimi-web-img.moonshot.cn/img/www.ljtube.com/7985a1f3fc7087b3586946c774a190cc2a50580e.jpg',
                variants: [
                    {
                        id: 'var_001_001',
                        specification: '1.5/16',
                        sku: 'WM-RT15-16',
                        price: 25.50,
                        cost: 18.00,
                        stock: 150,
                        min_stock: 20,
                        max_stock: 200
                    },
                    {
                        id: 'var_001_002',
                        specification: '1.5/20',
                        sku: 'WM-RT15-20',
                        price: 28.75,
                        cost: 20.00,
                        stock: 120,
                        min_stock: 20,
                        max_stock: 200
                    }
                ],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'prod_002',
                name_ar: 'تيب كاري مويان 1',
                name_en: 'Medium Square Tube 1',
                category: 'أنابيب مربعة (Square Tubes)',
                description: 'أنبوب مربع متوسط السمك 1 ملم',
                image: 'https://kimi-web-img.moonshot.cn/img/m.media-amazon.com/9be6563cb17b4de6438e8fe64a004603d0bc1295.jpg',
                variants: [
                    {
                        id: 'var_002_001',
                        specification: '1/16',
                        sku: 'WM-ST1-16',
                        price: 32.00,
                        cost: 24.00,
                        stock: 85,
                        min_stock: 15,
                        max_stock: 150
                    },
                    {
                        id: 'var_002_002',
                        specification: '1/20',
                        sku: 'WM-ST1-20',
                        price: 35.50,
                        cost: 26.50,
                        stock: 95,
                        min_stock: 15,
                        max_stock: 150
                    }
                ],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
    }

    // Authentication
    login(username, password) {
        const user = this.data.users.find(u => 
            u.username === username && u.password === password && u.is_active
        );
        
        if (user) {
            this.currentUser = user;
            localStorage.setItem('william_metal_user', JSON.stringify(user));
            return { success: true, user };
        }
        
        return { success: false, message: 'Invalid username or password' };
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('william_metal_user');
        window.location.href = 'index.html';
    }

    checkAuth() {
        const savedUser = localStorage.getItem('william_metal_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            return true;
        }
        return false;
    }

    // Product Management
    getProducts(filters = {}) {
        let products = [...this.data.products];
        
        if (filters.category) {
            products = products.filter(p => p.category === filters.category);
        }
        
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            products = products.filter(p => 
                p.name_ar.toLowerCase().includes(searchTerm) ||
                p.name_en.toLowerCase().includes(searchTerm) ||
                p.category.toLowerCase().includes(searchTerm)
            );
        }
        
        return products;
    }

    getProduct(id) {
        return this.data.products.find(p => p.id === id);
    }

    addProduct(productData) {
        const newProduct = {
            id: `prod_${String(this.data.products.length + 1).padStart(3, '0')}`,
            ...productData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        this.data.products.push(newProduct);
        this.saveData();
        return newProduct;
    }

    updateProduct(id, updates) {
        const index = this.data.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.products[index] = {
                ...this.data.products[index],
                ...updates,
                updated_at: new Date().toISOString()
            };
            this.saveData();
            return this.data.products[index];
        }
        return null;
    }

    deleteProduct(id) {
        const index = this.data.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.products.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }

    // Inventory Management
    getStockAlerts() {
        const alerts = [];
        
        this.data.products.forEach(product => {
            product.variants.forEach(variant => {
                if (variant.stock <= variant.min_stock) {
                    alerts.push({
                        product: product.name_ar,
                        variant: variant.specification,
                        current_stock: variant.stock,
                        min_stock: variant.min_stock,
                        type: variant.stock === 0 ? 'out_of_stock' : 'low_stock'
                    });
                }
            });
        });
        
        return alerts;
    }

    updateStock(productId, variantId, quantity, type, reference = null) {
        const product = this.getProduct(productId);
        if (!product) return false;
        
        const variant = product.variants.find(v => v.id === variantId);
        if (!variant) return false;
        
        // Update stock based on type
        if (type === 'IN') {
            variant.stock += quantity;
        } else if (type === 'OUT') {
            if (variant.stock < quantity) return false; // Insufficient stock
            variant.stock -= quantity;
        }
        
        // Record inventory movement
        this.data.inventory.push({
            id: `inv_${String(this.data.inventory.length + 1).padStart(4, '0')}`,
            product_id: productId,
            variant_id: variantId,
            type: type,
            quantity: quantity,
            reference: reference,
            created_at: new Date().toISOString(),
            created_by: this.currentUser?.id
        });
        
        this.saveData();
        return true;
    }

    // Sales Management
    createSale(saleData) {
        const newSale = {
            id: `sale_${String(this.data.sales.length + 1).padStart(4, '0')}`,
            invoice_number: `INV-${new Date().getFullYear()}-${String(this.data.sales.length + 1).padStart(4, '0')}`,
            ...saleData,
            created_at: new Date().toISOString(),
            created_by: this.currentUser?.id
        };
        
        // Update stock for each item
        let stockUpdated = true;
        newSale.items.forEach(item => {
            const success = this.updateStock(
                item.product_id,
                item.variant_id,
                item.quantity,
                'OUT',
                { type: 'SALE', id: newSale.id }
            );
            if (!success) stockUpdated = false;
        });
        
        if (stockUpdated) {
            this.data.sales.push(newSale);
            this.saveData();
            return newSale;
        }
        
        return null;
    }

    // Purchase Management
    createPurchase(purchaseData) {
        const newPurchase = {
            id: `pur_${String(this.data.purchases.length + 1).padStart(4, '0')}`,
            purchase_number: `PO-${new Date().getFullYear()}-${String(this.data.purchases.length + 1).padStart(4, '0')}`,
            ...purchaseData,
            created_at: new Date().toISOString(),
            created_by: this.currentUser?.id
        };
        
        // Update stock for each item
        newPurchase.items.forEach(item => {
            this.updateStock(
                item.product_id,
                item.variant_id,
                item.quantity,
                'IN',
                { type: 'PURCHASE', id: newPurchase.id }
            );
        });
        
        this.data.purchases.push(newPurchase);
        this.saveData();
        return newPurchase;
    }

    // Analytics and Reports
    getDashboardStats() {
        const totalProducts = this.data.products.length;
        const totalVariants = this.data.products.reduce((sum, p) => sum + p.variants.length, 0);
        const totalStockValue = this.data.products.reduce((sum, p) => {
            return sum + p.variants.reduce((variantSum, v) => {
                return variantSum + (v.stock * v.cost);
            }, 0);
        }, 0);
        
        const totalSales = this.data.sales.reduce((sum, s) => sum + s.total, 0);
        const totalPurchases = this.data.purchases.reduce((sum, p) => sum + p.total, 0);
        const stockAlerts = this.getStockAlerts().length;
        
        return {
            totalProducts,
            totalVariants,
            totalStockValue,
            totalSales,
            totalPurchases,
            stockAlerts
        };
    }

    getSalesChartData() {
        const last30Days = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const daySales = this.data.sales.filter(s => 
                s.created_at.split('T')[0] === dateStr
            );
            
            const totalAmount = daySales.reduce((sum, s) => sum + s.total, 0);
            
            last30Days.push({
                date: dateStr,
                amount: totalAmount,
                count: daySales.length
            });
        }
        
        return last30Days;
    }

    // Utility Functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-MA', {
            style: 'currency',
            currency: this.data.settings.company?.currency || 'MAD'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ar-MA');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        } text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    setupEventListeners() {
        // Global event listeners
        document.addEventListener('click', (e) => {
            // Handle logout button
            if (e.target.matches('[data-action="logout"]')) {
                e.preventDefault();
                this.logout();
            }
            
            // Handle navigation
            if (e.target.matches('[data-nav]')) {
                e.preventDefault();
                const page = e.target.getAttribute('data-nav');
                window.location.href = page;
            }
        });
    }

    updateUI() {
        // Update UI elements that need to reflect current data
        this.updateNavigation();
        this.updateUserInfo();
    }

    updateNavigation() {
        const navItems = document.querySelectorAll('[data-nav]');
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        navItems.forEach(item => {
            const page = item.getAttribute('data-nav');
            if (page === currentPage) {
                item.classList.add('active');
            }
        });
    }

    updateUserInfo() {
        const userElements = document.querySelectorAll('[data-user-info]');
        userElements.forEach(element => {
            const info = element.getAttribute('data-user-info');
            if (info === 'name' && this.currentUser) {
                element.textContent = this.currentUser.full_name;
            }
        });
    }
}

// Initialize the application
const app = new WilliamMetalApp();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WilliamMetalApp;
}
