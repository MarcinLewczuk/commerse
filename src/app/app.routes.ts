import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ShopsComponent } from './pages/shops/shops.component';
import { ShopDetailComponent } from './pages/shop-detail/shop-detail.component';
import { ProductsComponent } from './pages/products/products.component';
import { ProductInfoComponent } from './pages/products/product-info/product-info.component';
import { ServicesComponent } from './pages/services/services.component';
import { ServiceInfoComponent } from './pages/services/service-info/service-info.component';
import { BasketComponent } from './pages/basket/basket.component';
import { AiAssistantComponent } from './pages/ai-assistant/ai-assistant.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SellerDashboardComponent } from './pages/seller/seller-dashboard.component';
import { EditProductComponent } from './pages/seller/edit-product/edit-product.component';
import { CreateProductComponent } from './pages/seller/create-product/create-product.component';
import { CreateServiceComponent } from './pages/seller/create-service/create-service.component';
import { EditServiceComponent } from './pages/seller/edit-service/edit-service.component';
import { ServicesCalendarComponent } from './pages/seller/services-calendar/services-calendar.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        title: 'Home - Commerse'
    },
    {
        path: 'shops',
        component: ShopsComponent,
        title: 'Shops'
    },
    {
        path: 'shop/:id',
        component: ShopDetailComponent,
        title: 'Shop'
    },
    {
        path: 'products',
        component: ProductsComponent,
        title: 'Products'
    },
    {
        path: 'products/:slug',
        component: ProductInfoComponent,
        title: 'Product'
    },
    {
        path: 'services',
        component: ServicesComponent,
        title: 'Services'
    },
    {
        path: 'services/:slug',
        component: ServiceInfoComponent,
        title: 'Service'
    },
    {
        path: 'basket',
        component: BasketComponent,
        title: 'Shopping Basket'
    },
    {
        path: 'ai-assistant',
        component: AiAssistantComponent,
        title: 'AI Assistant'
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'Dashboard'
    },
    {
        path: 'seller/dashboard',
        component: SellerDashboardComponent,
        title: 'My Shop'
    },
    {
        path: 'seller/products/create',
        component: CreateProductComponent,
        title: 'Create Product'
    },
    {
        path: 'seller/products/:id/edit',
        component: EditProductComponent,
        title: 'Edit Product'
    },
    {
        path: 'seller/services/create',
        component: CreateServiceComponent,
        title: 'Create Service'
    },
    {
        path: 'seller/services/:id/edit',
        component: EditServiceComponent,
        title: 'Edit Service'
    },
    {
        path: 'seller/services/calendar',
        component: ServicesCalendarComponent,
        title: 'Services Calendar'
    },
    {
        path: 'callback',
        loadComponent: () =>
            import('../app/components/callback.component').then(m => m.CallbackComponent)
    }
];
