interface TileInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  properties: Record<string, unknown>;
}

export interface ThemeData {
  name: string;
  menu: {
    name: string;
    sections: {
      name: string;
      sortOrder: number;
      items: {
        name: string;
        description: string;
        price: string;
        imageUrl: string;
        calories: number;
        isAvailable: boolean;
      }[];
    }[];
  };
  slides: {
    name: string;
    dimensions: { width: number; height: number };
    orientation: 'landscape' | 'portrait';
    backgroundColor: string;
    backgroundImageUrl: string;
    elements: TileInstance[];
  }[];
  screens: {
    name: string;
    orientation: 'landscape' | 'portrait';
    rotationSettings: {
      algorithm: 'loop' | 'random' | 'custom';
      transition: 'fade' | 'slide' | 'none';
      rotationMs: number;
    };
  }[];
}

export const THEMES: ThemeData[] = [
  {
    name: 'Classic Burger Joint',
    menu: {
      name: 'Burger Menu',
      sections: [
        {
          name: 'Signature Burgers',
          sortOrder: 1,
          items: [
            { name: 'The Classic', description: 'Double patty, american cheese, lettuce, tomato, house sauce', price: '12.99', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', calories: 850, isAvailable: true },
            { name: 'Bacon Deluxe', description: 'Smoked bacon, cheddar, onion rings, bbq sauce', price: '14.99', imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80', calories: 950, isAvailable: true },
            { name: 'Mushroom Swiss', description: 'Sautéed mushrooms, swiss cheese, garlic mayo', price: '13.99', imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', calories: 880, isAvailable: true }
          ]
        },
        {
          name: 'Sides',
          sortOrder: 2,
          items: [
            { name: 'Crispy Fries', description: 'Sea salt, ketchup', price: '4.99', imageUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80', calories: 380, isAvailable: true },
            { name: 'Onion Rings', description: 'Beer battered, ranch dip', price: '5.99', imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&q=80', calories: 450, isAvailable: true }
          ]
        },
        {
          name: 'Shakes',
          sortOrder: 3,
          items: [
            { name: 'Vanilla Bean', description: 'Real vanilla, whipped cream', price: '6.99', imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80', calories: 550, isAvailable: true },
            { name: 'Chocolate Fudge', description: 'Double chocolate, cherry on top', price: '6.99', imageUrl: 'https://images.unsplash.com/photo-1579954115563-e72bf1381629?auto=format&fit=crop&w=800&q=80', calories: 580, isAvailable: true }
          ]
        }
      ]
    },
    slides: [
      { name: 'Burger Promo 1', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#1a1a1a', backgroundImageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Burger Promo 2', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#1a1a1a', backgroundImageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Combo Deal', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#1a1a1a', backgroundImageUrl: 'https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Fries Feature', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#1a1a1a', backgroundImageUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Shake Special', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#1a1a1a', backgroundImageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Now Hiring', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#000000', backgroundImageUrl: '', elements: [] }
    ],
    screens: [
      { name: 'Burger Main Board', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'fade', rotationMs: 10000 } },
      { name: 'Burger Side Screen', orientation: 'landscape', rotationSettings: { algorithm: 'random', transition: 'slide', rotationMs: 15000 } },
      { name: 'Burger Pickup', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'none', rotationMs: 20000 } }
    ]
  },
  {
    name: 'Cocktail Lounge',
    menu: {
      name: 'Lounge Menu',
      sections: [
        {
          name: 'Signatures',
          sortOrder: 1,
          items: [
            { name: 'Old Fashioned', description: 'Bourbon, bitters, sugar, orange peel', price: '14.00', imageUrl: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=800&q=80', calories: 150, isAvailable: true },
            { name: 'Martini', description: 'Gin, vermouth, olive', price: '15.00', imageUrl: 'https://images.unsplash.com/photo-1575023782549-62ca0d244b39?auto=format&fit=crop&w=800&q=80', calories: 180, isAvailable: true }
          ]
        },
        {
          name: 'Wine',
          sortOrder: 2,
          items: [
            { name: 'Cabernet Sauvignon', description: 'Napa Valley, Glass', price: '16.00', imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80', calories: 125, isAvailable: true },
            { name: 'Chardonnay', description: 'Sonoma Coast, Glass', price: '14.00', imageUrl: 'https://images.unsplash.com/photo-1572569973683-1c3906eb4c00?auto=format&fit=crop&w=800&q=80', calories: 120, isAvailable: true }
          ]
        },
        {
          name: 'Small Plates',
          sortOrder: 3,
          items: [
            { name: 'Charcuterie Board', description: 'Cured meats, cheeses, figs', price: '24.00', imageUrl: 'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=800&q=80', calories: 600, isAvailable: true },
            { name: 'Truffle Fries', description: 'Parmesan, truffle oil', price: '12.00', imageUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80', calories: 450, isAvailable: true }
          ]
        }
      ]
    },
    slides: [
      { name: 'Cocktail Feature 1', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#2d1b2e', backgroundImageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Cocktail Feature 2', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#2d1b2e', backgroundImageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Happy Hour', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#2d1b2e', backgroundImageUrl: 'https://images.unsplash.com/photo-1536935338725-8f319ac6b6d1?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Wine List Intro', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#2d1b2e', backgroundImageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Live Music', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#000000', backgroundImageUrl: 'https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Private Events', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#2d1b2e', backgroundImageUrl: '', elements: [] }
    ],
    screens: [
      { name: 'Bar Main', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'fade', rotationMs: 12000 } },
      { name: 'Lounge Area', orientation: 'landscape', rotationSettings: { algorithm: 'random', transition: 'fade', rotationMs: 30000 } },
      { name: 'Entry Display', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'none', rotationMs: 15000 } }
    ]
  },
  {
    name: 'Morning Cafe',
    menu: {
      name: 'Cafe Menu',
      sections: [
        {
          name: 'Espresso Bar',
          sortOrder: 1,
          items: [
            { name: 'Latte', description: 'Espresso, steamed milk', price: '4.50', imageUrl: 'https://images.unsplash.com/photo-1570968992194-79569335af9c?auto=format&fit=crop&w=800&q=80', calories: 180, isAvailable: true },
            { name: 'Cappuccino', description: 'Espresso, foam', price: '4.50', imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=800&q=80', calories: 150, isAvailable: true }
          ]
        },
        {
          name: 'Breakfast',
          sortOrder: 2,
          items: [
            { name: 'Avocado Toast', description: 'Sourdough, avocado, chili flake', price: '9.50', imageUrl: 'https://images.unsplash.com/photo-1588137372308-15f75323ca8d?auto=format&fit=crop&w=800&q=80', calories: 420, isAvailable: true },
            { name: 'Croissant', description: 'Butter croissant, fresh baked', price: '3.75', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80', calories: 280, isAvailable: true }
          ]
        },
        {
          name: 'Smoothies',
          sortOrder: 3,
          items: [
            { name: 'Green Glow', description: 'Spinach, apple, ginger', price: '8.50', imageUrl: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=800&q=80', calories: 220, isAvailable: true }
          ]
        }
      ]
    },
    slides: [
      { name: 'Coffee Close-up', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#f5f5f5', backgroundImageUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Pastry Showcase', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#f5f5f5', backgroundImageUrl: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Breakfast Combo', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#f5f5f5', backgroundImageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Seasonal Latte', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#f5f5f5', backgroundImageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Wifi Password', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#ffffff', backgroundImageUrl: '', elements: [] },
      { name: 'Community Board', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#ffffff', backgroundImageUrl: '', elements: [] }
    ],
    screens: [
      { name: 'Cafe Menu Board', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'fade', rotationMs: 30000 } },
      { name: 'Register Display', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'slide', rotationMs: 10000 } },
      { name: 'Street Facing', orientation: 'landscape', rotationSettings: { algorithm: 'random', transition: 'fade', rotationMs: 8000 } }
    ]
  },
  {
    name: 'Italian Bistro',
    menu: {
      name: 'Bistro Menu',
      sections: [
        {
          name: 'Primi',
          sortOrder: 1,
          items: [
            { name: 'Bruschetta', description: 'Tomatoes, basil, balsamic', price: '9.00', imageUrl: 'https://images.unsplash.com/photo-1572695157363-bc330b7228d8?auto=format&fit=crop&w=800&q=80', calories: 250, isAvailable: true },
            { name: 'Calamari', description: 'Fried squid, marinara', price: '13.00', imageUrl: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=800&q=80', calories: 400, isAvailable: true }
          ]
        },
        {
          name: 'Secondi',
          sortOrder: 2,
          items: [
            { name: 'Pasta Carbonara', description: 'Pancetta, egg, pepper', price: '18.00', imageUrl: 'https://images.unsplash.com/photo-1612874742237-98280d20741e?auto=format&fit=crop&w=800&q=80', calories: 850, isAvailable: true },
            { name: 'Margherita Pizza', description: 'Mozzarella, tomato, basil', price: '16.00', imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', calories: 700, isAvailable: true }
          ]
        },
        {
          name: 'Dolce',
          sortOrder: 3,
          items: [
            { name: 'Tiramisu', description: 'Espresso soaked ladyfingers', price: '9.00', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80', calories: 450, isAvailable: true }
          ]
        }
      ]
    },
    slides: [
      { name: 'Pasta Feature', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#8b0000', backgroundImageUrl: 'https://images.unsplash.com/photo-1612874742237-98280d20741e?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Pizza Feature', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#8b0000', backgroundImageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Wine Pairings', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#8b0000', backgroundImageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Chef Special', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#8b0000', backgroundImageUrl: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Dessert Promo', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#8b0000', backgroundImageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Welcome', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#2c2c2c', backgroundImageUrl: '', elements: [] }
    ],
    screens: [
      { name: 'Dining Room', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'fade', rotationMs: 20000 } },
      { name: 'Bar Screen', orientation: 'landscape', rotationSettings: { algorithm: 'random', transition: 'fade', rotationMs: 15000 } },
      { name: 'Host Stand', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'none', rotationMs: 30000 } }
    ]
  },
  {
    name: 'Mexican Cantina',
    menu: {
      name: 'Cantina Menu',
      sections: [
        {
          name: 'Antojitos',
          sortOrder: 1,
          items: [
            { name: 'Guacamole', description: 'Fresh avocado, lime, cilantro', price: '10.00', imageUrl: 'https://images.unsplash.com/photo-1600336153113-d62131726eec?auto=format&fit=crop&w=800&q=80', calories: 300, isAvailable: true },
            { name: 'Queso Fundido', description: 'Melted cheese, chorizo', price: '11.00', imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', calories: 450, isAvailable: true }
          ]
        },
        {
          name: 'Tacos',
          sortOrder: 2,
          items: [
            { name: 'Carne Asada', description: 'Grilled steak, onions, cilantro', price: '4.50', imageUrl: 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=800&q=80', calories: 250, isAvailable: true },
            { name: 'Al Pastor', description: 'Marinated pork, pineapple', price: '4.00', imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=800&q=80', calories: 280, isAvailable: true }
          ]
        },
        {
          name: 'Platos',
          sortOrder: 3,
          items: [
            { name: 'Enchiladas', description: 'Chicken, mole sauce', price: '16.00', imageUrl: 'https://images.unsplash.com/photo-1534352956036-c01ac18bd985?auto=format&fit=crop&w=800&q=80', calories: 600, isAvailable: true }
          ]
        }
      ]
    },
    slides: [
      { name: 'Taco Tuesday', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#e65100', backgroundImageUrl: 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Margarita Special', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#e65100', backgroundImageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Guac Promo', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#e65100', backgroundImageUrl: 'https://images.unsplash.com/photo-1600336153113-d62131726eec?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Fiesta Platter', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#e65100', backgroundImageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Live Mariachi', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#333333', backgroundImageUrl: '', elements: [] },
      { name: 'Happy Hour Menu', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#e65100', backgroundImageUrl: '', elements: [] }
    ],
    screens: [
      { name: 'Cantina Main', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'fade', rotationMs: 15000 } },
      { name: 'Patio Screen', orientation: 'landscape', rotationSettings: { algorithm: 'random', transition: 'slide', rotationMs: 20000 } },
      { name: 'Bar TVs', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'none', rotationMs: 30000 } }
    ]
  },
  {
    name: 'Sushi Bar',
    menu: {
      name: 'Sushi Menu',
      sections: [
        {
          name: 'Nigiri',
          sortOrder: 1,
          items: [
            { name: 'Salmon', description: 'Fresh atlantic salmon', price: '6.00', imageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80', calories: 120, isAvailable: true },
            { name: 'Tuna', description: 'Maguro', price: '7.00', imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd43ea?auto=format&fit=crop&w=800&q=80', calories: 110, isAvailable: true }
          ]
        },
        {
          name: 'Rolls',
          sortOrder: 2,
          items: [
            { name: 'Dragon Roll', description: 'Eel, cucumber, avocado', price: '14.00', imageUrl: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80', calories: 450, isAvailable: true },
            { name: 'California Roll', description: 'Crab, avocado, cucumber', price: '8.00', imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80', calories: 350, isAvailable: true }
          ]
        },
        {
          name: 'Kitchen',
          sortOrder: 3,
          items: [
            { name: 'Miso Soup', description: 'Tofu, seaweed, scallion', price: '4.00', imageUrl: 'https://images.unsplash.com/photo-1604579278540-b8754e0a4ef4?auto=format&fit=crop&w=800&q=80', calories: 80, isAvailable: true },
            { name: 'Edamame', description: 'Steamed soy beans, sea salt', price: '5.00', imageUrl: 'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?auto=format&fit=crop&w=800&q=80', calories: 150, isAvailable: true }
          ]
        }
      ]
    },
    slides: [
      { name: 'Omakase Special', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#000000', backgroundImageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Roll Combo', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#000000', backgroundImageUrl: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Sake Flight', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#000000', backgroundImageUrl: 'https://images.unsplash.com/photo-1582236894042-e0d04690d571?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Fresh Catch', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#000000', backgroundImageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Lunch Special', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#1a1a1a', backgroundImageUrl: '', elements: [] },
      { name: 'All You Can Eat', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#1a1a1a', backgroundImageUrl: '', elements: [] }
    ],
    screens: [
      { name: 'Sushi Counter', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'fade', rotationMs: 15000 } },
      { name: 'Dining Hall', orientation: 'landscape', rotationSettings: { algorithm: 'random', transition: 'slide', rotationMs: 20000 } },
      { name: 'Takeout', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'none', rotationMs: 25000 } }
    ]
  },
  {
    name: 'BBQ Smokehouse',
    menu: {
      name: 'Smokehouse Menu',
      sections: [
        {
          name: 'Meats',
          sortOrder: 1,
          items: [
            { name: 'Brisket', description: 'Texas style, slow smoked', price: '22.00', imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=80', calories: 800, isAvailable: true },
            { name: 'Pulled Pork', description: 'Carolina style', price: '18.00', imageUrl: 'https://images.unsplash.com/photo-1628268909376-e8c44bb3153f?auto=format&fit=crop&w=800&q=80', calories: 700, isAvailable: true },
            { name: 'Ribs', description: 'St. Louis cut, half rack', price: '24.00', imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', calories: 950, isAvailable: true }
          ]
        },
        {
          name: 'Sides',
          sortOrder: 2,
          items: [
            { name: 'Mac & Cheese', description: 'Three cheese blend', price: '5.00', imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80', calories: 400, isAvailable: true },
            { name: 'Coleslaw', description: 'Creamy slaw', price: '4.00', imageUrl: 'https://images.unsplash.com/photo-1582283925769-6311681a5342?auto=format&fit=crop&w=800&q=80', calories: 150, isAvailable: true }
          ]
        },
        {
          name: 'Desserts',
          sortOrder: 3,
          items: [
            { name: 'Banana Pudding', description: 'Nilla wafers, fresh bananas', price: '6.00', imageUrl: 'https://images.unsplash.com/photo-1589112702737-18499298e3cb?auto=format&fit=crop&w=800&q=80', calories: 450, isAvailable: true }
          ]
        }
      ]
    },
    slides: [
      { name: 'Brisket Feature', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#3e2723', backgroundImageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Ribs Feature', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#3e2723', backgroundImageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Family Platter', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#3e2723', backgroundImageUrl: 'https://images.unsplash.com/photo-1529193591176-1da7902f1293?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Sides Promo', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#3e2723', backgroundImageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1920&q=80', elements: [] },
      { name: 'Catering Info', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#2d1b15', backgroundImageUrl: '', elements: [] },
      { name: 'Weekly Specials', dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#2d1b15', backgroundImageUrl: '', elements: [] }
    ],
    screens: [
      { name: 'Main Menu Board', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'fade', rotationMs: 15000 } },
      { name: 'Specials Board', orientation: 'landscape', rotationSettings: { algorithm: 'random', transition: 'fade', rotationMs: 20000 } },
      { name: 'Pickup Counter', orientation: 'landscape', rotationSettings: { algorithm: 'loop', transition: 'none', rotationMs: 30000 } }
    ]
  }
];
