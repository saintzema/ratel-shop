export const TEMU_CATEGORIES = [
  'All', 'Trending', 'Best-Selling', 'Solar', 'Streaming Kits', 'Phones', 'Gaming', 
  'Computers', 'Fashion', 'Cars', 'Grocery', 'Home Office', 'EVs', 'Industrial', 
  'Health', 'Automotive', 'Bags', 'Women', 'Jewelry', 'Household', 'Toy', 
  'Crafts', 'Men', 'Sports', 'Kids', 'Beauty', 'Office', 'Baby', 'Garden', 
  'Pets', 'Musical', 'Appliances', 'Food', 'Books'
];

export interface SubCategory {
  label: string;
  image: string;
  href: string;
}

export interface CategoryCard {
  title: string;
  link: string;
  linkText: string;
  subs: SubCategory[];
}

export const CATEGORY_CARDS_ROW_1: CategoryCard[] = [
  {
    title: "Top in Phones",
    link: "/search?category=phones",
    linkText: "See all phones",
    subs: [
      { label: "Phones", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200&h=200&fit=crop", href: "/category/phones" },
      { label: "iPhones", image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=200&h=200&fit=crop", href: "/search?category=phones&q=iphone" },
      { label: "Tablets", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop", href: "/category/tablets" },
      { label: "Accessories", image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=200&h=200&fit=crop", href: "/search?category=phones&q=accessories" },
    ],
  },
  {
    title: "Level Up Your Gaming",
    link: "/search?category=gaming",
    linkText: "Shop gaming",
    subs: [
      { label: "PlayStation", image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=200&h=200&fit=crop", href: "/search?category=gaming&q=playstation" },
      { label: "Smart TVs", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&h=200&fit=crop", href: "/search?category=electronics&q=tv" },
      { label: "Headsets", image: "https://images.unsplash.com/photo-1599669454699-248893623440?w=200&h=200&fit=crop", href: "/search?category=gaming&q=headset" },
      { label: "Controllers", image: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=200&h=200&fit=crop", href: "/search?category=gaming&q=controller" },
    ],
  },
  {
    title: "Power Your Home",
    link: "/search?category=energy",
    linkText: "See all energy",
    subs: [
      { label: "Solar Panels", image: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=200&h=200&fit=crop", href: "/search?category=energy&q=solar" },
      { label: "Inverters", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=200&h=200&fit=crop", href: "/search?category=energy&q=inverter" },
      { label: "Generators", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop", href: "/search?category=energy&q=generator" },
      { label: "Electric Cars", image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=200&h=200&fit=crop", href: "/search?category=cars&q=electric" },
    ],
  },
  {
    title: "Fashion & Style",
    link: "/search?category=fashion",
    linkText: "Explore fashion",
    subs: [
      { label: "Designer Bags", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&h=200&fit=crop", href: "/search?category=fashion&q=bag" },
      { label: "Sneakers", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop", href: "/search?category=fashion&q=sneakers" },
      { label: "Watches", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop", href: "/search?category=fashion&q=watches" },
      { label: "Sunglasses", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=200&h=200&fit=crop", href: "/search?category=fashion&q=sunglasses" },
    ],
  },
];

export const CATEGORY_CARDS_ROW_2: CategoryCard[] = [
  {
    title: "Beauty Essentials",
    link: "/search?category=beauty",
    linkText: "Shop beauty",
    subs: [
      { label: "Skincare", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop", href: "/search?category=beauty&q=skincare" },
      { label: "Makeup", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop", href: "/search?category=beauty&q=makeup" },
      { label: "Fragrance", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop", href: "/search?category=beauty&q=fragrance" },
      { label: "Hair Care", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=200&h=200&fit=crop", href: "/search?category=beauty&q=hair" },
    ],
  },
  {
    title: "Home & Kitchen",
    link: "/search?category=home",
    linkText: "Discover home",
    subs: [
      { label: "Appliances", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&h=200&fit=crop", href: "/search?category=home&q=appliance" },
      { label: "Cookware", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop", href: "/search?category=home&q=cookware" },
      { label: "Furniture", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop", href: "/search?category=home&q=furniture" },
      { label: "Lighting", image: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=200&h=200&fit=crop", href: "/search?category=home&q=lighting" },
    ],
  },
  {
    title: "Computers & Office",
    link: "/search?category=computers",
    linkText: "See all computers",
    subs: [
      { label: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&h=200&fit=crop", href: "/search?category=computers&q=laptop" },
      { label: "Desktops", image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=200&h=200&fit=crop", href: "/search?category=computers&q=desktop" },
      { label: "Monitors", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200&h=200&fit=crop", href: "/search?category=computers&q=monitor" },
      { label: "Printers", image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=200&h=200&fit=crop", href: "/search?category=computers&q=printer" },
    ],
  },
  {
    title: "Automotive",
    link: "/search?category=cars",
    linkText: "Shop automotive",
    subs: [
      { label: "Car Parts", image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop", href: "/search?category=cars&q=parts" },
      { label: "Dash Cams", image: "https://images.unsplash.com/photo-1544654803-b69140b285a1?w=200&h=200&fit=crop", href: "/search?category=cars&q=dash+cam" },
      { label: "Accessories", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=200&fit=crop", href: "/search?category=cars&q=accessories" },
      { label: "Tires", image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200&h=200&fit=crop", href: "/search?category=cars&q=tires" },
    ],
  },
];

export const CATEGORY_CARDS_ROW_3: CategoryCard[] = [
  {
    title: "Gym & Fitness",
    link: "/search?category=fitness",
    linkText: "Shop fitness",
    subs: [
      { label: "Dumbbells", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop", href: "/search?category=fitness&q=dumbbell" },
      { label: "Yoga Mats", image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200&h=200&fit=crop", href: "/search?category=fitness&q=yoga" },
      { label: "Treadmills", image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=200&h=200&fit=crop", href: "/search?category=fitness&q=treadmill" },
      { label: "Bands", image: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=200&h=200&fit=crop", href: "/search?category=fitness&q=resistance" },
    ],
  },
  {
    title: "Office Furniture",
    link: "/search?category=office",
    linkText: "Shop office",
    subs: [
      { label: "Chairs", image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=200&h=200&fit=crop", href: "/search?category=office&q=chair" },
      { label: "Desks", image: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=200&h=200&fit=crop", href: "/search?category=office&q=desk" },
      { label: "Monitor Arms", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200&h=200&fit=crop", href: "/search?category=office&q=monitor" },
      { label: "Organizers", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", href: "/search?category=office&q=organizer" },
    ],
  },
  {
    title: "Groceries & Market",
    link: "/search?category=grocery",
    linkText: "Shop groceries",
    subs: [
      { label: "Rice & Grains", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop", href: "/search?category=grocery&q=rice" },
      { label: "Cooking Oil", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&h=200&fit=crop", href: "/search?category=grocery&q=oil" },
      { label: "Noodles", image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=200&h=200&fit=crop", href: "/search?category=grocery&q=indomie" },
      { label: "Beverages", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop", href: "/search?category=grocery&q=milo" },
    ],
  },
  {
    title: "Baby Products",
    link: "/search?category=baby",
    linkText: "Shop baby",
    subs: [
      { label: "Diapers", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop", href: "/search?category=baby&q=diapers" },
      { label: "Strollers", image: "https://images.unsplash.com/photo-1566004100477-7b1e3aca3593?w=200&h=200&fit=crop", href: "/search?category=baby&q=stroller" },
      { label: "Car Seats", image: "https://images.unsplash.com/photo-1594495894542-a46cc73202eb?w=200&h=200&fit=crop", href: "/search?category=baby&q=car+seat" },
      { label: "Feeding", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop", href: "/search?category=baby&q=feeding" },
    ],
  },
];

export const DEFAULT_AD_SLOTS = [
    { id: 'ad1', title: 'Flash Sales', img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400', link: '/deals' },
    { id: 'ad2', title: 'New Arrivals', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', link: '/category/new' },
    { id: 'ad3', title: 'Best Sellers', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', link: '/search?sort=popular' },
    { id: 'ad4', title: 'Price Checker', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400', link: '#' }
];
