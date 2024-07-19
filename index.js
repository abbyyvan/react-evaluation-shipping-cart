const API = (() => {
  const baseURL = "http://localhost:3000";

  const fetchData = (path, method = 'GET', payload = null) => {
    const options = {
      method,
      headers: payload ? { 'Content-Type': 'application/json' } : {},
      body: payload ? JSON.stringify(payload) : null,
    };
    return fetch(`${baseURL}/${path}`, options).then(res => res.json());
  };

  return {
    getInventory: () => fetchData('inventory'),
    getCart: () => fetchData('cart'),
    addToCart: (item) => {
      return fetchData('cart').then(cart => {
        const existingItem = cart.find(cartItem => cartItem.content === item.content);
        if (existingItem) {
          const updatedQuantity = existingItem.quantity + item.quantity;
          return fetchData(`cart/${existingItem.id}`, 'PATCH', { quantity: updatedQuantity });
        } else {
          return fetchData('cart', 'POST', item);
        }
      });
    },
    updateCart: (id, quantity) => fetchData(`cart/${id}`, 'PATCH', { quantity }),
    deleteFromCart: id => fetchData(`cart/${id}`, 'DELETE'),
    checkout: () => fetchData('cart').then(cart => {
      return Promise.all(cart.map(item => fetchData(`cart/${item.id}`, 'DELETE')));
    }),
  };
})();



const Model = (() => {
  class State {
    constructor(updateCallback) {
      this.inventory = [];
      this.cart = [];
      this.updateCallback = updateCallback;
    }

    setInventory(data) {
      this.inventory = data;
      this.updateCallback();
    }

    setCart(data) {
      this.cart = data;
      this.updateCallback();
    }

    addToCart(item) {
      const existing = this.cart.find(it => it.id === item.id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        this.cart.push(item);
      }
      this.updateCallback();
    }

    removeFromCart(itemId) {
      this.cart = this.cart.filter(item => item.id !== itemId);
      this.updateCallback();
    }

    clearCart() {
      this.cart = [];
      this.updateCallback();
    }
  }

  return {
    State,
    ...API
  };
})();

const View = (() => {
  const elements = {
    inventoryList: document.querySelector('.inventory-container ul'),
    cartList: document.querySelector('.cart-container .cart-wrapper ul'),
    checkoutBtn: document.querySelector('.checkout-btn')
  };

  const renderInventory = (inventory) => {
    elements.inventoryList.innerHTML = ''; 
    inventory.forEach(item => {
      const li = document.createElement('li');
      item.quantity = item.quantity || 0;  
      li.innerHTML = `
        ${item.content}  
        <button class='minus'>-</button>
        <span class='quantity'>${item.quantity}</span>
        <button class='plus'>+</button>
        <button class='add'>add to cart</button>
      `;
      elements.inventoryList.appendChild(li);

      const quantitySpan = li.querySelector('.quantity');

      li.querySelector('.minus').addEventListener('click', () => {
        if (item.quantity > 0) {
          item.quantity -= 1;
          quantitySpan.textContent = item.quantity;
        }
      });

      li.querySelector('.plus').addEventListener('click', () => {
        item.quantity += 1;
        quantitySpan.textContent = item.quantity;
      });

      li.querySelector('.add').addEventListener('click', () => {
        if (item.quantity > 0) {
          Controller.addToCart({ ...item, quantity: item.quantity });
        }
      });
    });
  };

  const renderCart = (cart) => {
    elements.cartList.innerHTML = '';
    cart.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.content} x ${item.quantity} `;
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'delete';
      deleteBtn.setAttribute("class",'delete')
      deleteBtn.onclick = () => Controller.removeFromCart(item.id);
      li.appendChild(deleteBtn);
      elements.cartList.appendChild(li);
    });
  };

  elements.checkoutBtn.onclick = () => Controller.checkout();

  return {
    renderInventory,
    renderCart
  };
})();

const Controller = ((model, view) => {
  const state = new model.State(() => {
    view.renderInventory(state.inventory);
    view.renderCart(state.cart);
  });

  const init = () => {
    model.getInventory().then(data => state.setInventory(data));
    model.getCart().then(data => state.setCart(data));
  };

  const addToCart = (item) => {
    model.getCart().then(cart => {
      const existingItem = cart.find(cartItem => cartItem.content === item.content);
      if (existingItem) {
        const updatedQuantity = existingItem.quantity + item.quantity;
        model.updateCart(existingItem.id, updatedQuantity).then(() => {
          model.getCart().then(data => state.setCart(data));
        });
      } else {
        model.addToCart(item).then(() => {
          model.getCart().then(data => state.setCart(data));
        });
      }
    });
  };
  

  const removeFromCart = (itemId) => {
    model.deleteFromCart(itemId).then(() => state.removeFromCart(itemId));
  };

  const checkout = () => {
    model.checkout().then(() => {
      state.clearCart();
      model.getCart().then(data => state.setCart(data));
    });
  };

  return {
    init,
    addToCart,
    removeFromCart,
    checkout
  };
})(Model, View);

Controller.init();
