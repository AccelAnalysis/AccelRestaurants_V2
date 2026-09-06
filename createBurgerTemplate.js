const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to add your service account key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project.firebaseio.com' // Replace with your project URL
});

const db = admin.firestore();

// Template data
const templateData = {
  "id": "template-classic-burger-joint-menu-001",
  "name": "Classic Burger Joint Menu",
  "description": "Authentic American burger joint menu with classic burgers, sides, and drinks",
  "category": "Burgers",
  "tags": ["burgers", "american", "classic", "fast food"],
  "thumbnailUrl": "https://placeholder.com/image.jpg",
  "type": "menu",
  "content": {
    "id": "menu-classic-burger-joint-001",
    "orgId": "org-placeholder-001",
    "name": "Classic Burger Joint Menu",
    "sections": [
      {
        "id": "section-burgers",
        "name": "Burgers",
        "sortOrder": 1,
        "items": [
          {
            "id": "burger-classic",
            "name": "Classic Cheeseburger",
            "description": "Juicy beef patty, American cheese, lettuce, tomato, and house sauce on a toasted bun.",
            "price": "$9.99",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "650 cal",
            "isAvailable": true
          },
          {
            "id": "burger-bacon",
            "name": "Bacon Cheeseburger",
            "description": "Beef patty topped with crispy bacon, cheddar cheese, lettuce, and tomato.",
            "price": "$11.49",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "720 cal",
            "isAvailable": true
          },
          {
            "id": "burger-mushroom",
            "name": "Mushroom Swiss Burger",
            "description": "Sautéed mushrooms, Swiss cheese, and garlic aioli on a toasted bun.",
            "price": "$11.99",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "700 cal",
            "isAvailable": true
          },
          {
            "id": "burger-double",
            "name": "Double Stack Burger",
            "description": "Two beef patties, double American cheese, pickles, onions, and special sauce.",
            "price": "$14.99",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "980 cal",
            "isAvailable": true
          }
        ]
      },
      {
        "id": "section-sides",
        "name": "Sides",
        "sortOrder": 2,
        "items": [
          {
            "id": "side-fries",
            "name": "French Fries",
            "description": "Golden, crispy fries lightly seasoned with sea salt.",
            "price": "$3.49",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "320 cal",
            "isAvailable": true
          },
          {
            "id": "side-onion-rings",
            "name": "Onion Rings",
            "description": "Beer-battered onion rings fried to a golden brown.",
            "price": "$4.49",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "410 cal",
            "isAvailable": true
          },
          {
            "id": "side-coleslaw",
            "name": "Coleslaw",
            "description": "Creamy house-made coleslaw with fresh cabbage and carrots.",
            "price": "$2.99",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "180 cal",
            "isAvailable": true
          }
        ]
      },
      {
        "id": "section-drinks",
        "name": "Drinks",
        "sortOrder": 3,
        "items": [
          {
            "id": "drink-soda",
            "name": "Fountain Soda",
            "description": "Choice of Coke, Diet Coke, Sprite, or Root Beer.",
            "price": "$2.49",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "150–220 cal",
            "isAvailable": true
          },
          {
            "id": "drink-shake",
            "name": "Milkshake",
            "description": "Hand-spun vanilla, chocolate, or strawberry milkshake.",
            "price": "$4.99",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "520 cal",
            "isAvailable": true
          }
        ]
      },
      {
        "id": "section-combos",
        "name": "Combos",
        "sortOrder": 4,
        "items": [
          {
            "id": "combo-classic",
            "name": "Classic Burger Combo",
            "description": "Classic Cheeseburger served with fries and a fountain soda.",
            "price": "$13.99",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "1,050 cal",
            "isAvailable": true
          },
          {
            "id": "combo-bacon",
            "name": "Bacon Burger Combo",
            "description": "Bacon Cheeseburger with fries and a fountain soda.",
            "price": "$15.49",
            "imageUrl": "https://placeholder.com/image.jpg",
            "calories": "1,120 cal",
            "isAvailable": true
          }
        ]
      }
    ],
    "createdAt": new admin.firestore.Timestamp(1640995200, 0),
    "updatedAt": new admin.firestore.Timestamp(1640995200, 0)
  },
  "isPublic": false,
  "createdBy": "user-placeholder-001",
  "createdAt": new admin.firestore.Timestamp(1640995200, 0),
  "updatedAt": new admin.firestore.Timestamp(1640995200, 0),
  "version": 1,
  "changelog": ["Initial Classic Burger Joint Menu template"],
  "isDeleted": false
};

async function createTemplate() {
  try {
    await db.collection('templates').doc(templateData.id).set(templateData);
    console.log('Template created successfully!');
  } catch (error) {
    console.error('Error creating template:', error);
  }
}

createTemplate();
