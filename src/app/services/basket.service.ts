import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../models/product';
import { Service } from '../models/service';

export interface BasketItem {
  type: 'product' | 'service';
  item: Product | Service;
  quantity: number;
  addedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BasketService {
  private readonly STORAGE_KEY = 'commerse_basket';
  
  // Signal to hold basket items
  private basketItems = signal<BasketItem[]>([]);
  
  // Computed signals for derived state
  itemCount = computed(() => {
    return this.basketItems().reduce((total, item) => total + item.quantity, 0);
  });
  
  totalPrice = computed(() => {
    return this.basketItems().reduce((total, item) => {
      return total + (item.item.price * item.quantity);
    }, 0);
  });
  
  items = computed(() => this.basketItems());

  constructor() {
    this.loadFromStorage();
  }

  // Add item to basket
  addItem(type: 'product' | 'service', item: Product | Service, quantity: number = 1) {
    const currentItems = this.basketItems();
    const existingIndex = currentItems.findIndex(
      basketItem => basketItem.type === type && basketItem.item.id === item.id
    );

    if (existingIndex >= 0) {
      // Item already exists, increase quantity
      const updatedItems = [...currentItems];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + quantity
      };
      this.basketItems.set(updatedItems);
    } else {
      // Add new item
      this.basketItems.set([
        ...currentItems,
        {
          type,
          item,
          quantity,
          addedAt: new Date()
        }
      ]);
    }

    this.saveToStorage();
  }

  // Remove item from basket
  removeItem(type: 'product' | 'service', itemId: number) {
    const updatedItems = this.basketItems().filter(
      basketItem => !(basketItem.type === type && basketItem.item.id === itemId)
    );
    this.basketItems.set(updatedItems);
    this.saveToStorage();
  }

  // Update item quantity
  updateQuantity(type: 'product' | 'service', itemId: number, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(type, itemId);
      return;
    }

    const currentItems = this.basketItems();
    const itemIndex = currentItems.findIndex(
      basketItem => basketItem.type === type && basketItem.item.id === itemId
    );

    if (itemIndex >= 0) {
      const updatedItems = [...currentItems];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity
      };
      this.basketItems.set(updatedItems);
      this.saveToStorage();
    }
  }

  // Clear entire basket
  clearBasket() {
    this.basketItems.set([]);
    this.saveToStorage();
  }

  // Check if item is in basket
  isInBasket(type: 'product' | 'service', itemId: number): boolean {
    return this.basketItems().some(
      basketItem => basketItem.type === type && basketItem.item.id === itemId
    );
  }

  // Get item quantity
  getItemQuantity(type: 'product' | 'service', itemId: number): number {
    const item = this.basketItems().find(
      basketItem => basketItem.type === type && basketItem.item.id === itemId
    );
    return item ? item.quantity : 0;
  }

  // Save to localStorage
  private saveToStorage() {
    try {
      const data = this.basketItems().map(item => ({
        type: item.type,
        item: item.item,
        quantity: item.quantity,
        addedAt: item.addedAt.toISOString()
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save basket to localStorage:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const items: BasketItem[] = data.map((item: any) => ({
          type: item.type,
          item: item.item,
          quantity: item.quantity,
          addedAt: new Date(item.addedAt)
        }));
        this.basketItems.set(items);
      }
    } catch (error) {
      console.error('Failed to load basket from localStorage:', error);
      this.basketItems.set([]);
    }
  }
}
