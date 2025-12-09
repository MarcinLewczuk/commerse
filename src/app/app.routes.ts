import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ShopsComponent } from './pages/shops/shops.component';
import { ShopDetailComponent } from './pages/shop-detail/shop-detail.component';
import { ProductInfoComponent } from './pages/products/product-info/product-info.component';
import { AiAssistantComponent } from './pages/ai-assistant/ai-assistant.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SellerDashboardComponent } from './pages/seller/seller-dashboard.component';

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
        path: 'products/:slug',
        component: ProductInfoComponent,
        title: 'Product'
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
        path: 'callback',
        loadComponent: () =>
            import('../app/components/callback.component').then(m => m.CallbackComponent)
    }
];
