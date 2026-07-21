export type LocalRecipe = {
  title: string
  ingredients: string[]
  instructions: string
}

/** Small built-in recipe set so "what can I cook" works with zero API keys configured. */
export const RECIPE_LIBRARY: LocalRecipe[] = [
  { title: 'Grilled Cheese Sandwich', ingredients: ['bread', 'cheese', 'butter'], instructions: 'Butter the bread, add cheese, grill both sides until golden and melted.' },
  { title: 'Omelette', ingredients: ['eggs', 'cheese', 'milk'], instructions: 'Whisk eggs with a splash of milk, cook in a pan, fold in cheese.' },
  { title: 'Tomato Toast', ingredients: ['bread', 'tomato', 'butter'], instructions: 'Toast bread, spread butter, top with sliced tomato and a pinch of salt.' },
  { title: 'Fried Rice', ingredients: ['rice', 'eggs', 'carrot', 'onion'], instructions: 'Stir-fry cooked rice with scrambled egg and chopped vegetables.' },
  { title: 'Chicken Stir Fry', ingredients: ['chicken', 'carrot', 'onion', 'rice'], instructions: 'Sauté chicken pieces, add vegetables, serve over rice.' },
  { title: 'Pasta Aglio e Olio', ingredients: ['pasta', 'garlic', 'onion'], instructions: 'Cook pasta, sauté garlic and onion in olive oil, toss together.' },
  { title: 'Banana Smoothie', ingredients: ['banana', 'milk', 'yogurt'], instructions: 'Blend banana, milk, and yogurt until smooth.' },
  { title: 'Vegetable Soup', ingredients: ['carrot', 'onion', 'potato', 'tomato'], instructions: 'Simmer chopped vegetables in broth until tender.' },
  { title: 'Chicken Salad', ingredients: ['chicken', 'lettuce', 'tomato'], instructions: 'Toss cooked chicken with greens and tomato, dress to taste.' },
  { title: 'Cheese Quesadilla', ingredients: ['cheese', 'bread'], instructions: 'Melt cheese between bread or a tortilla in a hot pan until crisp.' },
  { title: 'Mashed Potatoes', ingredients: ['potato', 'butter', 'milk'], instructions: 'Boil potatoes until soft, mash with butter and milk.' },
  { title: 'Fruit & Yogurt Bowl', ingredients: ['yogurt', 'banana', 'apple'], instructions: 'Top yogurt with sliced fruit.' },
  { title: 'Garlic Butter Pasta', ingredients: ['pasta', 'butter', 'garlic', 'cheese'], instructions: 'Toss cooked pasta with melted garlic butter and grated cheese.' },
  { title: 'Fried Egg Sandwich', ingredients: ['bread', 'eggs', 'butter'], instructions: 'Fry an egg, butter the bread, assemble the sandwich.' },
  { title: 'Shrimp Stir Fry', ingredients: ['fish', 'rice', 'carrot', 'onion'], instructions: 'Stir-fry shrimp or fish with vegetables, serve over rice.' },
  { title: 'Roasted Vegetables', ingredients: ['potato', 'carrot', 'onion', 'tomato'], instructions: 'Toss chopped vegetables in oil, roast until tender.' },
  { title: 'Chicken Noodle Soup', ingredients: ['chicken', 'pasta', 'carrot', 'onion'], instructions: 'Simmer chicken and vegetables in broth, add noodles until cooked.' },
  { title: 'Egg Fried Toast', ingredients: ['bread', 'eggs', 'milk'], instructions: 'Dip bread in whisked egg and milk, pan-fry until golden.' },
  { title: 'Simple Tomato Pasta', ingredients: ['pasta', 'tomato', 'garlic', 'cheese'], instructions: 'Simmer chopped tomato and garlic into a sauce, toss with pasta and cheese.' },
  { title: 'Chicken & Rice Bowl', ingredients: ['chicken', 'rice', 'carrot'], instructions: 'Serve cooked chicken and steamed carrots over rice.' },
]
