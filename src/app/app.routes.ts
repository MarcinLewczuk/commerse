import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { ProductsComponent } from './pages/products/products.component';
import { ProductInfoComponent } from './pages/products/product-info/product-info.component';
import { AiAssistantComponent } from './pages/ai-assistant/ai-assistant.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        title: 'Home - Commerse'
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
        path: 'login',
        component: LoginComponent,
        title: 'Login'
    },
    {
        path: 'signup',
        component: SignupComponent,
        title: 'Signup'
    },
    {
        path: 'ai-assistant',
        component: AiAssistantComponent,
        title: 'AI Assistant'
    }
];
