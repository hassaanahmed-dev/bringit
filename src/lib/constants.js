export const DELIVERY_ZONES = [
  { id: 'c-block', name: 'C-Block', fee: 20 },
  { id: 'b-block', name: 'B-Block', fee: 30 },
  { id: 'd-block', name: 'D-Block', fee: 30 },
  { id: 'ground', name: 'Ground', fee: 30 },
  { id: 'a-block', name: 'A-Block', fee: 50 },
];

export const PICKUP_SHOPS = ['Cafe Red', 'Cafe Blue', 'Donut Shop', 'Stationery Shop'];

export const ORDER_STATUS = Object.freeze({
  OPEN: 'Open',
  ACCEPTED: 'Accepted',
  PAID_AT_SHOP: 'Paid at Shop',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
});

export const ORDER_LIFECYCLE = [
  'Placed',
  ORDER_STATUS.OPEN,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PAID_AT_SHOP,
  ORDER_STATUS.DELIVERED,
];

export const FAST_EMAIL_SUFFIX = '@isb.nu.edu.pk';

export const RATING_MAX = 5;
export const PAGE_SIZE = 20;
export const MIN_DESCRIPTION_LEN = 10;

export const TIERS = Object.freeze([
  { name: 'Newcomer', min: 0, color: '#9aa0b4', short: 'NEW' },
  { name: 'Regular', min: 5, color: '#3ddc84', short: 'REG' },
  { name: 'Trusted', min: 15, color: '#38b6ff', short: 'TRU' },
  { name: 'Pro', min: 30, color: '#b06cff', short: 'PRO' },
  { name: 'Legend', min: 60, color: '#ffc857', short: 'LGD' },
]);

export const SHOP_COLORS = {
  'Cafe Red': '#ff2e63',
  'Cafe Blue': '#38b6ff',
  'Donut Shop': '#ffb347',
  'Stationery Shop': '#3ddc84',
};

export const SHOP_ICONS = {
  'Cafe Red': 'CT',
  'Cafe Blue': 'CB',
  'Donut Shop': 'DN',
  'Stationery Shop': 'ST',
};
